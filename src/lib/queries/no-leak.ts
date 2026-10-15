/**
 * Recursively asserts that no public payload contains price/supplier keys or known supplier values.
 */

const FORBIDDEN_KEY = /price|supplier|cost|margin|markup|wholesale_?amount/i;

export type LeakHit = { path: string; reason: string };

export function findLeaks(value: unknown, forbiddenValues: readonly string[] = []): LeakHit[] {
  const hits: LeakHit[] = [];
  const seen = new WeakSet<object>();
  const needles = forbiddenValues.map((v) => v.toLowerCase()).filter(Boolean);

  function walk(node: unknown, path: string) {
    if (node === null || node === undefined) return;

    if (typeof node === 'string') {
      const haystack = node.toLowerCase();
      for (const needle of needles) {
        if (haystack.includes(needle)) {
          hits.push({ path, reason: `value contains supplier name "${needle}"` });
        }
      }
      return;
    }

    if (typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }

    if (node instanceof Date) return;

    if (node instanceof Map) {
      for (const [key, item] of node) walk(item, `${path}.get(${String(key)})`);
      return;
    }

    for (const [key, item] of Object.entries(node)) {
      const childPath = path ? `${path}.${key}` : key;
      if (FORBIDDEN_KEY.test(key)) {
        hits.push({ path: childPath, reason: `key "${key}" matches ${FORBIDDEN_KEY}` });
      }
      walk(item, childPath);
    }
  }

  walk(value, '');
  return hits;
}

export function formatLeaks(hits: readonly LeakHit[]): string {
  return hits.map((h) => `  ${h.path || '<root>'} — ${h.reason}`).join('\n');
}
