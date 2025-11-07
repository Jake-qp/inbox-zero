import "dotenv/config";
import { PrismaClient, PremiumTier } from "@prisma/client";

const prisma = new PrismaClient();

function isPremium(
  lemonSqueezyRenewsAt: Date | null,
  stripeSubscriptionStatus: string | null,
): boolean {
  if (stripeSubscriptionStatus) {
    const activeStatuses = ["active", "trialing"];
    if (activeStatuses.includes(stripeSubscriptionStatus)) return true;
  }
  if (lemonSqueezyRenewsAt) {
    return new Date(lemonSqueezyRenewsAt) > new Date();
  }
  return false;
}

async function checkLifetimeUsers() {
  console.log("=== Checking Lifetime Subscription Users ===\n");

  // 1. Check melissa@coharborelectric.com specifically
  console.log("--- Checking melissa@coharborelectric.com ---");
  const melissa = await prisma.user.findUnique({
    where: { email: "melissa@coharborelectric.com" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      premium: {
        select: {
          id: true,
          tier: true,
          lemonSqueezyRenewsAt: true,
          lemonSqueezyOrderId: true,
          stripeSubscriptionStatus: true,
          stripeSubscriptionId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!melissa) {
    console.log("❌ User melissa@coharborelectric.com NOT FOUND\n");
  } else {
    console.log("✅ User found:");
    console.log(`   User ID: ${melissa.id}`);
    console.log(`   Name: ${melissa.name}`);
    console.log(`   Created: ${melissa.createdAt}`);
    console.log(`   Premium ID: ${melissa.premium?.id || "NO PREMIUM"}`);
    console.log(`   Tier: ${melissa.premium?.tier || "NONE"}`);
    console.log(
      `   Lemon Squeezy Renews At: ${melissa.premium?.lemonSqueezyRenewsAt || "NULL"}`,
    );
    console.log(
      `   Lemon Squeezy Order ID: ${melissa.premium?.lemonSqueezyOrderId || "NULL"}`,
    );
    console.log(
      `   Stripe Status: ${melissa.premium?.stripeSubscriptionStatus || "NULL"}`,
    );
    console.log(
      `   Stripe Subscription ID: ${melissa.premium?.stripeSubscriptionId || "NULL"}`,
    );

    if (melissa.premium) {
      const isActive = isPremium(
        melissa.premium.lemonSqueezyRenewsAt,
        melissa.premium.stripeSubscriptionStatus,
      );
      console.log(
        `   \n   🔍 isPremium() check: ${isActive ? "✅ ACTIVE" : "❌ INACTIVE"}`,
      );

      if (!isActive && melissa.premium.tier === PremiumTier.LIFETIME) {
        console.log(
          "   ⚠️  ISSUE FOUND: User has LIFETIME tier but isPremium() returns false!",
        );
        console.log(
          `   This is because LIFETIME tier doesn't check the tier itself, only renewsAt dates.`,
        );
      }
    }
    console.log();
  }

  // 2. Get all users with LIFETIME tier
  console.log("\n--- All Users with LIFETIME Tier ---");
  const lifetimeUsers = await prisma.user.findMany({
    where: {
      premium: {
        tier: PremiumTier.LIFETIME,
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      premium: {
        select: {
          id: true,
          tier: true,
          lemonSqueezyRenewsAt: true,
          lemonSqueezyOrderId: true,
          stripeSubscriptionStatus: true,
          stripeSubscriptionId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  console.log(`\nFound ${lifetimeUsers.length} users with LIFETIME tier:\n`);

  for (const user of lifetimeUsers) {
    const isActive = isPremium(
      user.premium?.lemonSqueezyRenewsAt || null,
      user.premium?.stripeSubscriptionStatus || null,
    );

    console.log(`${isActive ? "✅" : "❌"} ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Premium ID: ${user.premium?.id}`);
    console.log(`   Tier: ${user.premium?.tier}`);
    console.log(
      `   Lemon Squeezy Renews At: ${user.premium?.lemonSqueezyRenewsAt || "NULL"}`,
    );
    console.log(
      `   Lemon Squeezy Order ID: ${user.premium?.lemonSqueezyOrderId || "NULL"}`,
    );
    console.log(
      `   Stripe Status: ${user.premium?.stripeSubscriptionStatus || "NULL"}`,
    );
    console.log(
      `   Stripe Subscription ID: ${user.premium?.stripeSubscriptionId || "NULL"}`,
    );
    console.log(`   Created: ${user.createdAt}`);

    if (!isActive) {
      console.log(
        "   ⚠️  WARNING: LIFETIME user shows as INACTIVE in isPremium() check",
      );
    }
    console.log();
  }

  console.log("\n=== Summary ===");
  console.log(`Total LIFETIME users: ${lifetimeUsers.length}`);
  const activeLifetimeUsers = lifetimeUsers.filter((u) =>
    isPremium(
      u.premium?.lemonSqueezyRenewsAt || null,
      u.premium?.stripeSubscriptionStatus || null,
    ),
  );
  const inactiveLifetimeUsers = lifetimeUsers.filter(
    (u) =>
      !isPremium(
        u.premium?.lemonSqueezyRenewsAt || null,
        u.premium?.stripeSubscriptionStatus || null,
      ),
  );
  console.log(`Active (by isPremium check): ${activeLifetimeUsers.length}`);
  console.log(`Inactive (by isPremium check): ${inactiveLifetimeUsers.length}`);

  if (inactiveLifetimeUsers.length > 0) {
    console.log("\n⚠️  CRITICAL ISSUE DETECTED:");
    console.log(
      `   ${inactiveLifetimeUsers.length} users have LIFETIME tier but show as inactive!`,
    );
    console.log(
      `   The isPremium() function doesn't account for LIFETIME tier.`,
    );
    console.log("   These users need either:");
    console.log("   - A far-future lemonSqueezyRenewsAt date, OR");
    console.log(`   - stripeSubscriptionStatus set to 'active', OR`);
    console.log("   - isPremium() function needs to be updated to check tier");
  }
}

checkLifetimeUsers()
  .then(() => {
    console.log("\n✅ Check complete");
    return prisma.$disconnect();
  })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    return prisma.$disconnect().then(() => process.exit(1));
  });
