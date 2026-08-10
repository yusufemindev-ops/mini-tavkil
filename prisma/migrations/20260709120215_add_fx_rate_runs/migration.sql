-- CreateTable
CREATE TABLE "fx_rate_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ran_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "source" TEXT,
    "error" TEXT,
    "rates" JSONB,

    CONSTRAINT "fx_rate_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fx_rate_runs_ran_at_idx" ON "fx_rate_runs"("ran_at");

