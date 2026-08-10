-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "sku" TEXT,
    "base_price_amount" DECIMAL(14,4),
    "base_price_currency" CHAR(3),
    "base_price_updated_at" TIMESTAMPTZ(3),
    "base_price_updated_by" TEXT,
    "moq" INTEGER NOT NULL DEFAULT 1,
    "pack_size" INTEGER,
    "weight_kg" DECIMAL(10,3),
    "image_url" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant_option_values" (
    "variant_id" UUID NOT NULL,
    "option_value_id" UUID NOT NULL,

    CONSTRAINT "product_variant_option_values_pkey" PRIMARY KEY ("variant_id","option_value_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_idx" ON "product_variants"("product_id", "sort_order");

-- CreateIndex
CREATE INDEX "pvov_value_idx" ON "product_variant_option_values"("option_value_id");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_base_price_currency_fkey" FOREIGN KEY ("base_price_currency") REFERENCES "currencies"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_option_values" ADD CONSTRAINT "product_variant_option_values_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_option_values" ADD CONSTRAINT "product_variant_option_values_option_value_id_fkey" FOREIGN KEY ("option_value_id") REFERENCES "product_option_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: every existing product gets one default variant mirroring its
-- current SKU / price / MOQ / pack (TSC-64 Phase 1 — no behaviour change yet).
INSERT INTO "product_variants" (
  "product_id", "sku", "base_price_amount", "base_price_currency",
  "base_price_updated_at", "base_price_updated_by", "moq", "pack_size",
  "weight_kg", "is_default", "is_active", "sort_order"
)
SELECT
  "id", "sku", "base_price_amount", "base_price_currency",
  "base_price_updated_at", "base_price_updated_by", "moq", "pack_size",
  "weight_kg", true, true, 0
FROM "products";
