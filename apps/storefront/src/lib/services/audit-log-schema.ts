import { z } from 'zod';

export const AUDIT_RESOURCE_TYPES = [
  'product',
  'category',
  'supplier',
  'buyer',
  'account_request',
  'order',
  'settings',
  'currency',
  'user',
  'media',
] as const;

export type AuditResourceType = (typeof AUDIT_RESOURCE_TYPES)[number];

export const listAuditLogsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  resourceType: z.enum(AUDIT_RESOURCE_TYPES).optional(),
  search: z.string().trim().min(1).optional(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsSchema>;
