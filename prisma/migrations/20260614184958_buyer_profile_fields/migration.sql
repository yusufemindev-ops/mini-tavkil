-- AlterTable
ALTER TABLE "authUser" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "mustChangePassword" BOOLEAN DEFAULT false,
ADD COLUMN     "preferredLocale" TEXT DEFAULT 'en';
