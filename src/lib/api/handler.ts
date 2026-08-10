import type { ZodType } from 'zod';
import { requirePermission, type AdminUser } from '@/lib/auth-guard';
import { invalid, toErrorResponse } from '@/lib/api/errors';

/**
 * The wrapper every `/api/admin/*` handler goes through.
 *
 * It exists so the permission check cannot be forgotten. Tavkil enforced this with
 * a `@RequirePermission` decorator that the framework applied; a Next route handler
 * is just an exported function, so nothing stops someone writing one without a
 * guard. Making the permission a required argument of the only helper used to build
 * these handlers puts it back in the type system.
 *
 * The order is deliberate and matches PLAN.md §14h: authenticate and authorise
 * *first*, before reading the body or touching the database. A handler that parses
 * a 10 MB body and then returns 401 has already done the attacker's work for them.
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
        // `parse` throws ZodError, which toErrorResponse turns into a 422 with
        // per-field messages.
        body = schema.parse(raw);
      }

      const params = ctx?.params ? await ctx.params : ({} as P);
      const result = await handler({ request, params, body, admin });

      if (result instanceof Response) return result;
      return Response.json(result, {
        // Admin responses carry price and supplier data. Nothing may cache them.
        headers: { 'Cache-Control': 'private, no-store' },
      });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
