import { createHmac } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { expect, test } from '@playwright/test';

loadEnv({ path: ['.env.local', '.env'] });
import { and, eq, gt, isNull, like } from 'drizzle-orm';
import { db } from '../../src/lib/db';
import {
  authSession,
  authUser,
  buyerProfiles,
  orderRequestItems,
  orderRequests,
  products,
  productTranslations,
  profileEditRequests,
} from '../../src/lib/db/schema';
import { confirmAdminOrder } from '../../src/lib/services/orders';

/**
 * TESTING.md §2 — Authenticated Buyer E2E Flow:
 * 1. Provisioned buyer signs in → views personalized `unitPrice` (with zero
 *    `base_price` or `tier_markup_percent` in HTML or network payloads)
 * 2. Adds product to request cart → submits order request (`TVK-XXXXXX`)
 * 3. Admin confirms order → buyer sees notification in `NotificationBell` and
 *    accepts the confirmed proforma quote
 * 4. Buyer submits a profile edit request on `/en/account` and withdraws it
 */

const FORBIDDEN_BUYER_KEYS = [
  'basePriceAmount',
  'base_price_amount',
  'basePrice',
  'base_price',
  'tierMarkupPercent',
  'tier_markup_percent',
  'tierMarkup',
];

const runId = Date.now();
const buyerUserId = `e2e-buyer-pw-${runId}`;
const buyerEmail = `e2e-buyer-pw-${runId}@example.com`;
const sessionId = `e2e-sess-pw-${runId}`;
const sessionToken = `e2e-tok-pw-${runId}`;
const TIER_MARKUP = 20;

let signedCookieValue = '';
let productSlug = '';
let expectedUnitPriceFormatted = '';

function signBetterAuthToken(value: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(value).digest('base64');
  return `${value}.${encodeURIComponent(sig)}`;
}

test.describe.serial('Authenticated Buyer Portal Flow', () => {
  test.beforeAll(async () => {
    const secret = process.env.BETTER_AUTH_SECRET ?? 'ci-build-secret-dummy-padding-32-chars-long';
    signedCookieValue = signBetterAuthToken(sessionToken, secret);

    const [prod] = await db
      .select({
        id: products.id,
        basePriceAmount: products.basePriceAmount,
        slug: productTranslations.slug,
      })
      .from(products)
      .innerJoin(
        productTranslations,
        and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, 'en')),
      )
      .where(
        and(
          eq(products.status, 'published'),
          isNull(products.deletedAt),
          gt(products.basePriceAmount, '0'),
        ),
      )
      .limit(1);

    expect(prod, 'expected at least one published product with a base price').toBeTruthy();
    productSlug = prod!.slug;
    const computedUnitPrice =
      Math.round((Number(prod!.basePriceAmount) * (1 + TIER_MARKUP / 100) + Number.EPSILON) * 100) /
      100;
    expectedUnitPriceFormatted = computedUnitPrice.toFixed(2);

    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.batch([
      db.insert(authUser).values({
        id: buyerUserId,
        name: 'E2E Buyer Tester',
        email: buyerEmail,
        emailVerified: true,
        userType: 'buyer',
        firstName: 'E2E',
        lastName: 'Buyer',
        contactName: 'E2E Buyer',
        companyName: 'E2E Industrial GmbH',
        phone: '+49 170 0000000',
        country: 'DE',
        city: 'Hamburg',
        verified: true,
        preferredLocale: 'en',
        createdAt: nowIso,
        updatedAt: nowIso,
      }),
      db.insert(buyerProfiles).values({
        authUserId: buyerUserId,
        tierMarkupPercent: String(TIER_MARKUP),
        createdAt: nowIso,
        updatedAt: nowIso,
      }),
      db.insert(authSession).values({
        id: sessionId,
        userId: buyerUserId,
        token: sessionToken,
        expiresAt: expiresIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      }),
    ]);
  });

  test.afterAll(async () => {
    const orders = await db
      .select({ id: orderRequests.id })
      .from(orderRequests)
      .where(like(orderRequests.buyerId, 'e2e-buyer-pw-%'));
    for (const o of orders) {
      await db.delete(orderRequestItems).where(eq(orderRequestItems.orderRequestId, o.id));
    }
    await db.delete(orderRequests).where(like(orderRequests.buyerId, 'e2e-buyer-pw-%'));
    await db
      .delete(profileEditRequests)
      .where(like(profileEditRequests.authUserId, 'e2e-buyer-pw-%'));
    await db.delete(buyerProfiles).where(like(buyerProfiles.authUserId, 'e2e-buyer-pw-%'));
    await db.delete(authSession).where(like(authSession.userId, 'e2e-buyer-pw-%'));
    await db.delete(authUser).where(like(authUser.id, 'e2e-buyer-pw-%'));
  });

  test('buyer sees personalized unitPrice without base_price/tier_markup leaks, submits RFQ, and accepts confirmed quote', async ({
    page,
    context,
    baseURL,
  }) => {
    const targetUrl = new URL(baseURL ?? 'http://localhost:3000');
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: signedCookieValue,
        domain: targetUrl.hostname,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    const buyerPayloads: string[] = [];
    page.on('response', async (res) => {
      if (res.url().includes('/api/buyer/')) {
        try {
          buyerPayloads.push(await res.text());
        } catch {
          // Ignore aborted responses
        }
      }
    });

    await page.goto(`/en/product/${productSlug}`);

    await expect(page.getByText(new RegExp(`\\$${expectedUnitPriceFormatted}`))).toBeVisible({
      timeout: 15_000,
    });

    const html = await page.content();
    for (const key of FORBIDDEN_BUYER_KEYS) {
      expect(html, `HTML leaked forbidden key ${key}`).not.toContain(key);
      for (const payload of buyerPayloads) {
        expect(payload, `API payload leaked forbidden key ${key}`).not.toContain(key);
      }
    }

    await page.getByRole('button', { name: /Add to request/i }).click();
    await page.goto('/en/cart');

    const submitBtn = page.getByRole('button', { name: /Submit order request/i });
    await expect(submitBtn).toBeVisible({ timeout: 15_000 });
    await submitBtn.click();
    const refLocator = page.getByText(/O-\d{4}-\d{4}/);
    await expect(refLocator).toBeVisible({ timeout: 15_000 });

    const refText = await refLocator.innerText();
    const match = refText.match(/O-\d{4}-\d{4}/);
    expect(match).toBeTruthy();
    const orderNumber = match![0];

    await page
      .locator('main')
      .getByRole('link', { name: /My orders/i })
      .click();
    await page.waitForURL(new RegExp(`/en/orders/${orderNumber}`), { timeout: 15_000 });

    const [orderRow] = await db
      .select({ id: orderRequests.id })
      .from(orderRequests)
      .where(eq(orderRequests.orderNumber, orderNumber))
      .limit(1);
    expect(orderRow).toBeTruthy();

    await confirmAdminOrder(orderRow!.id, { markupPercent: TIER_MARKUP }, buyerUserId);

    await page.reload();

    const acceptBtn = page.getByRole('button', { name: /Accept order/i });
    await expect(acceptBtn).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /Notifications/i }).click();
    await expect(page.getByText(new RegExp(`Order ${orderNumber} confirmed`))).toBeVisible({
      timeout: 10_000,
    });

    await acceptBtn.click();

    await expect(acceptBtn).toBeHidden({
      timeout: 10_000,
    });
  });

  test('buyer submits and withdraws a profile edit request on /en/account', async ({
    page,
    context,
    baseURL,
  }) => {
    const targetUrl = new URL(baseURL ?? 'http://localhost:3000');
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: signedCookieValue,
        domain: targetUrl.hostname,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/en/account');
    await expect(page.getByText('E2E Industrial GmbH')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /Edit information/i }).click();
    await page.locator('#acc-company').fill('E2E Updated Logistics GmbH');
    await page.getByRole('button', { name: /Send edit request/i }).click();

    await expect(page.getByText(/Edit request pending/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /Cancel request/i }).click();
    await expect(page.getByText(/Edit request pending/i)).toBeHidden({ timeout: 10_000 });
  });
});
