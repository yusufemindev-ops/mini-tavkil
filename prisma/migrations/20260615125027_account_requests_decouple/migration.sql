/*
  Warnings:

  - You are about to drop the column `created_buyer_account_id` on the `account_requests` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `account_requests` table. All the data in the column will be lost.
  - You are about to drop the column `reviewed_by_user_id` on the `account_requests` table. All the data in the column will be lost.
  - Added the required column `first_name` to the `account_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `account_requests` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "account_requests" DROP CONSTRAINT "account_requests_created_buyer_account_id_fkey";

-- DropForeignKey
ALTER TABLE "account_requests" DROP CONSTRAINT "account_requests_reviewed_by_user_id_fkey";

-- AlterTable
ALTER TABLE "account_requests" DROP COLUMN "created_buyer_account_id",
DROP COLUMN "name",
DROP COLUMN "reviewed_by_user_id",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "created_buyer_auth_user_id" TEXT,
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "reviewed_by_auth_user_id" TEXT,
ALTER COLUMN "company" DROP NOT NULL;
