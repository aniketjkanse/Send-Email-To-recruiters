-- CreateTable
CREATE TABLE "FollowUpTracker" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "senderEmail" TEXT,
    "subject" TEXT NOT NULL,
    "initialMessageId" TEXT NOT NULL,
    "initialSentAt" TIMESTAMP(3) NOT NULL,
    "followUp1MessageId" TEXT,
    "followUp1SentAt" TIMESTAMP(3),
    "followUp2MessageId" TEXT,
    "followUp2SentAt" TIMESTAMP(3),
    "replyDetected" BOOLEAN NOT NULL DEFAULT false,
    "replyMessageId" TEXT,
    "replySubject" TEXT,
    "replyDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'INITIAL_SENT',
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "removedAt" TIMESTAMP(3),
    "removedReason" TEXT,
    "stopped" BOOLEAN NOT NULL DEFAULT false,
    "stoppedAt" TIMESTAMP(3),
    "stoppedReason" TEXT,
    "lastError" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpTracker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUpTracker_userId_idx" ON "FollowUpTracker"("userId");

-- CreateIndex
CREATE INDEX "FollowUpTracker_userId_status_idx" ON "FollowUpTracker"("userId", "status");

-- CreateIndex
CREATE INDEX "FollowUpTracker_userId_initialSentAt_idx" ON "FollowUpTracker"("userId", "initialSentAt");

-- CreateIndex
CREATE INDEX "FollowUpTracker_userId_followUp1SentAt_idx" ON "FollowUpTracker"("userId", "followUp1SentAt");

-- CreateIndex
CREATE INDEX "FollowUpTracker_userId_followUp2SentAt_idx" ON "FollowUpTracker"("userId", "followUp2SentAt");

-- CreateIndex
CREATE INDEX "FollowUpTracker_userId_replyDetected_idx" ON "FollowUpTracker"("userId", "replyDetected");

-- CreateIndex
CREATE INDEX "FollowUpTracker_initialMessageId_idx" ON "FollowUpTracker"("initialMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpTracker_userId_recipientEmail_key" ON "FollowUpTracker"("userId", "recipientEmail");

-- AddForeignKey
ALTER TABLE "FollowUpTracker" ADD CONSTRAINT "FollowUpTracker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
