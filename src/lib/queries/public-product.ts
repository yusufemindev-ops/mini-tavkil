/**
 * The ONLY product shape public pages may render.
 *
 * There is no `price` field and no `supplier` field — not optional, absent. That is
 * the entire enforcement mechanism: a leak becomes a compile error rather than
 * something a reviewer has to catch.
 *
 * Rules (see .claude/skills/public-data-guard.md):
 *   - Public pages call publicProduct/publicProducts. Nothing else.
 *   - Never widen this type "just for one page".
 *   - Never spread a raw Prisma result into a public response.
 *   - Strip at the query, not at the render — a Server Component passing an object
 *     to a Client Component serializes it into the HTML, visible in view-source
 *     even if never displayed.
 *
 * Admin queries live in src/lib/queries/admin-*.ts, called only from /api/admin/*.
 */

export type PublicImage = {
  url: string;
  alt: string;
  width: number;
  height: number;
};

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  images: PublicImage[];
  category: { slug: string; name: string };
  attributes: { label: string; value: string }[];
  updatedAt: Date; // sitemap lastModified — never `new Date()`
};

// TODO(block 3): implement against prisma. Signatures are fixed; the shape is not
// negotiable.
//
// export async function publicProduct(slug: string, locale: Locale): Promise<PublicProduct | null>
// export async function publicProducts(filter: PublicFilter): Promise<PublicProduct[]>
