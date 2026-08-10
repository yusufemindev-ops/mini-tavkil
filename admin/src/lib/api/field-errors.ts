import { ApiError } from './client';

// A Zod issue as carried in a `validation.failed` error envelope.
interface ZodIssue {
  path: (string | number)[];
  message: string;
}

// Map a backend validation error onto form field keys, so each message renders
// under the right input instead of in a generic toast.
//
// `keyFor` translates an issue path → a form field key (e.g. `contactEmailInternal`
// → `email`, or `translations.0.name` → `name`). Return `undefined` to skip an
// issue. Without it, the last string segment of the path is used as the key.
// `allowed` (optional) restricts the result to keys the form actually renders.
export function apiFieldErrors<K extends string = string>(
  err: unknown,
  options: {
    keyFor?: (path: (string | number)[]) => string | undefined;
    allowed?: readonly K[];
  } = {},
): Partial<Record<K, string>> {
  if (!(err instanceof ApiError) || err.code !== 'validation.failed') return {};
  const issues = (err.details?.issues as ZodIssue[] | undefined) ?? [];
  const out: Partial<Record<K, string>> = {};
  for (const issue of issues) {
    const key = options.keyFor ? options.keyFor(issue.path) : lastStringSegment(issue.path);
    if (!key) continue;
    if (options.allowed && !options.allowed.includes(key as K)) continue;
    if (!(key in out)) out[key as K] = issue.message;
  }
  return out;
}

function lastStringSegment(path: (string | number)[]): string | undefined {
  for (let i = path.length - 1; i >= 0; i--) {
    if (typeof path[i] === 'string') return path[i] as string;
  }
  return undefined;
}
