-- Thread status is now derived from the latest turn.
ALTER TABLE "Thread" DROP COLUMN "status";
DROP TYPE "ThreadStatus";
