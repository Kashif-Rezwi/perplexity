-- AlterTable
ALTER TABLE "Turn" ADD COLUMN "suggestedFollowUpQuestions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
