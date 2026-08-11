/**
 * The router's basename, and the one way to build a URL that leaves the router.
 *
 * `<Link to="/preview/product/1">` is resolved by React Router against
 * `basename="/admin"`. `window.open('/preview/product/1')` is not — it goes
 * straight to the browser, which resolves it against the ORIGIN and lands on
 * `https://host/preview/product/1`, a 404.
 *
 * Every "Preview" button in the admin did exactly that, so preview was broken on
 * the products list, the product editor, the categories list, the category
 * editor and the catalogue preview — five buttons, one mistake. It was correct
 * in Tavkil, where the admin was served at the root of its own origin; this SPA
 * is mounted under /admin, so anything that bypasses the router must say so.
 *
 * Same root cause as the sign-in callback that sent every completed login to
 * `/dashboard` instead of `/admin/dashboard`.
 */
export const ADMIN_BASENAME = '/admin';

/** Absolute path for `window.open`, `<a href>` or anything else outside the router. */
export function adminUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${ADMIN_BASENAME}${suffix}`;
}
