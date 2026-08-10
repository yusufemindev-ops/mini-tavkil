import { ZodError } from 'zod';

/**
 * The error type every service throws, carrying the same codes Tavkil used so the
 * admin SPA's error handling keeps working unchanged.
 *
 * `details` is deliberately narrow. It carries field-level validation messages and
 * nothing else — never a database error string, never a row. A leaked price or
 * supplier name in an error body counts as a leak exactly like one in a page
 * (CLAUDE.md §1).
 */
export type AppErrorCode =
  | 'resource.not_found'
  | 'resource.conflict'
  | 'validation.failed'
  | 'rate_limited'
  | 'internal.error';

const STATUS: Record<AppErrorCode, number> = {
  'resource.not_found': 404,
  'resource.conflict': 409,
  'validation.failed': 422,
  rate_limited: 429,
  'internal.error': 500,
};

/**
 * Authentication / authorisation failure.
 *
 * Lives here, not in auth-guard, so this module imports nothing. auth-guard
 * imports `@/lib/db`, and every module that reached AuthError through it inherited
 * a module-scope `throw new Error('DATABASE_URL is not set')` — which broke the
 * test run three separate times before the dependency was inverted.
 *
 * 401 vs 403 is a real distinction: 403 confirms an endpoint exists, and that is
 * only safe to tell someone who has already proven who they are.
 */
export class AuthError extends Error {
  constructor(
    readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
  }

  get status(): number {
    return STATUS[this.code];
  }
}

export function notFound(message: string): AppError {
  return new AppError('resource.not_found', message);
}

export function conflict(message: string): AppError {
  return new AppError('resource.conflict', message);
}

export function invalid(message: string, details?: Record<string, string[]>): AppError {
  return new AppError('validation.failed', message, details);
}

/** Postgres unique-violation. Drizzle surfaces the driver error, not a typed one. */
export function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  if (code === '23505') return true;
  // The Neon HTTP driver wraps the original; fall back to the message.
  return /duplicate key value violates unique constraint/i.test(String((error as Error)?.message));
}

/**
 * Maps any thrown value to a JSON response.
 *
 * An unexpected error is logged in full server-side but answers with a bare 500:
 * the message could contain a query, a column list, or a row, and none of that
 * belongs in a response body.
 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json(
      { error: { code: 'auth.denied', message: error.message } },
      {
        status: error.status,
      },
    );
  }

  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: 'validation.failed',
          message: 'Request body failed validation.',
          details: fieldErrors(error),
        },
      },
      { status: 422 },
    );
  }

  if (isUniqueViolation(error)) {
    return Response.json(
      { error: { code: 'resource.conflict', message: 'That value is already taken.' } },
      { status: 409 },
    );
  }

  console.error('Unhandled API error:', error);
  return Response.json(
    { error: { code: 'internal.error', message: 'Something went wrong.' } },
    { status: 500 },
  );
}

export function fieldErrors(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    out[key] = [...(out[key] ?? []), issue.message];
  }
  return out;
}
