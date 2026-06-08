-- Issue 1: Fix Thread.status default from COMPLETED to RUNNING.
-- The default should reflect the safe initial lifecycle state, not a terminal one.
ALTER TABLE "Thread" ALTER COLUMN "status" SET DEFAULT 'RUNNING';

-- Issue 14: Add VARCHAR(80) constraint to Thread.title.
-- Application code already enforces 80 chars via createThreadTitle.
-- This makes the database enforce the same limit, preventing any code path
-- that bypasses createThreadTitle from writing an unbounded title.
-- All 8 existing rows have titles under 80 characters (verified before migration).
ALTER TABLE "Thread" ALTER COLUMN "title" TYPE VARCHAR(80);
