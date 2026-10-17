/** Admin SPA root router basename and path utilities. */
export const ADMIN_BASENAME = '';

/** Absolute path for `window.open`, `<a href>` or anything else outside the router. */
export function adminUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${ADMIN_BASENAME}${suffix}`;
}
