-- CreateTable
CREATE TABLE "order_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_number" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "tier_markup_percent_at_submit" DECIMAL(5,2) NOT NULL,
    "submitted_subtotal_amount" DECIMAL(14,4) NOT NULL,
    "submitted_currency" CHAR(3) NOT NULL,
    "confirmed_markup_percent" DECIMAL(5,2),
    "confirmed_subtotal_amount" DECIMAL(14,4),
    "confirmed_grand_total_amount" DECIMAL(14,4),
    "confirmed_currency" CHAR(3),
    "confirmed_at" TIMESTAMPTZ(3),
    "confirmed_by_user_id" TEXT,
    "notes_buyer" TEXT,
    "notes_admin" TEXT,
    "rejection_reason" TEXT,
    "assigned_user_id" TEXT,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMPTZ(3),
    "rejected_at" TIMESTAMPTZ(3),
    "expired_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "order_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_request_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_request_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name_snapshot" TEXT NOT NULL,
    "product_image_url_snapshot" TEXT,
    "product_unit_snapshot" TEXT NOT NULL,
    "product_moq_snapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_base" DECIMAL(14,4) NOT NULL,
    "unit_price_final" DECIMAL(14,4),
    "line_subtotal" DECIMAL(14,4),
    "currency" CHAR(3) NOT NULL,
    "buyer_note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_number_sequence" (
    "year" INTEGER NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_number_sequence_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_requests_order_number_key" ON "order_requests"("order_number");

-- CreateIndex
CREATE INDEX "order_requests_buyer_idx" ON "order_requests"("buyer_id");

-- CreateIndex
CREATE INDEX "order_requests_status_idx" ON "order_requests"("status");

-- CreateIndex
CREATE INDEX "order_requests_assigned_idx" ON "order_requests"("assigned_user_id");

-- CreateIndex
CREATE INDEX "order_requests_submitted_at_idx" ON "order_requests"("submitted_at" DESC);

-- CreateIndex
CREATE INDEX "order_request_items_request_idx" ON "order_request_items"("order_request_id");

-- AddForeignKey
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "authUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_confirmed_by_user_id_fkey" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "authUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "authUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_locale_fkey" FOREIGN KEY ("locale") REFERENCES "locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_submitted_currency_fkey" FOREIGN KEY ("submitted_currency") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_confirmed_currency_fkey" FOREIGN KEY ("confirmed_currency") REFERENCES "currencies"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_request_items" ADD CONSTRAINT "order_request_items_order_request_id_fkey" FOREIGN KEY ("order_request_id") REFERENCES "order_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_request_items" ADD CONSTRAINT "order_request_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_request_items" ADD CONSTRAINT "order_request_items_currency_fkey" FOREIGN KEY ("currency") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Custom SQL (Prisma can't express these): status/quantity CHECK constraints and
-- the per-year order-number generator. See db-schema.md v0.6 §9.5.
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_status_check"
    CHECK ("status" IN ('submitted','confirmed','accepted','rejected','expired'));

ALTER TABLE "order_request_items" ADD CONSTRAINT "order_request_items_quantity_check"
    CHECK ("quantity" > 0);

CREATE OR REPLACE FUNCTION next_order_number() RETURNS TEXT AS $$
DECLARE
    yr INT := EXTRACT(YEAR FROM now());
    seq INT;
BEGIN
    INSERT INTO order_number_sequence(year, last_number) VALUES (yr, 1)
    ON CONFLICT (year) DO UPDATE SET last_number = order_number_sequence.last_number + 1
    RETURNING last_number INTO seq;
    RETURN 'O-' || yr::text || '-' || lpad(seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
