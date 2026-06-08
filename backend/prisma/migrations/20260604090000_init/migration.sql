-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ThreadStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ThreadMode" AS ENUM ('WEB');

-- CreateEnum
CREATE TYPE "TurnStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Thread" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "answerPreview" VARCHAR(300),
    "status" "ThreadStatus" NOT NULL DEFAULT 'COMPLETED',
    "mode" "ThreadMode" NOT NULL DEFAULT 'WEB',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turn" (
    "id" UUID NOT NULL,
    "threadId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "searchQuery" TEXT NOT NULL,
    "answerMarkdown" TEXT,
    "status" "TurnStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(6),

    CONSTRAINT "Turn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" UUID NOT NULL,
    "turnId" UUID NOT NULL,
    "citationNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'tavily',
    "providerScore" DOUBLE PRECISION,
    "publishedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" UUID NOT NULL,
    "turnId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "citationNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Thread_updatedAt_idx" ON "Thread"("updatedAt");

-- CreateIndex
CREATE INDEX "Turn_threadId_idx" ON "Turn"("threadId");

-- CreateIndex
CREATE INDEX "Turn_createdAt_idx" ON "Turn"("createdAt");

-- CreateIndex
CREATE INDEX "Source_turnId_idx" ON "Source"("turnId");

-- CreateIndex
CREATE UNIQUE INDEX "Source_turnId_citationNumber_key" ON "Source"("turnId", "citationNumber");

-- CreateIndex
CREATE INDEX "Citation_turnId_idx" ON "Citation"("turnId");

-- CreateIndex
CREATE INDEX "Citation_sourceId_idx" ON "Citation"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Citation_turnId_citationNumber_key" ON "Citation"("turnId", "citationNumber");

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "Turn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "Turn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
