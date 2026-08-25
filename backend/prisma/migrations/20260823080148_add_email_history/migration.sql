-- CreateTable
CREATE TABLE "EmailHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "senderEmail" TEXT,
    "subject" TEXT,
    "messageId" TEXT,
    "emailType" TEXT NOT NULL DEFAULT 'INITIAL',
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailHistory_userId_idx" ON "EmailHistory"("userId");

-- CreateIndex
CREATE INDEX "EmailHistory_userId_sentAt_idx" ON "EmailHistory"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "EmailHistory_userId_status_idx" ON "EmailHistory"("userId", "status");

-- CreateIndex
CREATE INDEX "EmailHistory_userId_emailType_idx" ON "EmailHistory"("userId", "emailType");

-- CreateIndex
CREATE INDEX "EmailHistory_recipientEmail_idx" ON "EmailHistory"("recipientEmail");

-- AddForeignKey
ALTER TABLE "EmailHistory" ADD CONSTRAINT "EmailHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
