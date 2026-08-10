/**
 * Permission catalog — the single source of truth for every permission.
 *
 * Notation is `domain:action`, one colon, never a dot (CLAUDE.md §6). Changing a
 * permission is a code change here plus `pnpm sync:permissions`; nothing syncs on
 * boot, because Workers have no boot (CLAUDE.md §8).
 *
 * Trimmed from Tavkil's 39 across 12 domains. Gone entirely, because the features
 * are gone: `orders`, `buyers`, `account_requests`, `audit_log`. Also gone:
 * `roles:*` — there is no role editor here, roles are fixed in code, so a
 * permission to create one would guard a page that doesn't exist.
 */

export interface PermissionDef {
  code: string;
  domain: string;
  name: string;
  description: string;
}

export const PERMISSION_CATALOG: readonly PermissionDef[] = [
  // ── Catalog: products ───────────────────────────────────────────────────────
  {
    code: 'products:view',
    domain: 'products',
    name: 'View products',
    description: 'View products',
  },
  {
    code: 'products:create',
    domain: 'products',
    name: 'Create products',
    description: 'Create products',
  },
  {
    code: 'products:edit',
    domain: 'products',
    name: 'Edit products',
    description: 'Update products',
  },
  {
    code: 'products:delete',
    domain: 'products',
    name: 'Delete products',
    description: 'Archive or delete products',
  },
  {
    code: 'products:publish',
    domain: 'products',
    name: 'Publish products',
    description: 'Publish and unpublish products',
  },

  // ── Catalog: categories ─────────────────────────────────────────────────────
  {
    code: 'categories:view',
    domain: 'categories',
    name: 'View categories',
    description: 'View categories',
  },
  {
    code: 'categories:create',
    domain: 'categories',
    name: 'Create categories',
    description: 'Create categories',
  },
  {
    code: 'categories:edit',
    domain: 'categories',
    name: 'Edit categories',
    description: 'Update categories and their order',
  },
  {
    code: 'categories:delete',
    domain: 'categories',
    name: 'Delete categories',
    description: 'Delete categories',
  },
  {
    code: 'categories:publish',
    domain: 'categories',
    name: 'Publish categories',
    description: 'Publish and unpublish categories',
  },

  // ── Catalog: suppliers (admin-only data — never a public surface) ────────────
  {
    code: 'suppliers:view',
    domain: 'suppliers',
    name: 'View suppliers',
    description: 'View suppliers',
  },
  {
    code: 'suppliers:create',
    domain: 'suppliers',
    name: 'Create suppliers',
    description: 'Create suppliers',
  },
  {
    code: 'suppliers:edit',
    domain: 'suppliers',
    name: 'Edit suppliers',
    description: 'Update suppliers',
  },
  {
    code: 'suppliers:delete',
    domain: 'suppliers',
    name: 'Delete suppliers',
    description: 'Delete suppliers',
  },
  {
    code: 'suppliers:publish',
    domain: 'suppliers',
    name: 'Publish suppliers',
    description: 'Publish and unpublish suppliers',
  },

  // ── Media ───────────────────────────────────────────────────────────────────
  { code: 'media:view', domain: 'media', name: 'View media', description: 'Browse uploaded media' },
  { code: 'media:upload', domain: 'media', name: 'Upload media', description: 'Upload images' },
  {
    code: 'media:delete',
    domain: 'media',
    name: 'Delete media',
    description: 'Delete uploaded media',
  },

  // ── Admin users ─────────────────────────────────────────────────────────────
  {
    code: 'users:view',
    domain: 'users',
    name: 'View admin users',
    description: 'View the admin user list',
  },
  {
    code: 'users:edit',
    domain: 'users',
    name: 'Edit admin users',
    description: 'Suspend or reactivate an admin user',
  },
  {
    code: 'users:assign_role',
    domain: 'users',
    name: 'Assign roles',
    description: 'Assign a fixed role to an admin user',
  },

  // ── Settings ────────────────────────────────────────────────────────────────
  {
    code: 'settings:view',
    domain: 'settings',
    name: 'View settings',
    description: 'View site settings',
  },
  {
    code: 'settings:edit',
    domain: 'settings',
    name: 'Edit settings',
    description: 'Update branding, SEO defaults, contact and social settings',
  },

  // ── Currencies + FX ─────────────────────────────────────────────────────────
  {
    code: 'currencies:view',
    domain: 'currencies',
    name: 'View currencies',
    description: 'View currencies and FX runs',
  },
  {
    code: 'currencies:edit',
    domain: 'currencies',
    name: 'Edit currencies',
    description: 'Enable, disable or reorder currencies',
  },
  {
    code: 'currencies:refresh_fx',
    domain: 'currencies',
    name: 'Refresh FX rates',
    description: 'Trigger an on-demand FX rate refresh',
  },

  // ── Self (implicit for every signed-in admin; never granted via a role) ──────
  {
    code: 'self_profile:view',
    domain: 'self_profile',
    name: 'View own profile',
    description: 'View own profile',
  },
  {
    code: 'self_profile:edit',
    domain: 'self_profile',
    name: 'Edit own profile',
    description: 'Update own profile',
  },
];

/**
 * The three fixed roles. `code` matches the rows the Tavkil migration already
 * created, so no migration is needed — only the labels change.
 *
 * `super_admin` (Owner) is deliberately absent from ROLE_GRANTS: it resolves to a
 * wildcard at runtime, so it needs no rows and can never drift out of date as the
 * catalog grows.
 */
export const ROLE_LABELS = {
  super_admin: 'Owner',
  catalog_manager: 'Catalog manager',
  member: 'Viewer',
} as const;

export type RoleCode = keyof typeof ROLE_LABELS;

export const ASSIGNABLE_ROLES = Object.keys(ROLE_LABELS) as RoleCode[];

/** The Owner role. Bypasses grant lookup entirely — see `roleGrants()`. */
export const OWNER_ROLE: RoleCode = 'super_admin';

/**
 * Seed grants for the two non-wildcard roles. Sync is additive (insert-if-missing),
 * so a grant edited in the database is never clobbered by the next sync.
 */
export const ROLE_GRANTS: Readonly<Record<string, readonly string[]>> = {
  catalog_manager: [
    'products:view',
    'products:create',
    'products:edit',
    'products:delete',
    'products:publish',
    'categories:view',
    'categories:create',
    'categories:edit',
    'categories:delete',
    'categories:publish',
    'suppliers:view',
    'suppliers:create',
    'suppliers:edit',
    'suppliers:delete',
    'suppliers:publish',
    'media:view',
    'media:upload',
    'media:delete',
    'settings:view',
    'currencies:view',
  ],
  // Viewer: read-only across the catalogue. Deliberately no settings:edit, no
  // users:*, and no media:upload.
  member: [
    'products:view',
    'categories:view',
    'suppliers:view',
    'media:view',
    'settings:view',
    'currencies:view',
  ],
};

const CATALOG_CODES = new Set(PERMISSION_CATALOG.map((permission) => permission.code));

/** Every permission code a role holds. Owner short-circuits to the full catalog. */
export function roleGrants(roleCode: string): readonly string[] {
  if (roleCode === OWNER_ROLE) return PERMISSION_CATALOG.map((permission) => permission.code);
  return ROLE_GRANTS[roleCode] ?? [];
}

export function isKnownPermission(code: string): boolean {
  return CATALOG_CODES.has(code);
}
