-- Adds deterministic pagination indexes for source lists ordered by createdAt and id.
CREATE INDEX "Source_createdAt_id_idx" ON "Source"("createdAt", "id");
CREATE INDEX "Source_turnId_createdAt_id_idx" ON "Source"("turnId", "createdAt", "id");
