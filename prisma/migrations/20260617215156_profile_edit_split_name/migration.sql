/*
  Warnings:

  - You are about to drop the column `proposed_contact_name` on the `profile_edit_requests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "profile_edit_requests" DROP COLUMN "proposed_contact_name",
ADD COLUMN     "proposed_first_name" TEXT,
ADD COLUMN     "proposed_last_name" TEXT;
