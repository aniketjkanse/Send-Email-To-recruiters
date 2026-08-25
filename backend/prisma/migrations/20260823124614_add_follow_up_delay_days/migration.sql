-- AlterTable
ALTER TABLE "EmailTemplate" ADD COLUMN     "followUp1DelayDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "followUp2DelayDays" INTEGER NOT NULL DEFAULT 0;
