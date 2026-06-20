-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinnedAt" TIMESTAMP(6);

-- CreateIndex
CREATE INDEX "Thread_isPinned_pinnedAt_id_idx" ON "Thread"("isPinned", "pinnedAt", "id");

-- CreateIndex
CREATE INDEX "Thread_updatedAt_id_idx" ON "Thread"("updatedAt", "id");
