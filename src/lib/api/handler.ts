import type { ZodType } from 'zod';
import { requirePermission, type AdminUser } from '@/lib/auth-guard';
import { invalid, toErrorResponse } from '@/lib/api/errors';

/**
 * Wrapper for `/api/admin/*` routes that enforces authentication and RBAC authorization before parsing the request body.
 */

type Ctx<P> = { params: Promise<P> };

type Handler<P, B> = (args: {
  request: Request;
  params: P;
  body: B;
  admin: AdminUser;
}) => Promise<unknown>;

export function adminRoute<P = Record<string, never>>(
  permission: string,
  handler: Handler<P, undefined>,
): (request: Request, ctx: Ctx<P>) => Promise<Response>;

export function adminRoute<P, B>(
  permission: string,
  schema: ZodType<B>,
  handler: Handler<P, B>,
): (request: Request, ctx: Ctx<P>) => Promise<Response>;

export function adminRoute<P, B>(
  permission: string,
  schemaOrHandler: ZodType<B> | Handler<P, undefined>,
  maybeHandler?: Handler<P, B>,
) {
  const schema = maybeHandler ? (schemaOrHandler as ZodType<B>) : undefined;
  const handler = (maybeHandler ?? schemaOrHandler) as Handler<P, B | undefined>;

  return async (request: Request, ctx: Ctx<P>): Promise<Response> => {
    try {
      const admin = await requirePermission(request, permission);

      let body: B | undefined;
      if (schema) {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          throw invalid('Request body must be valid JSON.');
        }
        // `parse` throws ZodError, which toErrorResponse turns into a 422 with per-field messages.
        body = schema.parse(raw);
      }

      const params = ctx?.params ? await ctx.params : ({} as P);
      const result = await handler({ request, params, body, admin });

      if (result instanceof Response) return result;
      // Wrap response in `{ data }` to match `admin/src/lib/api/client.ts`.
      return Response.json(
        { data: result },
        {
          // Admin responses carry price and supplier data. Nothing may cache them.
          headers: { 'Cache-Control': 'private, no-store' },
        },
      );
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
