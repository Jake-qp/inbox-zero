import { NextResponse } from "next/server";
import { env } from "@/env";
import prisma from "@/utils/prisma";
import { createScopedLogger } from "@/utils/logger";
import { OUTLOOK_LINKING_STATE_COOKIE_NAME } from "@/utils/outlook/constants";
import { withError } from "@/utils/middleware";
import { SafeError } from "@/utils/error";
import { transferPremiumDuringMerge } from "@/utils/user/merge-premium";
import { parseOAuthState } from "@/utils/oauth/state";
import { saveTokens, auth } from "@/utils/auth";
import { redis } from "@/utils/redis";

const logger = createScopedLogger("outlook/linking/callback");

export const GET = withError(async (request) => {
  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET)
    throw new SafeError("Microsoft login not enabled");

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const receivedState = searchParams.get("state");
  const storedState = request.cookies.get(
    OUTLOOK_LINKING_STATE_COOKIE_NAME,
  )?.value;

  const redirectUrl = new URL("/accounts", request.nextUrl.origin);
  const response = NextResponse.redirect(redirectUrl);

  // Check for Microsoft OAuth error FIRST (before state validation)
  if (error) {
    logger.warn("Microsoft OAuth error in callback", {
      error,
      errorDescription,
      receivedState,
    });

    // Try to decode state to get nonce for Redis caching
    let nonce: string | undefined;
    if (storedState && receivedState && storedState === receivedState) {
      try {
        const decodedState = parseOAuthState(storedState);
        nonce = decodedState.nonce;
      } catch {
        // Ignore if state decode fails
      }
    }

    // Map Microsoft error codes to user-friendly error codes
    let mappedError = "link_failed";
    if (error === "access_denied") {
      mappedError = "user_cancelled";
    } else if (
      errorDescription?.includes("AADSTS54005") ||
      errorDescription?.includes("already redeemed")
    ) {
      mappedError = "oauth_code_already_redeemed";
    }

    // Cache error in Redis for idempotency if we have a nonce
    if (nonce) {
      const oauthResultKey = `oauth-result:outlook:${nonce}`;
      await redis
        .set(
          oauthResultKey,
          JSON.stringify({
            error: mappedError,
            error_description: errorDescription || error,
          }),
          { ex: 3600 },
        )
        .catch((redisError) => {
          logger.warn("Failed to cache OAuth error in Redis", { redisError });
        });
    }

    redirectUrl.searchParams.set("error", mappedError);
    if (errorDescription) {
      redirectUrl.searchParams.set("error_description", errorDescription);
    }
    response.cookies.delete(OUTLOOK_LINKING_STATE_COOKIE_NAME);
    return NextResponse.redirect(redirectUrl, { headers: response.headers });
  }

  if (!storedState || !receivedState || storedState !== receivedState) {
    logger.warn("Invalid state during Outlook linking callback", {
      receivedState,
      hasStoredState: !!storedState,
    });
    redirectUrl.searchParams.set("error", "invalid_state");
    response.cookies.delete(OUTLOOK_LINKING_STATE_COOKIE_NAME);
    return NextResponse.redirect(redirectUrl, { headers: response.headers });
  }

  let decodedState: { userId: string; action: string; nonce: string };
  try {
    decodedState = parseOAuthState(storedState);
  } catch (error) {
    logger.error("Failed to decode state", { error });
    redirectUrl.searchParams.set("error", "invalid_state_format");
    response.cookies.delete(OUTLOOK_LINKING_STATE_COOKIE_NAME);
    return NextResponse.redirect(redirectUrl, { headers: response.headers });
  }

  response.cookies.delete(OUTLOOK_LINKING_STATE_COOKIE_NAME);

  const { userId: targetUserId, action } = decodedState;

  // Verify authenticated user matches targetUserId from state
  const session = await auth();
  const authenticatedUserId = session?.user?.id;
  if (!authenticatedUserId) {
    logger.warn("No authenticated user in Outlook linking callback");
    redirectUrl.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(redirectUrl, { headers: response.headers });
  }

  if (authenticatedUserId !== targetUserId) {
    logger.error("User mismatch in Outlook linking callback", {
      authenticatedUserId,
      targetUserId,
      action,
    });
    redirectUrl.searchParams.set("error", "user_mismatch");
    redirectUrl.searchParams.set(
      "error_description",
      "Session expired. Please try again.",
    );
    return NextResponse.redirect(redirectUrl, { headers: response.headers });
  }

  if (!code) {
    logger.warn("Missing code in Outlook linking callback");
    redirectUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(redirectUrl, { headers: response.headers });
  }

  // Daily Briefing - Idempotency guard to prevent OAuth code double-redemption
  // Protects against service worker navigationPreload double-requests (AADSTS54005)
  // Uses Redis to store the result of first request and replay it for duplicates
  const oauthResultKey = `oauth-result:outlook:${decodedState.nonce}`;

  // Check if this OAuth flow already completed
  const existingResult = await redis.get(oauthResultKey);
  if (existingResult) {
    logger.info("Returning cached OAuth result for duplicate request", {
      nonce: decodedState.nonce,
      cachedResult: existingResult,
    });

    try {
      const cached = JSON.parse(existingResult as string);
      if (cached.success) {
        redirectUrl.searchParams.set("success", cached.success);
      } else if (cached.error) {
        redirectUrl.searchParams.set("error", cached.error);
        if (cached.error_description) {
          redirectUrl.searchParams.set(
            "error_description",
            cached.error_description,
          );
        }
      }
      return NextResponse.redirect(redirectUrl, { headers: response.headers });
    } catch (parseError) {
      logger.error("Failed to parse cached OAuth result", { parseError });
      // Continue with fresh attempt if cache is corrupted
    }
  }

  // Mark as processing (prevents race condition between duplicate requests)
  const lockKey = `oauth-lock:outlook:${decodedState.nonce}`;
  const isFirstRequest = await redis.set(lockKey, "1", {
    ex: 60,
    nx: true,
  });

  if (isFirstRequest !== "OK") {
    // Another request is processing - wait briefly and check for result
    logger.info(
      "Duplicate request detected - waiting for first request to complete",
      {
        nonce: decodedState.nonce,
      },
    );

    // Poll for result for up to 30 seconds (increased from 10s to handle slow DB operations)
    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const result = await redis.get(oauthResultKey);
      if (result) {
        try {
          const cached = JSON.parse(result as string);
          if (cached.success) {
            redirectUrl.searchParams.set("success", cached.success);
          } else if (cached.error) {
            redirectUrl.searchParams.set("error", cached.error);
            if (cached.error_description) {
              redirectUrl.searchParams.set(
                "error_description",
                cached.error_description,
              );
            }
          }
          return NextResponse.redirect(redirectUrl, {
            headers: response.headers,
          });
        } catch {
          break;
        }
      }
    }

    // Timeout - return error
    logger.warn("Timeout waiting for first OAuth request to complete");
    redirectUrl.searchParams.set("error", "duplicate_request_timeout");
    return NextResponse.redirect(redirectUrl, { headers: response.headers });
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: env.MICROSOFT_CLIENT_ID,
          client_secret: env.MICROSOFT_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: `${env.NEXT_PUBLIC_BASE_URL}/api/outlook/linking/callback`,
        }),
      },
    );

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(
        tokens.error_description || "Failed to exchange code for tokens",
      );
    }

    // Get user profile using the access token
    const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const profile = await profileResponse.json();
    const providerEmail = profile.mail || profile.userPrincipalName;

    if (!providerEmail) {
      throw new Error("Profile missing required email");
    }

    const providerAccountId = profile.id || providerEmail;

    // Fix: Check account by providerAccountId first (matches Google callback pattern)
    // This correctly identifies if the Microsoft account already exists in the system
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "microsoft",
          providerAccountId,
        },
      },
      select: {
        id: true,
        userId: true,
        user: { select: { name: true, email: true } },
      },
    });

    // Check if current user already has this email account (prevent duplicates)
    const existingEmailAccount = await prisma.emailAccount.findFirst({
      where: {
        userId: targetUserId,
        email: providerEmail.trim().toLowerCase(),
      },
      select: {
        id: true,
        accountId: true,
      },
    });

    if (!existingAccount) {
      if (action === "merge") {
        logger.warn(
          "Merge Failed: Microsoft account not found in the system. Cannot merge.",
          { email: providerEmail },
        );

        // Daily Briefing - Cache error result for idempotency
        await redis.set(
          oauthResultKey,
          JSON.stringify({ error: "account_not_found_for_merge" }),
          { ex: 3600 },
        );
        await redis.del(lockKey);

        redirectUrl.searchParams.set("error", "account_not_found_for_merge");
        return NextResponse.redirect(redirectUrl, {
          headers: response.headers,
        });
      } else {
        // Prevent duplicate account creation - check if current user already has this email
        if (existingEmailAccount) {
          logger.info(
            "Account already exists for current user - returning success (idempotent)",
            {
              email: providerEmail,
              targetUserId,
              emailAccountId: existingEmailAccount.id,
            },
          );

          // Daily Briefing - Cache success result for idempotency
          await redis.set(
            oauthResultKey,
            JSON.stringify({ success: "account_created_and_linked" }),
            { ex: 3600 },
          );
          await redis.del(lockKey);

          redirectUrl.searchParams.set("success", "account_created_and_linked");
          return NextResponse.redirect(redirectUrl, {
            headers: response.headers,
          });
        }

        logger.info(
          "Creating new Microsoft account and linking to current user",
          {
            email: providerEmail,
            targetUserId,
          },
        );

        let expiresAt: Date | null = null;
        if (tokens.expires_at) {
          expiresAt = new Date(tokens.expires_at * 1000);
        } else if (tokens.expires_in) {
          const expiresInSeconds =
            typeof tokens.expires_in === "string"
              ? Number.parseInt(tokens.expires_in, 10)
              : tokens.expires_in;
          expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
        }

        // Fetch profile picture before creating account (optional, non-blocking)
        let profileImage = null;
        try {
          const photoResponse = await fetch(
            "https://graph.microsoft.com/v1.0/me/photo/$value",
            {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
              },
            },
          );

          if (photoResponse.ok) {
            const photoBuffer = await photoResponse.arrayBuffer();
            const photoBase64 = Buffer.from(photoBuffer).toString("base64");
            profileImage = `data:image/jpeg;base64,${photoBase64}`;
          }
        } catch (error) {
          logger.warn("Failed to fetch profile picture", { error });
        }

        // Wrap Account + EmailAccount creation in transaction
        // This ensures both are created atomically or both fail
        const { newAccount, newEmailAccount } = await prisma.$transaction(
          async (tx) => {
            const account = await tx.account.create({
              data: {
                userId: targetUserId,
                type: "oidc",
                provider: "microsoft",
                providerAccountId,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: expiresAt,
                scope: tokens.scope,
                token_type: tokens.token_type,
              },
            });

            const emailAccount = await tx.emailAccount.create({
              data: {
                email: providerEmail,
                userId: targetUserId,
                accountId: account.id,
                name:
                  profile.displayName ||
                  profile.givenName ||
                  profile.surname ||
                  providerEmail,
                image: profileImage,
              },
            });

            return { newAccount: account, newEmailAccount: emailAccount };
          },
        );

        // Daily Briefing - Save success result AFTER both Account and EmailAccount are created
        // This ensures duplicate requests get result only if both records exist
        await redis.set(
          oauthResultKey,
          JSON.stringify({ success: "account_created_and_linked" }),
          { ex: 3600 },
        );

        logger.info("Successfully created and linked new Microsoft account", {
          email: providerEmail,
          targetUserId,
          accountId: newAccount.id,
          emailAccountId: newEmailAccount.id,
        });

        // Delete lock after successful completion
        await redis.del(lockKey);

        redirectUrl.searchParams.set("success", "account_created_and_linked");
        return NextResponse.redirect(redirectUrl, {
          headers: response.headers,
        });
      }
    }

    if (existingAccount.userId === targetUserId) {
      logger.warn(
        "Microsoft account is already linked to the correct user. Merge action unnecessary.",
        { email: providerEmail, targetUserId },
      );

      // Daily Briefing - Cache error result for idempotency
      await redis.set(
        oauthResultKey,
        JSON.stringify({ error: "already_linked_to_self" }),
        { ex: 3600 },
      );
      await redis.del(lockKey);

      redirectUrl.searchParams.set("error", "already_linked_to_self");
      return NextResponse.redirect(redirectUrl, {
        headers: response.headers,
      });
    }

    logger.info("Merging Microsoft account linked to user.", {
      email: providerEmail,
      targetUserId,
    });

    // Transfer premium subscription before deleting the source user
    await transferPremiumDuringMerge({
      sourceUserId: existingAccount.userId,
      targetUserId,
    });

    // Save fresh OAuth tokens before updating relationships
    // Calculate expires_at in seconds (unix timestamp)
    let expiresAtSeconds: number | undefined;
    if (tokens.expires_at) {
      expiresAtSeconds = tokens.expires_at;
    } else if (tokens.expires_in) {
      const expiresInSeconds =
        typeof tokens.expires_in === "string"
          ? Number.parseInt(tokens.expires_in, 10)
          : tokens.expires_in;
      expiresAtSeconds = Math.floor(Date.now() / 1000 + expiresInSeconds);
    }

    await saveTokens({
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAtSeconds,
      },
      accountRefreshToken: tokens.refresh_token || null,
      providerAccountId: providerEmail, // Microsoft uses email as providerAccountId
      provider: "microsoft",
    });

    // Daily Briefing - Custom addition: Get ALL email accounts to prevent CASCADE delete
    const sourceEmailAccounts = await prisma.emailAccount.findMany({
      where: { userId: existingAccount.userId },
    });

    await prisma.$transaction([
      prisma.account.update({
        where: { id: existingAccount.id },
        data: { userId: targetUserId },
      }),
      // Move ALL email accounts to prevent CASCADE delete when user is deleted
      ...sourceEmailAccounts.map((ea) =>
        prisma.emailAccount.update({
          where: { id: ea.id },
          data: {
            userId: targetUserId,
            // Update name/email only for the account being merged
            ...(ea.accountId === existingAccount.id
              ? {
                  name: existingAccount.user.name,
                  email: existingAccount.user.email,
                }
              : {}),
          },
        }),
      ),
      prisma.user.delete({
        where: { id: existingAccount.userId },
      }),
    ]);

    logger.info("Account re-assigned to user.", {
      email: providerEmail,
      targetUserId,
      sourceUserId: existingAccount.userId,
    });

    // Daily Briefing - Cache success result for idempotency
    await redis.set(
      oauthResultKey,
      JSON.stringify({ success: "account_merged" }),
      { ex: 3600 },
    );
    await redis.del(lockKey);

    redirectUrl.searchParams.set("success", "account_merged");
    return NextResponse.redirect(redirectUrl, {
      headers: response.headers,
    });
  } catch (error: any) {
    logger.error("Error in Outlook linking callback:", { error });
    let errorCode = "link_failed";
    if (error.message?.includes("Failed to exchange code")) {
      errorCode = "token_exchange_failed";
    } else if (error.message?.includes("Failed to fetch user profile")) {
      errorCode = "profile_fetch_failed";
    } else if (error.message?.includes("Profile missing required")) {
      errorCode = "incomplete_profile";
    }

    // Daily Briefing - Cache error result for idempotency
    await redis.set(
      oauthResultKey,
      JSON.stringify({
        error: errorCode,
        error_description: error.message || "Unknown error",
      }),
      { ex: 3600 },
    );
    // Delete lock on error to allow retry
    await redis.del(lockKey).catch(() => {
      // Ignore if lock doesn't exist
    });

    redirectUrl.searchParams.set("error", errorCode);
    redirectUrl.searchParams.set(
      "error_description",
      error.message || "Unknown error",
    );
    response.cookies.delete(OUTLOOK_LINKING_STATE_COOKIE_NAME);
    return NextResponse.redirect(redirectUrl, { headers: response.headers });
  }
});
