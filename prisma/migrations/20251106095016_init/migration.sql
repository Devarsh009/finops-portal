-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "SavingStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REALIZED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpendRecord" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cloud" TEXT NOT NULL,
    "account_or_project" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "team" TEXT,
    "env" TEXT,
    "cost_usd" DECIMAL(18,6) NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpendRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingIdea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "est_monthly_saving_usd" DECIMAL(18,2) NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "owner" TEXT NOT NULL,
    "status" "SavingStatus" NOT NULL DEFAULT 'PROPOSED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingIdea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SpendRecord_dedupe_key_key" ON "SpendRecord"("dedupe_key");

-- CreateIndex
CREATE INDEX "SpendRecord_date_idx" ON "SpendRecord"("date");

-- CreateIndex
CREATE INDEX "SpendRecord_cloud_date_idx" ON "SpendRecord"("cloud", "date");

-- CreateIndex
CREATE INDEX "SpendRecord_service_date_idx" ON "SpendRecord"("service", "date");

-- CreateIndex
CREATE INDEX "SpendRecord_team_date_idx" ON "SpendRecord"("team", "date");

-- CreateIndex
CREATE INDEX "SpendRecord_env_date_idx" ON "SpendRecord"("env", "date");
