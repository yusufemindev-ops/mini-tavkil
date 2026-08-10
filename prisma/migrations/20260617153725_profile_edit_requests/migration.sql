-- CreateTable
CREATE TABLE "profile_edit_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" TEXT NOT NULL,
    "proposed_contact_name" TEXT,
    "proposed_company" TEXT,
    "proposed_phone" TEXT,
    "proposed_job_title" TEXT,
    "proposed_country" CHAR(2),
    "proposed_city" TEXT,
    "proposed_address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by_auth_user_id" TEXT,
    "reviewed_at" TIMESTAMPTZ(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profile_edit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_edit_requests_status_idx" ON "profile_edit_requests"("status");

-- CreateIndex
CREATE INDEX "profile_edit_requests_buyer_idx" ON "profile_edit_requests"("auth_user_id");

-- AddForeignKey
ALTER TABLE "profile_edit_requests" ADD CONSTRAINT "profile_edit_requests_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "authUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
