import "dotenv/config";
import prisma from "@/utils/prisma";
import { decryptToken } from "@/utils/encryption";

async function main() {
  console.log("🔍 Checking for broken tokens...\n");

  const accounts = await prisma.account.findMany({
    where: { refresh_token: { not: null } },
    select: {
      id: true,
      refresh_token: true,
      emailAccount: { select: { email: true } },
    },
  });

  const broken = [];

  for (const account of accounts) {
    if (account.refresh_token) {
      const decrypted = decryptToken(account.refresh_token);
      if (!decrypted) {
        broken.push(account.id);
        console.log(`❌ Broken token: ${account.emailAccount?.email}`);
      } else {
        console.log(`✅ Valid token: ${account.emailAccount?.email}`);
      }
    }
  }

  if (broken.length > 0) {
    console.log(`\n🔧 Clearing ${broken.length} broken tokens...`);
    await prisma.account.updateMany({
      where: { id: { in: broken } },
      data: {
        access_token: null,
        refresh_token: null,
        expires_at: null,
      },
    });
    console.log(
      `✅ Fixed ${broken.length} accounts - users will be prompted to reconnect\n`,
    );
  } else {
    console.log("\n✅ No broken tokens found - all accounts healthy\n");
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit());
