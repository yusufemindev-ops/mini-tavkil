-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_impersonator_user_id_fkey";

-- DropForeignKey
ALTER TABLE "buyer_accounts" DROP CONSTRAINT "buyer_accounts_created_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "buyer_accounts" DROP CONSTRAINT "buyer_accounts_preferred_locale_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_cart_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "carts" DROP CONSTRAINT "carts_buyer_account_id_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "category_translations" DROP CONSTRAINT "category_translations_category_id_fkey";

-- DropForeignKey
ALTER TABLE "category_translations" DROP CONSTRAINT "category_translations_locale_fkey";

-- DropForeignKey
ALTER TABLE "contact_messages" DROP CONSTRAINT "contact_messages_locale_fkey";

-- DropForeignKey
ALTER TABLE "contact_messages" DROP CONSTRAINT "contact_messages_replied_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "email_queue" DROP CONSTRAINT "email_queue_locale_fkey";

-- DropForeignKey
ALTER TABLE "fx_rates" DROP CONSTRAINT "fx_rates_currency_code_fkey";

-- DropForeignKey
ALTER TABLE "impersonation_sessions" DROP CONSTRAINT "impersonation_sessions_impersonator_user_id_fkey";

-- DropForeignKey
ALTER TABLE "impersonation_sessions" DROP CONSTRAINT "impersonation_sessions_target_buyer_id_fkey";

-- DropForeignKey
ALTER TABLE "media" DROP CONSTRAINT "media_uploaded_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "order_request_items" DROP CONSTRAINT "order_request_items_currency_fkey";

-- DropForeignKey
ALTER TABLE "order_request_items" DROP CONSTRAINT "order_request_items_order_request_id_fkey";

-- DropForeignKey
ALTER TABLE "order_request_items" DROP CONSTRAINT "order_request_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "order_requests" DROP CONSTRAINT "order_requests_assigned_user_id_fkey";

-- DropForeignKey
ALTER TABLE "order_requests" DROP CONSTRAINT "order_requests_buyer_account_id_fkey";

-- DropForeignKey
ALTER TABLE "order_requests" DROP CONSTRAINT "order_requests_confirmed_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "order_requests" DROP CONSTRAINT "order_requests_confirmed_currency_fkey";

-- DropForeignKey
ALTER TABLE "order_requests" DROP CONSTRAINT "order_requests_locale_fkey";

-- DropForeignKey
ALTER TABLE "order_requests" DROP CONSTRAINT "order_requests_submitted_currency_fkey";

-- DropForeignKey
ALTER TABLE "product_attributes" DROP CONSTRAINT "product_attributes_locale_fkey";

-- DropForeignKey
ALTER TABLE "product_attributes" DROP CONSTRAINT "product_attributes_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_translations" DROP CONSTRAINT "product_translations_locale_fkey";

-- DropForeignKey
ALTER TABLE "product_translations" DROP CONSTRAINT "product_translations_product_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_base_price_currency_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_base_price_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_supplier_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_granted_by_fkey";

-- DropForeignKey
ALTER TABLE "supplier_translations" DROP CONSTRAINT "supplier_translations_locale_fkey";

-- DropForeignKey
ALTER TABLE "supplier_translations" DROP CONSTRAINT "supplier_translations_supplier_id_fkey";

-- DropForeignKey
ALTER TABLE "system_settings" DROP CONSTRAINT "system_settings_updated_by_user_id_fkey";

-- AlterTable
ALTER TABLE "audit_log" ALTER COLUMN "impersonator_user_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "role_permissions" ALTER COLUMN "granted_by" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "system_settings" ALTER COLUMN "updated_by_user_id" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "buyer_accounts";

-- DropTable
DROP TABLE "cart_items";

-- DropTable
DROP TABLE "carts";

-- DropTable
DROP TABLE "categories";

-- DropTable
DROP TABLE "category_translations";

-- DropTable
DROP TABLE "contact_messages";

-- DropTable
DROP TABLE "currencies";

-- DropTable
DROP TABLE "email_queue";

-- DropTable
DROP TABLE "fx_rates";

-- DropTable
DROP TABLE "impersonation_sessions";

-- DropTable
DROP TABLE "media";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "order_number_sequence";

-- DropTable
DROP TABLE "order_request_items";

-- DropTable
DROP TABLE "order_requests";

-- DropTable
DROP TABLE "product_attributes";

-- DropTable
DROP TABLE "product_images";

-- DropTable
DROP TABLE "product_translations";

-- DropTable
DROP TABLE "products";

-- DropTable
DROP TABLE "supplier_translations";

-- DropTable
DROP TABLE "suppliers";

-- DropTable
DROP TABLE "users";

