import { Hono } from 'hono';
import { requireAdmin } from '@/lib/auth-guard';
import type { AppEnv } from '@/server/factory';

interface RouteMeta {
  summary: string;
  permission?: string;
  queryParams?: { name: string; example: string; description: string }[];
  sampleBody?: unknown;
}

const ROUTE_META: Record<string, RouteMeta> = {
  'GET /api/health': {
    summary: 'Database liveness check and published catalog counts',
  },
  'GET /api/auth/*': {
    summary: 'Better Auth OAuth & session GET handler (e.g. /api/auth/get-session)',
  },
  'POST /api/auth/*': {
    summary: 'Better Auth OAuth & session POST handler (e.g. /api/auth/sign-out)',
  },
  'GET /api/admin/me': {
    summary: 'Current authenticated admin profile, roles, and resolved permissions',
  },
  'GET /api/admin/dashboard': {
    summary: 'Operator dashboard KPIs, FX status, and catalog publish readiness summary',
    permission: 'products:view',
  },
  'GET /api/admin/categories': {
    summary: 'List all categories (draft & published) with translations',
    permission: 'categories:view',
  },
  'POST /api/admin/categories': {
    summary: 'Create a new category (starts as draft)',
    permission: 'categories:create',
    sampleBody: {
      parentId: null,
      translations: [
        { locale: 'en', name: 'Industrial Valves', slug: 'industrial-valves', isComplete: true },
      ],
    },
  },
  'POST /api/admin/categories/reorder': {
    summary: 'Atomically reorder sibling categories by ID array',
    permission: 'categories:edit',
    sampleBody: {
      ids: ['00000000-0000-0000-0000-000000000000'],
    },
  },
  'GET /api/admin/categories/:id': {
    summary: 'Get a single category by UUID with all translations',
    permission: 'categories:view',
  },
  'PATCH /api/admin/categories/:id': {
    summary: 'Update category fields, sortStrategy, or translations',
    permission: 'categories:edit',
    sampleBody: {
      sortStrategy: 'manual',
      translations: [
        { locale: 'en', name: 'Industrial Valves', slug: 'industrial-valves', isComplete: true },
      ],
    },
  },
  'DELETE /api/admin/categories/:id': {
    summary: 'Soft-delete a category by UUID',
    permission: 'categories:delete',
  },
  'POST /api/admin/categories/:id/publish': {
    summary: 'Run publish readiness gate and publish category + ping IndexNow',
    permission: 'categories:publish',
  },
  'POST /api/admin/categories/:id/unpublish': {
    summary: 'Revert published category back to draft',
    permission: 'categories:publish',
  },
  'GET /api/admin/products': {
    summary: 'Paginated admin product list with filtering and sorting',
    permission: 'products:view',
    queryParams: [
      { name: 'page', example: '1', description: 'Page number (1-indexed)' },
      { name: 'pageSize', example: '20', description: 'Items per page (max 200)' },
      { name: 'status', example: '', description: 'Filter by draft | published | archived' },
      { name: 'search', example: '', description: 'Search SKU or localized name' },
      {
        name: 'sort',
        example: 'recent',
        description: 'recent | oldest | sku | price_asc | price_desc',
      },
    ],
  },
  'POST /api/admin/products': {
    summary: 'Create a new product with translations, images, options, and variants',
    permission: 'products:create',
    sampleBody: {
      sku: 'SKU-001',
      moq: 5,
      translations: [
        {
          locale: 'en',
          name: 'Example Product',
          slug: 'example-product',
          description: 'Product description',
          isComplete: true,
        },
      ],
    },
  },
  'GET /api/admin/products/counts': {
    summary: 'Product status counts (all, published, draft, archived)',
    permission: 'products:view',
  },
  'POST /api/admin/products/reorder': {
    summary: 'Atomically reorder published products inside a category',
    permission: 'products:edit',
    sampleBody: {
      categoryId: '00000000-0000-0000-0000-000000000000',
      ids: ['00000000-0000-0000-0000-000000000000'],
    },
  },
  'GET /api/admin/products/:id': {
    summary: 'Get full admin product details',
    permission: 'products:view',
  },
  'PATCH /api/admin/products/:id': {
    summary: 'Update product fields, pricing, translations, images, or variants',
    permission: 'products:edit',
    sampleBody: {
      moq: 10,
    },
  },
  'DELETE /api/admin/products/:id': {
    summary: 'Soft-delete a product by UUID',
    permission: 'products:delete',
  },
  'POST /api/admin/products/:id/publish': {
    summary: 'Run publish readiness gate and publish product + ping IndexNow',
    permission: 'products:publish',
  },
  'POST /api/admin/products/:id/unpublish': {
    summary: 'Revert published product back to draft',
    permission: 'products:publish',
  },
  'POST /api/admin/products/:id/archive': {
    summary: 'Archive product and remove from public catalog',
    permission: 'products:publish',
  },
  'POST /api/admin/products/:id/restore': {
    summary: 'Restore archived product back to draft',
    permission: 'products:publish',
  },
  'GET /api/admin/suppliers': {
    summary: 'List all suppliers with translations (admin-only confidential view)',
    permission: 'suppliers:view',
  },
  'POST /api/admin/suppliers': {
    summary: 'Create a new supplier (starts as draft)',
    permission: 'suppliers:create',
    sampleBody: {
      countryCode: 'TR',
      translations: [
        {
          locale: 'en',
          name: 'Anatolia Hydraulics',
          slug: 'anatolia-hydraulics',
          isComplete: true,
        },
      ],
    },
  },
  'GET /api/admin/suppliers/:id': {
    summary: 'Get a single supplier by UUID',
    permission: 'suppliers:view',
  },
  'PATCH /api/admin/suppliers/:id': {
    summary: 'Update supplier countryCode, contact details, or translations',
    permission: 'suppliers:edit',
    sampleBody: {
      countryCode: 'TR',
    },
  },
  'DELETE /api/admin/suppliers/:id': {
    summary: 'Soft-delete a supplier by UUID',
    permission: 'suppliers:delete',
  },
  'POST /api/admin/suppliers/:id/publish': {
    summary: 'Publish supplier record',
    permission: 'suppliers:publish',
  },
  'POST /api/admin/suppliers/:id/unpublish': {
    summary: 'Unpublish supplier record back to draft',
    permission: 'suppliers:publish',
  },
  'GET /api/admin/currencies': {
    summary: 'List all supported currencies and current exchange rates',
    permission: 'currencies:view',
  },
  'PATCH /api/admin/currencies/:code': {
    summary: 'Update currency active status or manual exchange rate',
    permission: 'currencies:edit',
    sampleBody: {
      isActive: true,
    },
  },
  'GET /api/admin/fx/runs': {
    summary: 'List recent FX rate synchronization runs',
    permission: 'currencies:view',
  },
  'POST /api/admin/fx/refresh': {
    summary: 'Trigger an immediate live FX rate refresh',
    permission: 'currencies:refresh_fx',
  },
  'GET /api/admin/settings': {
    summary: 'Get global platform settings (siteName, WhatsApp, emails, socials)',
    permission: 'settings:view',
  },
  'PATCH /api/admin/settings': {
    summary: 'Update global platform settings',
    permission: 'settings:edit',
    sampleBody: {
      siteName: 'Tavkil',
    },
  },
  'GET /api/admin/users': {
    summary: 'List all admin team members and invited users',
    permission: 'users:view',
  },
  'POST /api/admin/users': {
    summary: 'Invite a new admin user with an assigned role',
    permission: 'users:assign_role',
    sampleBody: {
      email: 'colleague@tavkil.com',
      roleId: 'catalog_manager',
    },
  },
  'PATCH /api/admin/users/:id': {
    summary: 'Update user profile details (or self profile)',
    permission: 'self_profile:edit / users:edit',
    sampleBody: {
      name: 'Updated Name',
    },
  },
  'PATCH /api/admin/users/:id/role': {
    summary: 'Assign or change a user role',
    permission: 'users:assign_role',
    sampleBody: {
      roleId: 'catalog_manager',
    },
  },
  'DELETE /api/admin/users/:id/role': {
    summary: 'Revoke a user role assignment',
    permission: 'users:assign_role',
  },
  'POST /api/admin/users/:id/suspend': {
    summary: 'Suspend an admin user account and revoke active sessions',
    permission: 'users:edit',
  },
  'POST /api/admin/users/:id/reactivate': {
    summary: 'Reactivate a suspended admin user account',
    permission: 'users:edit',
  },
  'GET /api/admin/roles': {
    summary: 'List all RBAC roles with their granted permissions',
    permission: 'users:view',
  },
  'GET /api/admin/permissions/catalog': {
    summary: 'List the complete RBAC permission catalog grouped by domain',
    permission: 'users:view',
  },
  'POST /api/admin/media': {
    summary: 'Upload an image file (multipart/form-data) to Cloudflare R2',
    permission: 'media:upload',
  },
  'GET /api/admin/audit-logs': {
    summary: 'Paginated admin activity log with resource type and search filters',
    permission: 'audit_log:view',
    queryParams: [
      { name: 'page', example: '1', description: 'Page number (1-indexed)' },
      { name: 'pageSize', example: '25', description: 'Items per page (max 100)' },
      {
        name: 'resourceType',
        example: '',
        description: 'product | category | supplier | settings | currency | user | media',
      },
      { name: 'search', example: '', description: 'Filter by actor, action, target, or summary' },
    ],
  },
};

function tagForPath(path: string): string {
  if (path === '/api/health' || path.startsWith('/api/docs') || path.startsWith('/api/openapi')) {
    return 'System & Health';
  }
  if (path.startsWith('/api/auth')) return 'Authentication';
  if (path === '/api/admin/me' || path === '/api/admin/dashboard')
    return 'Admin · Dashboard & Session';
  if (path.startsWith('/api/admin/categories')) return 'Admin · Categories';
  if (path.startsWith('/api/admin/products')) return 'Admin · Products';
  if (path.startsWith('/api/admin/suppliers')) return 'Admin · Suppliers';
  if (path.startsWith('/api/admin/currencies') || path.startsWith('/api/admin/fx')) {
    return 'Admin · Currencies & FX';
  }
  if (path.startsWith('/api/admin/settings')) return 'Admin · Settings';
  if (
    path.startsWith('/api/admin/users') ||
    path.startsWith('/api/admin/roles') ||
    path.startsWith('/api/admin/permissions')
  ) {
    return 'Admin · Users & RBAC';
  }
  if (path.startsWith('/api/admin/media')) return 'Admin · Media (R2)';
  if (path.startsWith('/api/admin/audit-logs')) return 'Admin · Audit Log';
  return 'Other';
}

export function createDocsRoutes(rootApp: Hono<AppEnv>) {
  const docs = new Hono<AppEnv>();

  docs.use('*', async (c, next) => {
    if (process.env.NODE_ENV === 'production') {
      await requireAdmin(c.req.raw);
    }
    await next();
  });

  docs.get('/openapi.json', (c) => {
    const seen = new Set<string>();
    const paths: Record<string, Record<string, unknown>> = {};
    const routeList: {
      method: string;
      path: string;
      tag: string;
      summary: string;
      permission: string | null;
      pathParams: string[];
      queryParams: { name: string; example: string; description: string }[];
      sampleBody: unknown;
    }[] = [];

    for (const r of rootApp.routes) {
      if (r.method === 'ALL' || r.path === '/*' || r.path === '/api/*') continue;
      if (r.path === '/api/docs' || r.path === '/api/openapi.json') continue;
      const key = `${r.method} ${r.path}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const meta = ROUTE_META[key] ?? { summary: `${r.method} ${r.path}` };
      const tag = tagForPath(r.path);
      const pathParams = [...r.path.matchAll(/:([a-zA-Z0-9_]+)/g)].map((m) => m[1]);
      const openApiPath = r.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

      routeList.push({
        method: r.method,
        path: r.path,
        tag,
        summary: meta.summary,
        permission: meta.permission ?? null,
        pathParams,
        queryParams: meta.queryParams ?? [],
        sampleBody: meta.sampleBody ?? null,
      });

      paths[openApiPath] ??= {};
      paths[openApiPath][r.method.toLowerCase()] = {
        tags: [tag],
        summary: meta.summary,
        ...(meta.permission ? { description: `Required permission: \`${meta.permission}\`` } : {}),
        parameters: [
          ...pathParams.map((name) => ({
            name,
            in: 'path',
            required: true,
            schema: { type: 'string' },
          })),
          ...(meta.queryParams ?? []).map((q) => ({
            name: q.name,
            in: 'query',
            required: false,
            description: q.description,
            schema: { type: 'string', default: q.example },
          })),
        ],
        responses: {
          '200': { description: 'Success response wrapped in { data }' },
          '401': { description: 'Not authenticated' },
          '403': { description: 'Missing required permission' },
          '422': { description: 'Validation failed' },
        },
      };
    }

    return c.json({
      openapi: '3.1.0',
      info: {
        title: 'Tavkil B2B Wholesale Platform — Hono API',
        version: '1.0.0',
        description: 'Interactive API catalog and live request tester for the Tavkil Hono backend.',
      },
      paths,
      'x-routes': routeList,
    });
  });

  docs.get('/docs', (c) => {
    return c.html(renderDocsHtml());
  });

  return docs;
}

function renderDocsHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tavkil API Docs — Hono</title>
  <style>
    :root {
      --bg: #0b0d11;
      --surface: #12161d;
      --surface-hover: #181d26;
      --border: #232a36;
      --text: #e6edf3;
      --muted: #8b949e;
      --accent: #f97316;
      --get: #3b82f6;
      --post: #10b981;
      --patch: #f59e0b;
      --delete: #ef4444;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      line-height: 1.5;
    }
    .container {
      max-width: 1120px;
      margin: 0 auto;
      padding: 28px 24px 64px;
    }
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .flame {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(249, 115, 22, 0.14);
      border: 1px solid rgba(249, 115, 22, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .subtitle {
      font-size: 13px;
      color: var(--muted);
      margin-top: 2px;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .auth-pill {
      font-size: 12px;
      font-family: var(--mono);
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface);
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--muted);
    }
    .dot.ok { background: var(--post); }
    .dot.warn { background: var(--patch); }
    .btn-link {
      font-size: 12px;
      font-family: var(--mono);
      color: var(--text);
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--surface);
    }
    .btn-link:hover { background: var(--surface-hover); }
    .toolbar {
      display: flex;
      gap: 10px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .search-input {
      flex: 1;
      min-width: 240px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-family: var(--mono);
    }
    .filter-group {
      display: flex;
      gap: 6px;
    }
    .filter-btn {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--muted);
      padding: 7px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-family: var(--mono);
      font-weight: 600;
      cursor: pointer;
    }
    .filter-btn.active {
      color: var(--text);
      border-color: var(--accent);
      background: rgba(249, 115, 22, 0.12);
    }
    .group {
      margin-bottom: 24px;
    }
    .group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      padding: 6px 2px;
      margin-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }
    .group-count {
      font-size: 11px;
      font-family: var(--mono);
      color: var(--muted);
    }
    .route-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      margin-bottom: 8px;
      overflow: hidden;
    }
    .route-summary {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      cursor: pointer;
      user-select: none;
    }
    .route-summary:hover { background: var(--surface-hover); }
    .method {
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 700;
      min-width: 62px;
      text-align: center;
      padding: 3px 8px;
      border-radius: 5px;
      text-transform: uppercase;
    }
    .method-GET { background: rgba(59, 130, 246, 0.16); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.35); }
    .method-POST { background: rgba(16, 185, 129, 0.16); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); }
    .method-PATCH { background: rgba(245, 158, 11, 0.16); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); }
    .method-DELETE { background: rgba(239, 68, 68, 0.16); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35); }
    .path {
      font-family: var(--mono);
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }
    .desc {
      font-size: 13px;
      color: var(--muted);
      flex: 1;
    }
    .perm {
      font-family: var(--mono);
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--muted);
    }
    .route-body {
      display: none;
      padding: 14px;
      border-top: 1px solid var(--border);
      background: #0e1218;
    }
    .route-card.open .route-body { display: block; }
    .field-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px;
      margin-bottom: 12px;
    }
    label {
      display: block;
      font-size: 11px;
      font-family: var(--mono);
      color: var(--muted);
      margin-bottom: 4px;
    }
    input.param-input, textarea.body-input {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 7px 10px;
      border-radius: 6px;
      font-family: var(--mono);
      font-size: 12px;
    }
    textarea.body-input {
      min-height: 110px;
      resize: vertical;
      margin-bottom: 10px;
    }
    .exec-bar {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .exec-btn {
      background: var(--accent);
      color: #fff;
      border: none;
      padding: 7px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .exec-btn:hover { opacity: 0.92; }
    .status-meta {
      font-family: var(--mono);
      font-size: 12px;
      color: var(--muted);
    }
    pre.res-box {
      margin: 12px 0 0;
      padding: 12px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-family: var(--mono);
      font-size: 12px;
      overflow-x: auto;
      max-height: 360px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="flame">🔥</div>
        <div>
          <h1>Tavkil B2B Wholesale Platform — Hono API Explorer</h1>
          <div class="subtitle" id="route-totals">Loading OpenAPI specification...</div>
        </div>
      </div>
      <div class="header-right">
        <div class="auth-pill" id="auth-status">
          <span class="dot" id="auth-dot"></span>
          <span id="auth-text">Checking session...</span>
        </div>
        <a class="btn-link" href="/api/openapi.json" target="_blank" rel="noopener">OpenAPI 3.1 JSON</a>
      </div>
    </header>

    <div class="toolbar">
      <input
        type="search"
        id="search"
        class="search-input"
        placeholder="Filter routes by path, summary, or permission (e.g. products, categories:publish)..."
      />
      <div class="filter-group" id="method-filters">
        <button class="filter-btn active" data-method="ALL">ALL</button>
        <button class="filter-btn" data-method="GET">GET</button>
        <button class="filter-btn" data-method="POST">POST</button>
        <button class="filter-btn" data-method="PATCH">PATCH</button>
        <button class="filter-btn" data-method="DELETE">DELETE</button>
      </div>
    </div>

    <main id="routes-root"></main>
  </div>

  <script>
    let allRoutes = [];
    let activeMethod = 'ALL';
    let searchQuery = '';

    async function checkSession() {
      const dot = document.getElementById('auth-dot');
      const text = document.getElementById('auth-text');
      try {
        const res = await fetch('/api/admin/me', { credentials: 'include' });
        if (res.ok) {
          const { data } = await res.json();
          dot.className = 'dot ok';
          const role = data.assignedRoles?.[0]?.code || 'admin';
          text.textContent = data.email + ' (' + role + ')';
        } else {
          dot.className = 'dot warn';
          text.innerHTML = 'Anonymous (401 on /api/admin/*) · <a href="http://localhost:5173/admin/login" style="color:#f97316">Sign in</a>';
        }
      } catch {
        dot.className = 'dot warn';
        text.textContent = 'Session check failed';
      }
    }

    async function loadSpec() {
      const res = await fetch('/api/openapi.json', { credentials: 'include' });
      const spec = await res.json();
      allRoutes = spec['x-routes'] || [];
      document.getElementById('route-totals').textContent =
        allRoutes.length + ' registered Hono endpoints · Base path /api';
      renderRoutes();
    }

    function renderRoutes() {
      const root = document.getElementById('routes-root');
      const q = searchQuery.toLowerCase().trim();
      const filtered = allRoutes.filter((r) => {
        if (activeMethod !== 'ALL' && r.method !== activeMethod) return false;
        if (!q) return true;
        return (
          r.path.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q) ||
          (r.permission && r.permission.toLowerCase().includes(q)) ||
          r.tag.toLowerCase().includes(q)
        );
      });

      const groups = new Map();
      for (const r of filtered) {
        if (!groups.has(r.tag)) groups.set(r.tag, []);
        groups.get(r.tag).push(r);
      }

      root.innerHTML = '';
      for (const [tag, items] of groups.entries()) {
        const groupEl = document.createElement('section');
        groupEl.className = 'group';
        groupEl.innerHTML =
          '<div class="group-header"><span>' +
          tag +
          '</span><span class="group-count">' +
          items.length +
          ' endpoints</span></div>';

        items.forEach((route, idx) => {
          const cardId = (tag + '-' + route.method + '-' + route.path + '-' + idx).replace(/[^a-zA-Z0-9_-]/g, '_');
          const card = document.createElement('div');
          card.className = 'route-card';

          const paramsHtml = [
            ...route.pathParams.map(
              (p) =>
                '<div><label>Path :' +
                p +
                '</label><input class="param-input" data-kind="path" data-name="' +
                p +
                '" placeholder="UUID or code" /></div>',
            ),
            ...route.queryParams.map(
              (qp) =>
                '<div><label>Query ?' +
                qp.name +
                '</label><input class="param-input" data-kind="query" data-name="' +
                qp.name +
                '" value="' +
                qp.example +
                '" placeholder="' +
                qp.description +
                '" /></div>',
            ),
          ].join('');

          const hasBody = ['POST', 'PATCH', 'PUT'].includes(route.method) && route.path !== '/api/admin/media';
          const bodyHtml = hasBody
            ? '<div><label>JSON Request Body</label><textarea class="body-input">' +
              (route.sampleBody ? JSON.stringify(route.sampleBody, null, 2) : '{}') +
              '</textarea></div>'
            : '';

          card.innerHTML =
            '<div class="route-summary">' +
            '<span class="method method-' +
            route.method +
            '">' +
            route.method +
            '</span>' +
            '<span class="path">' +
            route.path +
            '</span>' +
            '<span class="desc">' +
            route.summary +
            '</span>' +
            (route.permission ? '<span class="perm">' + route.permission + '</span>' : '') +
            '</div>' +
            '<div class="route-body">' +
            (paramsHtml ? '<div class="field-grid">' + paramsHtml + '</div>' : '') +
            bodyHtml +
            '<div class="exec-bar">' +
            '<button class="exec-btn" type="button">Execute</button>' +
            '<span class="status-meta" id="meta-' +
            cardId +
            '"></span>' +
            '</div>' +
            '<pre class="res-box" id="res-' +
            cardId +
            '"></pre>' +
            '</div>';

          card.querySelector('.route-summary').addEventListener('click', () => {
            card.classList.toggle('open');
          });

          card.querySelector('.exec-btn').addEventListener('click', async () => {
            const metaEl = document.getElementById('meta-' + cardId);
            const resEl = document.getElementById('res-' + cardId);
            let targetUrl = route.path.replace('/*', '/get-session');

            card.querySelectorAll('input[data-kind="path"]').forEach((inp) => {
              const val = inp.value.trim() || '00000000-0000-0000-0000-000000000000';
              targetUrl = targetUrl.replace(':' + inp.dataset.name, encodeURIComponent(val));
            });

            const qs = new URLSearchParams();
            card.querySelectorAll('input[data-kind="query"]').forEach((inp) => {
              if (inp.value.trim()) qs.set(inp.dataset.name, inp.value.trim());
            });
            if ([...qs.keys()].length > 0) targetUrl += '?' + qs.toString();

            const init = { method: route.method, credentials: 'include', headers: {} };
            const bodyArea = card.querySelector('.body-input');
            if (bodyArea && bodyArea.value.trim()) {
              init.headers['Content-Type'] = 'application/json';
              init.body = bodyArea.value;
            }

            metaEl.textContent = 'Sending ' + route.method + ' ' + targetUrl + '...';
            const t0 = performance.now();
            try {
              const resp = await fetch(targetUrl, init);
              const elapsed = Math.round(performance.now() - t0);
              const text = await resp.text();
              let formatted = text;
              try {
                formatted = JSON.stringify(JSON.parse(text), null, 2);
              } catch {}
              metaEl.textContent = 'HTTP ' + resp.status + ' · ' + elapsed + ' ms';
              resEl.style.display = 'block';
              resEl.textContent = formatted;
            } catch (err) {
              metaEl.textContent = 'Request failed';
              resEl.style.display = 'block';
              resEl.textContent = String(err);
            }
          });

          groupEl.appendChild(card);
        });

        root.appendChild(groupEl);
      }
    }

    document.getElementById('search').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderRoutes();
    });

    document.querySelectorAll('#method-filters .filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#method-filters .filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeMethod = btn.dataset.method;
        renderRoutes();
      });
    });

    checkSession();
    loadSpec();
  </script>
</body>
</html>`;
}
