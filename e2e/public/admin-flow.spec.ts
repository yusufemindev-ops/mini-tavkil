import { createHmac } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { expect, test } from '@playwright/test';

loadEnv({ path: ['.env.local', '.env'] });
import { and, eq, isNull, like } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  authSession,
  authUser,
  authUserRoles,
  categories,
  categoryTranslations,
  products,
  productTranslations,
  roles,
  suppliers,
  supplierTranslations,
} from '@/lib/db/schema';
import { OWNER_ROLE, ROLE_LABELS } from '@/lib/permissions/catalog';
import { assignRole, roleCodeFromIdOrCode } from '@/lib/services/rbac';
import { inviteMember, listInvites, revokeInvite } from '@/lib/services/team';

/**
 * TESTING.md §2 — Authenticated Admin E2E Flow:
 * 1. Unprovisioned / non-allowlisted user is rejected (`401` on `/api/admin/me` and
 *    redirected to `/admin/login`), while allowlisted Owner accesses `/admin/dashboard`.
 * 2. Owner creates a custom RBAC role in `/admin/users/roles`, assigns it to a staff
 *    member, verifies permission gating (`200` on permitted routes, `403` on restricted
 *    API routes + redirect from `/admin/users` and `/admin/settings`), and deletes the role.
 * 3. Owner edits a published product's `base_price` via `/api/admin/products/:id` and
 *    verifies the anonymous public product page (`/en/product/[slug]`) leaks zero
 *    `base_price`, `tier_markup_percent`, or supplier identity.
 */

const runId = Date.now();
const strangerUserId = `e2e-admin-stranger-${runId}`;
const strangerEmail = `e2e-admin-stranger-${runId}@example.com`;
const strangerSessionId = `e2e-sess-stranger-${runId}`;
const strangerToken = `e2e-tok-stranger-${runId}`;

const ownerUserId = `e2e-admin-owner-${runId}`;
const ownerEmail = `e2e-admin-owner-${runId}@example.com`;
const ownerSessionId = `e2e-sess-owner-${runId}`;
const ownerToken = `e2e-tok-owner-${runId}`;

const staffUserId = `e2e-admin-staff-${runId}`;
const staffEmail = `e2e-admin-staff-${runId}@example.com`;
const staffSessionId = `e2e-sess-staff-${runId}`;
const staffToken = `e2e-tok-staff-${runId}`;

const customRoleName = `E2E Ops Role ${runId}`;
const secretSupplierName = `E2E Confidential Supplier ${runId}`;
const secretBasePrice = '789.4500';
const secretBasePriceShort = '789.45';
const testProductSlug = `e2e-admin-pump-${runId}`;
const testProductSku = `E2E-ADM-${runId}`;

let strangerCookie = '';
let ownerCookie = '';
let staffCookie = '';
let testSupplierId = '';
let testProductId = '';

function signBetterAuthToken(value: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(value).digest('base64');
  return `${value}.${encodeURIComponent(sig)}`;
}

test.describe.serial('Authenticated Admin Panel & Custom RBAC Flow', () => {
  test.beforeAll(async () => {
    const secret = process.env.BETTER_AUTH_SECRET ?? 'ci-build-secret-dummy-padding-32-chars-long';
    strangerCookie = signBetterAuthToken(strangerToken, secret);
    ownerCookie = signBetterAuthToken(ownerToken, secret);
    staffCookie = signBetterAuthToken(staffToken, secret);

    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    for (const [code, label] of Object.entries(ROLE_LABELS)) {
      await db
        .insert(roles)
        .values({
          code,
          name: label,
          isSystem: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .onConflictDoNothing();
    }

    const [ownerRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.code, OWNER_ROLE))
      .limit(1);
    expect(ownerRole, 'expected super_admin role in database').toBeTruthy();

    await inviteMember(
      {
        email: ownerEmail,
        firstName: 'E2E',
        lastName: 'Owner',
        roleId: OWNER_ROLE,
      },
      'system',
      roleCodeFromIdOrCode,
    );
    await inviteMember(
      {
        email: staffEmail,
        firstName: 'E2E',
        lastName: 'Staff',
        roleId: 'member',
      },
      'system',
      roleCodeFromIdOrCode,
    );

    await db.batch([
      db.insert(authUser).values([
        {
          id: strangerUserId,
          name: 'E2E Stranger',
          email: strangerEmail,
          emailVerified: true,
          userType: 'buyer',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: ownerUserId,
          name: 'E2E Owner',
          email: ownerEmail,
          emailVerified: true,
          userType: 'admin',
          lastSeenAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: staffUserId,
          name: 'E2E Staff',
          email: staffEmail,
          emailVerified: true,
          userType: 'admin',
          lastSeenAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      ]),
      db.insert(authUserRoles).values({
        authUserId: ownerUserId,
        roleId: ownerRole!.id,
      }),
      db.insert(authSession).values([
        {
          id: strangerSessionId,
          userId: strangerUserId,
          token: strangerToken,
          expiresAt: expiresIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: ownerSessionId,
          userId: ownerUserId,
          token: ownerToken,
          expiresAt: expiresIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: staffSessionId,
          userId: staffUserId,
          token: staffToken,
          expiresAt: expiresIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      ]),
    ]);

    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .innerJoin(
        categoryTranslations,
        and(
          eq(categoryTranslations.categoryId, categories.id),
          eq(categoryTranslations.locale, 'en'),
        ),
      )
      .where(and(eq(categories.status, 'published'), isNull(categories.deletedAt)))
      .limit(1);

    const [sup] = await db
      .insert(suppliers)
      .values({
        countryCode: 'TR',
        contactEmailInternal: `e2e-supplier-${runId}@confidential.example`,
        status: 'published',
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .returning({ id: suppliers.id });
    testSupplierId = sup.id;

    await db.insert(supplierTranslations).values({
      supplierId: testSupplierId,
      locale: 'en',
      name: secretSupplierName,
      slug: `e2e-sup-${runId}`,
      isComplete: true,
    });

    const [prod] = await db
      .insert(products)
      .values({
        supplierId: testSupplierId,
        categoryId: cat?.id ?? null,
        sku: testProductSku,
        moq: 5,
        unit: 'piece',
        basePriceAmount: '500.0000',
        basePriceCurrency: 'USD',
        status: 'published',
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .returning({ id: products.id });
    testProductId = prod.id;

    await db.insert(productTranslations).values([
      {
        productId: testProductId,
        locale: 'en',
        name: `E2E Hydraulic Valve ${runId}`,
        slug: testProductSlug,
        description: 'High-pressure directional control valve for E2E verification.',
        isComplete: true,
      },
      {
        productId: testProductId,
        locale: 'tr',
        name: `E2E Hidrolik Valf ${runId}`,
        slug: `${testProductSlug}-tr`,
        description: 'E2E doğrulama için yüksek basınçlı yön kontrol valfi.',
        isComplete: true,
      },
      {
        productId: testProductId,
        locale: 'ar',
        name: `صمام هيدروليكي ${runId}`,
        slug: `${testProductSlug}-ar`,
        description: 'صمام تحكم اتجاهي عالي الضغط للتحقق.',
        isComplete: true,
      },
    ]);
  });

  test.afterAll(async () => {
    const allInvites = await listInvites().catch(() => []);
    for (const inv of allInvites) {
      if (inv.email.startsWith('e2e-admin-')) {
        await revokeInvite(inv.email, 'system').catch(() => undefined);
      }
    }

    const staleProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(like(products.sku, 'E2E-ADM-%'));
    for (const p of staleProducts) {
      await db.delete(productTranslations).where(eq(productTranslations.productId, p.id));
      await db.delete(products).where(eq(products.id, p.id));
    }

    const staleSuppliers = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(like(suppliers.contactEmailInternal, 'e2e-supplier-%@confidential.example'));
    for (const s of staleSuppliers) {
      await db.delete(supplierTranslations).where(eq(supplierTranslations.supplierId, s.id));
      await db.delete(suppliers).where(eq(suppliers.id, s.id));
    }

    await db.delete(roles).where(like(roles.name, `E2E Ops Role %`));
    await db.delete(authSession).where(like(authSession.userId, 'e2e-admin-%'));
    await db.delete(authUserRoles).where(like(authUserRoles.authUserId, 'e2e-admin-%'));
    await db.delete(authUser).where(like(authUser.id, 'e2e-admin-%'));
  });

  test('1. returns 404 on storefront /admin, rejects non-allowlisted user on /api/admin/me, and loads standalone admin dashboard for Owner', async ({
    page,
    baseURL,
  }) => {
    const targetBase = baseURL ?? 'http://localhost:3000';
    const adminBase = process.env.E2E_ADMIN_URL ?? 'http://localhost:5173';
    const cookieDomain = new URL(targetBase).hostname;

    const storefrontAdminRes = await page.goto(`${targetBase}/admin`);
    expect(storefrontAdminRes?.status()).toBe(404);

    await page.context().addCookies([
      {
        name: 'better-auth.session_token',
        value: strangerCookie,
        domain: cookieDomain,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    const meRes = await page.request.get('/api/admin/me');
    expect(meRes.status()).toBe(401);

    await page.goto(`${adminBase}/dashboard`);
    await expect(page.getByRole('heading', { name: /admin sign in/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: 'better-auth.session_token',
        value: ownerCookie,
        domain: cookieDomain,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    const ownerMeRes = await page.request.get('/api/admin/me');
    expect(ownerMeRes.status()).toBe(200);

    await page.goto(`${adminBase}/dashboard`);
    await expect(page.getByRole('heading', { name: /^dashboard$/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('2. Owner creates custom RBAC role, verifies permission gating for restricted staff, and deletes role', async ({
    page,
    browser,
    baseURL,
  }) => {
    const targetBase = baseURL ?? 'http://localhost:3000';
    const adminBase = process.env.E2E_ADMIN_URL ?? 'http://localhost:5173';
    const cookieDomain = new URL(targetBase).hostname;

    await page.context().addCookies([
      {
        name: 'better-auth.session_token',
        value: ownerCookie,
        domain: cookieDomain,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    await page.goto(`${adminBase}/users/roles`);
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /create role/i }).click();
    await expect(page.getByRole('heading', { name: 'Create custom role' })).toBeVisible();

    await page.getByLabel(/role name/i).fill(customRoleName);
    await page.getByLabel(/description/i).fill('E2E custom role with products:view only');
    await page.getByRole('checkbox', { name: /view products/i }).check();
    await page.getByRole('button', { name: /^create role$/i }).click();

    const customRow = page.locator('tr', { hasText: customRoleName });
    await expect(customRow).toBeVisible({ timeout: 15_000 });
    await expect(customRow).toContainText('Custom');

    const rolesRes = await page.request.get('/api/admin/roles');
    expect(rolesRes.ok()).toBe(true);
    const rolesData = (await rolesRes.json()) as {
      data: { id: string; code: string; name: string }[];
    };
    const createdRole = rolesData.data.find((r) => r.name === customRoleName);
    expect(createdRole).toBeTruthy();

    await assignRole(staffUserId, createdRole!.code);

    const staffContext = await browser.newContext({ baseURL: targetBase });
    await staffContext.addCookies([
      {
        name: 'better-auth.session_token',
        value: staffCookie,
        domain: cookieDomain,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    const staffPage = await staffContext.newPage();

    const okProducts = await staffPage.request.get('/api/admin/products');
    expect(okProducts.status()).toBe(200);

    const forbiddenUsers = await staffPage.request.get('/api/admin/users');
    expect(forbiddenUsers.status()).toBe(403);

    const forbiddenSettings = await staffPage.request.get('/api/admin/settings');
    expect(forbiddenSettings.status()).toBe(403);

    await staffPage.goto(`${adminBase}/users`);
    await expect(staffPage).toHaveURL(/\/dashboard/);

    await staffContext.close();

    await db.delete(authUserRoles).where(eq(authUserRoles.authUserId, staffUserId));
    await page.reload();
    await expect(customRow).toBeVisible({ timeout: 15_000 });

    await customRow.getByRole('button', { name: /^edit$/i }).click();
    await page.getByRole('button', { name: /delete role/i }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: /delete role/i })
      .click();

    await expect(page.locator('tr', { hasText: customRoleName })).toHaveCount(0);
  });

  test('3. Admin edits product base_price and anonymous storefront leaks zero price or supplier data', async ({
    page,
    browser,
    baseURL,
  }) => {
    const targetBase = baseURL ?? 'http://localhost:3000';
    const cookieDomain = new URL(targetBase).hostname;

    await page.context().addCookies([
      {
        name: 'better-auth.session_token',
        value: ownerCookie,
        domain: cookieDomain,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    const patchRes = await page.request.patch(`/api/admin/products/${testProductId}`, {
      data: {
        basePriceAmount: Number(secretBasePriceShort),
        basePriceCurrency: 'USD',
      },
    });
    expect(patchRes.status()).toBe(200);

    const anonContext = await browser.newContext({ baseURL: targetBase });
    const anonPage = await anonContext.newPage();

    const capturedPayloads: string[] = [];
    anonPage.on('response', async (response) => {
      const ct = response.headers()['content-type'] ?? '';
      if (ct.includes('json') || ct.includes('text')) {
        const body = await response.text().catch(() => '');
        capturedPayloads.push(body);
      }
    });

    const res = await anonPage.goto(`/en/product/${testProductSlug}`);
    expect(res?.status()).toBe(200);
    await expect(
      anonPage.getByRole('heading', { name: `E2E Hydraulic Valve ${runId}` }),
    ).toBeVisible({ timeout: 15_000 });

    const html = await anonPage.content();
    const combined = [html, ...capturedPayloads].join('\n');

    expect(combined).not.toContain(secretBasePriceShort);
    expect(combined).not.toContain(secretBasePrice);
    expect(combined).not.toContain(secretSupplierName);
    expect(combined).not.toContain('basePriceAmount');
    expect(combined).not.toContain('base_price_amount');
    expect(combined).not.toContain('tierMarkupPercent');
    expect(combined).not.toContain('tier_markup_percent');

    await anonContext.close();
  });
});
