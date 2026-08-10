-- DropForeignKey
ALTER TABLE "auth_bootstrap" DROP CONSTRAINT "auth_bootstrap_bootstrapped_user_id_fkey";

-- DropForeignKey
ALTER TABLE "buyer_sessions" DROP CONSTRAINT "buyer_sessions_buyer_account_id_fkey";

-- DropForeignKey
ALTER TABLE "twoFactor" DROP CONSTRAINT "twoFactor_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_assigned_by_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_role_id_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_user_id_fkey";

-- AlterTable
ALTER TABLE "authUser" DROP COLUMN "mustChangePassword",
DROP COLUMN "twoFactorEnabled";

-- DropTable
DROP TABLE "auth_bootstrap";

-- DropTable
DROP TABLE "buyer_sessions";

-- DropTable
DROP TABLE "password_reset_tokens";

-- DropTable
DROP TABLE "twoFactor";

-- DropTable
DROP TABLE "user_roles";

-- DropTable
DROP TABLE "user_sessions";

