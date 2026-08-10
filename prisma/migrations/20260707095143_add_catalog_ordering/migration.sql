-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "sort_strategy" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "products_category_order_idx" ON "products"("category_id", "is_featured", "sort_order");
