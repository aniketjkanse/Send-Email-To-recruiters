-- CreateTable
CREATE TABLE "Recipient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT,
    "originalFile" TEXT,
    "uploadBatchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "senderEmail" TEXT,
    "subject" TEXT NOT NULL,
    "messageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "emailType" TEXT NOT NULL DEFAULT 'INITIAL',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recipient_userId_idx" ON "Recipient"("userId");

-- CreateIndex
CREATE INDEX "Recipient_userId_uploadBatchId_idx" ON "Recipient"("userId", "uploadBatchId");

-- CreateIndex
CREATE INDEX "Recipient_createdAt_idx" ON "Recipient"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Recipient_userId_email_key" ON "Recipient"("userId", "email");

-- CreateIndex
CREATE INDEX "SentEmail_userId_idx" ON "SentEmail"("userId");

-- CreateIndex
CREATE INDEX "SentEmail_userId_sentAt_idx" ON "SentEmail"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "SentEmail_messageId_idx" ON "SentEmail"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "SentEmail_userId_recipientEmail_emailType_key" ON "SentEmail"("userId", "recipientEmail", "emailType");

-- AddForeignKey
ALTER TABLE "Recipient" ADD CONSTRAINT "Recipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentEmail" ADD CONSTRAINT "SentEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
