import type { PermissionCatalogDomain } from './queries';

// Pure permission-matrix logic, extracted from the role editor for unit testing.
// Operates on the catalog domains returned by the API (each action carries its
// full `domain:action` code).

export type GroupState = 'all' | 'some' | 'none';

/** Every permission code belonging to a domain. */
export function domainCodes(domain: PermissionCatalogDomain): string[] {
  return domain.actions.map((a) => a.code);
}

/** Whether all / some / none of a domain's actions are granted. */
export function groupState(
  domain: PermissionCatalogDomain,
  granted: ReadonlySet<string>,
): GroupState {
  const on = domain.actions.filter((a) => granted.has(a.code)).length;
  if (on === 0) return 'none';
  if (on === domain.actions.length) return 'all';
  return 'some';
}

/** Grant or revoke a single permission code — returns a new Set (immutable). */
export function toggleAction(
  granted: ReadonlySet<string>,
  code: string,
  checked: boolean,
): Set<string> {
  const next = new Set(granted);
  if (checked) next.add(code);
  else next.delete(code);
  return next;
}

/** Grant or revoke every action in a domain — returns a new Set (immutable). */
export function toggleDomain(
  granted: ReadonlySet<string>,
  domain: PermissionCatalogDomain,
  checked: boolean,
): Set<string> {
  const next = new Set(granted);
  for (const code of domainCodes(domain)) {
    if (checked) next.add(code);
    else next.delete(code);
  }
  return next;
}

// ── Permission dependencies ─────────────────────────────────────────────────
// Within a domain, every non-"view" action requires that domain's `:view` — you
// reach create/edit/delete through a list/detail page that `:view` gates, so an
// action without view is a broken grant. Derived from the catalog (no upkeep).

/** The codes `code` directly depends on (currently: its domain's `:view`). */
export function dependenciesOf(code: string, allCodes: ReadonlySet<string>): string[] {
  const [domain, action] = code.split(':');
  if (domain && action && action !== 'view') {
    const view = `${domain}:view`;
    if (allCodes.has(view)) return [view];
  }
  return [];
}

/** Grant a code plus everything it (transitively) depends on. */
export function grantWithDeps(
  granted: ReadonlySet<string>,
  code: string,
  allCodes: ReadonlySet<string>,
): Set<string> {
  const next = new Set(granted);
  const stack = [code];
  while (stack.length) {
    const current = stack.pop();
    if (!current) break;
    next.add(current);
    for (const dep of dependenciesOf(current, allCodes)) {
      if (!next.has(dep)) stack.push(dep);
    }
  }
  return next;
}

/** Codes that can't be revoked right now because another granted code needs them. */
export function lockedCodes(
  granted: ReadonlySet<string>,
  allCodes: ReadonlySet<string>,
): Set<string> {
  const locked = new Set<string>();
  for (const code of granted) {
    for (const dep of dependenciesOf(code, allCodes)) locked.add(dep);
  }
  return locked;
}
