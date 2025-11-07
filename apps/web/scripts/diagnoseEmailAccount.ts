import prisma from "../utils/prisma";

async function diagnoseEmailAccount(email: string) {
  console.log(`\n🔍 Diagnosing email account: ${email}\n`);
  console.log("=".repeat(80));

  // 1. Check EmailAccount Settings
  console.log("\n📧 EMAIL ACCOUNT SETTINGS:");
  console.log("-".repeat(80));

  const emailAccount = await prisma.emailAccount.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      autoCategorizeSenders: true,
      watchEmailsExpirationDate: true,
      watchEmailsSubscriptionId: true,
      lastSyncedHistoryId: true,
      createdAt: true,
      updatedAt: true,
      multiRuleSelectionEnabled: true,
      account: {
        select: {
          provider: true,
          access_token: true,
          refresh_token: true,
          expires_at: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          aiProvider: true,
          aiModel: true,
          aiApiKey: true,
          premium: {
            select: {
              tier: true,
              lemonSqueezyRenewsAt: true,
              stripeSubscriptionStatus: true,
            },
          },
        },
      },
    },
  });

  if (!emailAccount) {
    console.log(`❌ Email account not found: ${email}`);
    return;
  }

  console.log(`✓ Account ID: ${emailAccount.id}`);
  console.log(`✓ Name: ${emailAccount.name || "Not set"}`);
  console.log(`✓ Created: ${emailAccount.createdAt}`);
  console.log(`✓ Provider: ${emailAccount.account.provider || "Not set"}`);
  console.log("\n📊 SYNC STATUS:");
  console.log(
    `  • Auto Categorize Senders: ${emailAccount.autoCategorizeSenders ? "✅ ENABLED" : "❌ DISABLED"}`,
  );
  console.log(
    `  • Last Synced History ID: ${emailAccount.lastSyncedHistoryId || "❌ Not synced yet"}`,
  );
  console.log(
    `  • Watch Expiration: ${emailAccount.watchEmailsExpirationDate || "❌ Not watching"}`,
  );

  if (emailAccount.watchEmailsExpirationDate) {
    const isExpired =
      new Date(emailAccount.watchEmailsExpirationDate) < new Date();
    console.log(`  • Watch Status: ${isExpired ? "❌ EXPIRED" : "✅ ACTIVE"}`);
  }

  console.log(
    `  • Watch Subscription ID: ${emailAccount.watchEmailsSubscriptionId || "❌ Not set"}`,
  );
  console.log(
    `  • Has Access Token: ${emailAccount.account.access_token ? "✅ Yes" : "❌ No"}`,
  );
  console.log(
    `  • Has Refresh Token: ${emailAccount.account.refresh_token ? "✅ Yes" : "❌ No"}`,
  );
  console.log(
    `  • Token Expires: ${emailAccount.account.expires_at || "Not set"}`,
  );

  // 2. Check Premium/AI Access
  console.log("\n💎 PREMIUM & AI ACCESS:");
  console.log("-".repeat(80));

  const hasPremium = !!emailAccount.user.premium?.tier;
  const hasCustomAI = !!emailAccount.user.aiApiKey;
  const hasAiAccess = hasPremium || hasCustomAI;

  console.log(`  • User Email: ${emailAccount.user.email}`);
  console.log(
    `  • Premium Tier: ${emailAccount.user.premium?.tier || "❌ None"}`,
  );
  console.log(
    `  • Stripe Status: ${emailAccount.user.premium?.stripeSubscriptionStatus || "N/A"}`,
  );
  console.log(`  • Custom AI Key: ${hasCustomAI ? "✅ Yes" : "❌ No"}`);
  console.log(`  • AI Provider: ${emailAccount.user.aiProvider || "Default"}`);
  console.log(`  • AI Model: ${emailAccount.user.aiModel || "Default"}`);
  console.log(
    `  • HAS AI ACCESS: ${hasAiAccess ? "✅ YES" : "❌ NO (Required for categorization)"}`,
  );

  // 3. Check Categories
  console.log("\n📁 CATEGORIES:");
  console.log("-".repeat(80));

  const categories = await prisma.category.findMany({
    where: { emailAccountId: emailAccount.id },
  });

  if (categories.length === 0) {
    console.log("❌ No categories found (Required for categorization)");
  } else {
    console.log(`✅ Found ${categories.length} categories:`);
    categories.forEach((cat) => {
      console.log(`   • ${cat.name} (${cat.description || "No description"})`);
    });
  }

  // 4. Check Rules
  console.log("\n⚙️  AUTOMATION RULES:");
  console.log("-".repeat(80));

  const rules = await prisma.rule.findMany({
    where: { emailAccountId: emailAccount.id },
    include: { actions: true },
  });

  const enabledRules = rules.filter((r) => r.enabled);

  if (rules.length === 0) {
    console.log("❌ No rules found");
  } else {
    console.log(`📋 Total rules: ${rules.length}`);
    console.log(`✓ Enabled rules: ${enabledRules.length}`);
    console.log(`✗ Disabled rules: ${rules.length - enabledRules.length}`);

    if (enabledRules.length > 0) {
      console.log("\n   Enabled Rules:");
      enabledRules.forEach((rule) => {
        console.log(`   • ${rule.name}`);
        console.log(`     Type: ${rule.type}`);
        console.log(`     Actions: ${rule.actions.length}`);
        rule.actions.forEach((action) => {
          console.log(`       - ${action.type}`);
        });
      });
    }
  }

  // 5. Check Newsletters/Senders
  console.log("\n📮 CATEGORIZED SENDERS:");
  console.log("-".repeat(80));

  const newsletters = await prisma.newsletter.findMany({
    where: { emailAccountId: emailAccount.id },
    select: {
      email: true,
      name: true,
      categoryId: true,
      status: true,
    },
    take: 10,
  });

  const categorizedSenders = newsletters.filter((n) => n.categoryId);

  console.log(`📊 Total senders tracked: ${newsletters.length}`);
  console.log(`📊 Senders with category: ${categorizedSenders.length}`);

  if (categorizedSenders.length > 0) {
    console.log("\n   Recent categorized senders (showing first 10):");
    categorizedSenders.slice(0, 10).forEach((sender) => {
      console.log(`   • ${sender.email} (${sender.name || "No name"})`);
    });
  }

  // 6. Check Executed Rules
  console.log("\n📊 RECENT RULE EXECUTIONS:");
  console.log("-".repeat(80));

  const executedRules = await prisma.executedRule.findMany({
    where: { emailAccountId: emailAccount.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      rule: {
        select: { name: true },
      },
    },
  });

  if (executedRules.length === 0) {
    console.log("❌ No rules have been executed yet");
  } else {
    console.log(
      `✅ Found ${executedRules.length} recent executions (showing last 5):`,
    );
    executedRules.forEach((exec) => {
      console.log(`   • ${exec.createdAt.toISOString()}: ${exec.rule.name}`);
      console.log(`     Reason: ${exec.reason || "No reason"}`);
    });
  }

  // Summary
  console.log(`\n${"=".repeat(80)}`);
  console.log("🎯 DIAGNOSIS SUMMARY:");
  console.log("=".repeat(80));

  const issues: string[] = [];
  const working: string[] = [];

  if (!hasAiAccess) {
    issues.push("❌ No AI access (need premium tier or custom API key)");
  } else {
    working.push("✅ Has AI access");
  }

  if (!emailAccount.autoCategorizeSenders) {
    issues.push("❌ Auto categorize senders is DISABLED");
  } else {
    working.push("✅ Auto categorize senders is enabled");
  }

  if (!emailAccount.watchEmailsExpirationDate) {
    issues.push("❌ Gmail watch not set up (emails won't sync)");
  } else if (new Date(emailAccount.watchEmailsExpirationDate) < new Date()) {
    issues.push("❌ Gmail watch EXPIRED (emails won't sync)");
  } else {
    working.push("✅ Gmail watch is active");
  }

  if (!emailAccount.lastSyncedHistoryId) {
    issues.push("⚠️  Never synced any emails");
  } else {
    working.push("✅ Has synced emails");
  }

  if (categories.length === 0) {
    issues.push("❌ No categories created");
  } else {
    working.push(`✅ Has ${categories.length} categories`);
  }

  if (enabledRules.length === 0) {
    issues.push("⚠️  No enabled automation rules");
  } else {
    working.push(`✅ Has ${enabledRules.length} enabled rules`);
  }

  if (
    !emailAccount.account.access_token ||
    !emailAccount.account.refresh_token
  ) {
    issues.push("❌ Missing OAuth tokens");
  } else {
    working.push("✅ Has valid OAuth tokens");
  }

  console.log("\n✅ WORKING:");
  working.forEach((item) => console.log(`   ${item}`));

  if (issues.length > 0) {
    console.log("\n⚠️  ISSUES FOUND:");
    issues.forEach((item) => console.log(`   ${item}`));
  } else {
    console.log("\n🎉 No issues found! Everything looks good.");
  }

  console.log(`\n${"=".repeat(80)}`);
}

// Run diagnosis
const email = process.argv[2] || "shake@quickpointdigital.com";
diagnoseEmailAccount(email)
  .then(() => {
    console.log("\n✅ Diagnosis complete\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error running diagnosis:", error);
    process.exit(1);
  });
