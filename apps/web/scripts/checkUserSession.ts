import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUserSession(email: string) {
  console.log(`\n=== Checking User Session Data for: ${email} ===\n`);

  // Check what the /api/user/me endpoint would return
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      aiProvider: true,
      aiModel: true,
      aiApiKey: true,
      webhookSecret: true,
      referralCode: true,
      premiumId: true,
      premium: {
        select: {
          id: true,
          lemonSqueezyCustomerId: true,
          lemonSqueezySubscriptionId: true,
          lemonSqueezyRenewsAt: true,
          stripeSubscriptionId: true,
          stripeSubscriptionStatus: true,
          unsubscribeCredits: true,
          tier: true,
          emailAccountsAccess: true,
          lemonLicenseKey: true,
          pendingInvites: true,
        },
      },
      emailAccounts: {
        select: {
          id: true,
          email: true,
          members: {
            select: {
              organizationId: true,
              role: true,
              organization: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    console.log(`❌ User not found: ${email}`);
    return;
  }

  console.log("✅ User Found:");
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.name}`);
  console.log(`   Has Premium ID: ${user.premiumId ? "✅ Yes" : "❌ No"}`);

  console.log("\n📊 Premium Data (what frontend receives):");
  if (user.premium) {
    console.log("   ✅ Premium exists");
    console.log(`   Tier: ${user.premium.tier}`);
    console.log(
      `   Lemon Squeezy Renews At: ${user.premium.lemonSqueezyRenewsAt}`,
    );
    console.log(
      `   Stripe Subscription Status: ${user.premium.stripeSubscriptionStatus || "NULL"}`,
    );
    console.log(
      `   Unsubscribe Credits: ${user.premium.unsubscribeCredits || 0}`,
    );
    console.log(
      `   Email Accounts Access: ${user.premium.emailAccountsAccess || "Unlimited"}`,
    );
  } else {
    console.log("   ❌ Premium is NULL");
  }

  console.log("\n📧 Email Accounts:");
  if (user.emailAccounts.length === 0) {
    console.log("   ⚠️  No email accounts connected");
  } else {
    console.log(`   ✅ ${user.emailAccounts.length} email account(s):`);
    user.emailAccounts.forEach((account) => {
      console.log(`      - ${account.email} (ID: ${account.id})`);
      if (account.members.length > 0) {
        console.log(
          `        Organizations: ${account.members.map((m) => m.organization.name).join(", ")}`,
        );
      }
    });
  }

  // Check the session to see if there's an active session
  console.log("\n🔐 Active Sessions:");
  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  if (sessions.length === 0) {
    console.log("   ⚠️  No active sessions found");
  } else {
    console.log(`   Found ${sessions.length} recent session(s):`);
    sessions.forEach((session) => {
      const isExpired = new Date(session.expires) < new Date();
      console.log(`      - Session ${session.id}`);
      console.log(`        Expires: ${session.expires}`);
      console.log(`        Status: ${isExpired ? "❌ EXPIRED" : "✅ ACTIVE"}`);
      console.log(`        IP: ${session.ipAddress || "N/A"}`);
    });
  }

  // Check if user/premium relation is properly set
  console.log("\n🔗 User-Premium Relation Check:");
  if (!user.premiumId) {
    console.log("   ❌ User.premiumId is NULL!");
  } else if (!user.premium) {
    console.log(
      `   ❌ User has premiumId (${user.premiumId}) but premium data is not loaded!`,
    );
  } else if (user.premiumId !== user.premium.id) {
    console.log(
      `   ❌ MISMATCH: User.premiumId (${user.premiumId}) != Premium.id (${user.premium.id})`,
    );
  } else {
    console.log(`   ✅ Relation is correct: ${user.premiumId}`);
  }

  // Double check: Query the premium directly
  console.log("\n🔍 Direct Premium Query:");
  if (user.premiumId) {
    const premium = await prisma.premium.findUnique({
      where: { id: user.premiumId },
      select: {
        id: true,
        tier: true,
        users: {
          select: {
            id: true,
            email: true,
          },
        },
        admins: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!premium) {
      console.log(`   ❌ Premium record NOT FOUND (ID: ${user.premiumId})`);
    } else {
      console.log(`   ✅ Premium found: ${premium.id}`);
      console.log(`   Tier: ${premium.tier}`);
      console.log(`   Users (${premium.users.length}):`);
      premium.users.forEach((u) => {
        console.log(`      - ${u.email} ${u.id === user.id ? "(YOU)" : ""}`);
      });
      console.log(`   Admins (${premium.admins.length}):`);
      premium.admins.forEach((a) => {
        console.log(`      - ${a.email} ${a.id === user.id ? "(YOU)" : ""}`);
      });
    }
  }
}

const email = process.argv[2] || "melissa@coharborelectric.com";
checkUserSession(email)
  .then(() => {
    console.log("\n✅ Check complete");
    return prisma.$disconnect();
  })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    return prisma.$disconnect().then(() => process.exit(1));
  });
