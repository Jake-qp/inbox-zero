import { NextResponse } from "next/server";
import { withAuth } from "@/utils/middleware";
import prisma from "@/utils/prisma";
import { createEmailProvider } from "@/utils/email/provider";
import { scoreEmailsBatch } from "@/utils/ai/briefing/score-importance";
import { createScopedLogger } from "@/utils/logger";
import { z } from "zod";
import type { ParsedMessage } from "@/utils/types";
import { cleanupInvalidTokens } from "@/utils/auth/cleanup-invalid-tokens";
import { isGoogleProvider } from "@/utils/email/provider-types";

const logger = createScopedLogger("briefing-api");

export type BriefingResponse = {
  accounts: Array<{
    account: {
      id: string;
      email: string;
      provider: string;
      name: string | null;
      image: string | null;
    };
    emails: Array<ParsedMessage & { score: number }>;
    badge: {
      count: number;
      hasUrgent: boolean;
    };
    hasError?: boolean;
    errorType?: "AUTH_REQUIRED" | "OTHER";
    atLimit?: boolean;
  }>;
  totalScanned: number;
  totalShown: number;
};

async function generateBriefing(
  userId: string,
  mode: "inbox" | "history",
  startDate?: Date,
  endDate?: Date,
): Promise<BriefingResponse> {
  // Fetch all email accounts for user with briefingGuidance
  const emailAccounts = await prisma.emailAccount.findMany({
    where: { userId },
    select: {
      id: true,
      email: true,
      briefingGuidance: true,
      about: true,
      name: true,
      image: true,
      user: {
        select: {
          aiProvider: true,
          aiModel: true,
          aiApiKey: true,
        },
      },
      account: {
        select: {
          provider: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (emailAccounts.length === 0) {
    return { accounts: [], totalScanned: 0, totalShown: 0 };
  }

  const accountResults = await Promise.allSettled(
    emailAccounts.map(async (emailAccount) => {
      try {
        // Create email provider
        const provider = await createEmailProvider({
          emailAccountId: emailAccount.id,
          provider: emailAccount.account.provider,
        });

        // Fetch messages based on mode
        let messages: ParsedMessage[];
        let atLimit = false;

        if (mode === "inbox") {
          // Inbox mode: fetch all inbox emails (no time limit)
          const isGoogle = isGoogleProvider(emailAccount.account.provider);
          const fetchOptions = isGoogle
            ? {
                query: "in:inbox -in:trash -in:spam",
                maxResults: 100,
              }
            : {
                maxResults: 100,
              };

          const result = await provider.getMessagesWithPagination(fetchOptions);
          messages = result.messages;
          atLimit = messages.length >= 100;
        } else {
          // History mode: fetch messages for date range
          const result = await provider.getMessagesWithPagination({
            after: startDate!,
            before: endDate!,
            maxResults: 100,
          });
          messages = result.messages;
          atLimit = messages.length >= 100;
        }

        // Score emails
        const scores = await scoreEmailsBatch(messages, emailAccount);

        // Filter emails with score >= 6 and add scores
        const scoredEmails = messages
          .map((email) => ({
            ...email,
            score: scores.get(email.id) || 5,
          }))
          .filter((email) => email.score >= 6)
          .sort((a, b) => b.score - a.score);

        const urgentCount = scoredEmails.filter((e) => e.score >= 9).length;

        return {
          account: {
            id: emailAccount.id,
            email: emailAccount.email,
            provider: emailAccount.account.provider,
            name: emailAccount.name,
            image: emailAccount.image,
          },
          emails: scoredEmails,
          badge: {
            count: scoredEmails.length,
            hasUrgent: urgentCount > 0,
          },
          hasError: false,
          atLimit,
        };
      } catch (error) {
        // Detect token-related errors
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isTokenError =
          errorMessage.includes("No refresh token") ||
          errorMessage.includes("invalid_grant") ||
          errorMessage.includes("Decryption failed");

        if (isTokenError) {
          logger.warn("Token error detected, cleaning up", {
            emailAccountId: emailAccount.id,
            error: errorMessage,
          });

          // Use existing utility to clear invalid tokens
          await cleanupInvalidTokens({
            emailAccountId: emailAccount.id,
            reason: "invalid_grant",
            logger,
          });

          return {
            account: {
              id: emailAccount.id,
              email: emailAccount.email,
              provider: emailAccount.account.provider,
              name: emailAccount.name,
              image: emailAccount.image,
            },
            emails: [],
            badge: {
              count: 0,
              hasUrgent: false,
            },
            hasError: true,
            errorType: "AUTH_REQUIRED" as const,
            atLimit: false,
          };
        }

        // Non-token errors (existing error handling)
        logger.error("Failed to process account", {
          emailAccountId: emailAccount.id,
          error,
        });
        return {
          account: {
            id: emailAccount.id,
            email: emailAccount.email,
            provider: emailAccount.account.provider,
            name: emailAccount.name,
            image: emailAccount.image,
          },
          emails: [],
          badge: {
            count: 0,
            hasUrgent: false,
          },
          hasError: true,
          errorType: "OTHER" as const,
          atLimit: false,
        };
      }
    }),
  );

  const accounts = accountResults.map((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      // Handle rejected promise - return error account
      logger.error("Account processing rejected", { error: result.reason });
      return {
        account: {
          id: "",
          email: "",
          provider: "",
          name: null,
          image: null,
        },
        emails: [],
        badge: {
          count: 0,
          hasUrgent: false,
        },
        hasError: true,
        atLimit: false,
      };
    }
  });

  const totalScanned = emailAccounts.length;
  const totalShown = accounts.reduce((sum, acc) => sum + acc.emails.length, 0);

  return { accounts, totalScanned, totalShown };
}

export const GET = withAuth(async (request) => {
  const userId = request.auth.userId;
  const { searchParams } = new URL(request.url);

  // Detect mode: inbox (no date param) or history (date param present)
  const dateParam = searchParams.get("date");
  const mode = dateParam ? "history" : "inbox";

  if (mode === "history") {
    // History mode: validate date param and constraints
    const dateSchema = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional();
    const { data: validDate } = dateSchema.safeParse(dateParam);
    const targetDate = validDate || new Date().toISOString().split("T")[0];

    // Validate date constraints
    const today = new Date().toISOString().split("T")[0];
    if (targetDate > today) {
      return NextResponse.json(
        { error: "Cannot view future dates", errorCode: "FUTURE_DATE" },
        { status: 400 },
      );
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split("T")[0];
    if (targetDate < ninetyDaysAgoStr) {
      return NextResponse.json(
        {
          error: "Snapshot not available for dates older than 90 days",
          errorCode: "OLD_DATE",
        },
        { status: 400 },
      );
    }

    // Calculate date range (UTC normalized)
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`); // Force UTC midnight
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`); // Force UTC end of day

    // Check snapshot
    const snapshot = await prisma.briefingSnapshot.findUnique({
      where: { userId_date: { userId, date: startOfDay } },
    });

    // Return cached if valid
    const isToday = targetDate === today;
    if (snapshot) {
      if (!isToday) {
        // Past day: always return cached
        return NextResponse.json(snapshot.data as BriefingResponse);
      } else {
        // Today: return cached if < 1hr old
        const oneHourAgo = Date.now() - 3_600_000;
        if (snapshot.updatedAt.getTime() > oneHourAgo) {
          return NextResponse.json(snapshot.data as BriefingResponse);
        }
      }
    }

    // Generate if needed
    const briefingResponse = await generateBriefing(
      userId,
      mode,
      startOfDay,
      endOfDay,
    );

    // Upsert snapshot
    await prisma.briefingSnapshot.upsert({
      where: { userId_date: { userId, date: startOfDay } },
      create: {
        userId,
        date: startOfDay,
        data: briefingResponse,
      },
      update: {
        data: briefingResponse,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(briefingResponse);
  } else {
    // Inbox mode: no date validation, no snapshot caching
    const briefingResponse = await generateBriefing(userId, mode);
    return NextResponse.json(briefingResponse);
  }
});
