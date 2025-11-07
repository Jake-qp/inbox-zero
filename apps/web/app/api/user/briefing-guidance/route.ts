import { NextResponse } from "next/server";
import { withAuth } from "@/utils/middleware";
import prisma from "@/utils/prisma";
import { SafeError } from "@/utils/error";
import { z } from "zod";

const querySchema = z.object({
  emailAccountId: z.string(),
});

async function getBriefingGuidance({
  emailAccountId,
  userId,
}: {
  emailAccountId: string;
  userId: string;
}) {
  const emailAccount = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
    select: {
      id: true,
      briefingGuidance: true,
      account: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!emailAccount) {
    throw new SafeError("Email account not found");
  }

  if (emailAccount.account.userId !== userId) {
    throw new SafeError("Unauthorized");
  }

  return { briefingGuidance: emailAccount.briefingGuidance };
}

export const GET = withAuth(async (request) => {
  const userId = request.auth.userId;
  const { searchParams } = new URL(request.url);
  const emailAccountId = searchParams.get("emailAccountId");

  if (!emailAccountId) {
    return NextResponse.json(
      { error: "emailAccountId is required" },
      { status: 400 },
    );
  }

  const { data: validInput } = querySchema.safeParse({ emailAccountId });

  if (!validInput) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const result = await getBriefingGuidance({
    emailAccountId: validInput.emailAccountId,
    userId,
  });

  return NextResponse.json(result);
});
