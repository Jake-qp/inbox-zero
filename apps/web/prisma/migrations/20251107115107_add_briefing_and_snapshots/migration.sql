-- AlterTable
ALTER TABLE "EmailAccount" ADD COLUMN     "briefingGuidance" TEXT;

-- CreateTable
CREATE TABLE "BriefingSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "BriefingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BriefingSnapshot_userId_date_idx" ON "BriefingSnapshot"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BriefingSnapshot_userId_date_key" ON "BriefingSnapshot"("userId", "date");

-- AddForeignKey
ALTER TABLE "BriefingSnapshot" ADD CONSTRAINT "BriefingSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
