import { z } from 'zod';
import { isKnownPermission } from '@/lib/permissions/catalog';

/** Accepts either role code or database roleId to resolve target role. */
export const assignRoleSchema = z
  .object({
    role: z.string().trim().min(1).optional(),
    roleId: z.string().trim().min(1).optional(),
  })
  .refine((value) => Boolean(value.role || value.roleId), { message: 'Pick a role.' });

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

const NO_MARKUP_RE = /[<>{}[\]\\]/;

const roleNameSchema = z
  .string()
  .trim()
  .min(2, 'Role name must be at least 2 characters.')
  .max(60, 'Role name must be 60 characters or fewer.')
  .refine((value) => !NO_MARKUP_RE.test(value), {
    message: 'Role name cannot contain special markup characters.',
  });

const rolePermissionsSchema = z
  .array(z.string().trim().min(1))
  .min(1, 'Select at least one permission.')
  .refine((codes) => codes.every((code) => isKnownPermission(code)), {
    message: 'One or more permission codes are not in the permission catalog.',
  });

export const createRoleSchema = z.object({
  name: roleNameSchema,
  description: z
    .string()
    .trim()
    .max(240, 'Description must be 240 characters or fewer.')
    .optional()
    .default(''),
  permissions: rolePermissionsSchema,
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z
  .object({
    name: roleNameSchema.optional(),
    description: z
      .string()
      .trim()
      .max(240, 'Description must be 240 characters or fewer.')
      .nullable()
      .optional(),
    permissions: rolePermissionsSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.permissions !== undefined,
    { message: 'Provide at least one field to update.' },
  );

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

/** Converts a display role name into a normalized snake_case role code. */
export function slugifyRoleCode(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}
