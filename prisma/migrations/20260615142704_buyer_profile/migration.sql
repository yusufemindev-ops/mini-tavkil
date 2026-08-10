/*
  Warnings:

  - You are about to drop the column `notes` on the `authUser` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "authUser" DROP COLUMN "notes";

-- CreateTable
CREATE TABLE "buyer_profiles" (
    "auth_user_id" TEXT NOT NULL,
    "tier_markup_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "buyer_profiles_pkey" PRIMARY KEY ("auth_user_id")
);

-- AddForeignKey
ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "authUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
