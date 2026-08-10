import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { CategoryThumb } from './preview-ui';
import type { LocaleCode } from './shared';

// A sub-category tile — storefront `.subcat-tile` look: image-or-orange thumb
// name, with a preview-only "Draft" badge for unpublished sub-categories.
export interface CatalogueTile {
  id: string;
  name: string;
  imageUrl: string | null;
  isDraft: boolean;
  to: string;
}

// A catalogue section: one top-level category with its sub-category tiles.
export interface CatalogueSection {
  id: string;
  name: string;
  isDraft: boolean;
  viewAllTo: string;
  tiles: CatalogueTile[];
}

function DraftBadge({ className }: { className?: string }) {
  return (
    <span
      className={`bg-warning-soft text-warning rounded px-2 py-0.5 text-[11px] font-semibold ${className ?? ''}`}
    >
      Draft
    </span>
  );
}

function SubcategoryTile({ tile }: { tile: CatalogueTile }) {
  return (
    <Link
      to={tile.to}
      className="border-border bg-card hover:border-primary group relative flex flex-col overflow-hidden rounded-lg border text-start transition-colors"
    >
      <CategoryThumb src={tile.imageUrl} className="aspect-[16/10]" />
      {tile.isDraft && <DraftBadge className="absolute start-2 top-2" />}
      <div className="border-border border-t px-3 pb-3 pt-2.5">
        <div className="text-foreground text-[0.9rem] font-semibold leading-tight">{tile.name}</div>
      </div>
    </Link>
  );
}

// Storefront catalogue-INDEX preview (/catalogue): a CATEGORIES rail + one
// section per top-level category (heading + "View all" → its category page
// preview + a grid of sub-category tiles). Mirrors storefront/catalogue/page.tsx.
// Drafts are included and badged (preview only; the live site hides them).
export function CataloguePreview({
  sections,
  locale,
}: {
  sections: readonly CatalogueSection[];
  locale: LocaleCode;
}) {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <div dir={dir} className="mx-auto w-full max-w-[1520px] px-5 py-8 sm:px-6">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
          Browse the catalogue
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Browse verified manufacturing categories — prices appear once your account is verified.
        </p>
      </header>

      {sections.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">No categories yet.</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:items-start">
          {/* CATEGORIES rail — anchor links to each section. */}
          <aside className="border-border bg-card h-fit rounded-lg border p-3.5 lg:sticky lg:top-4">
            <h2 className="text-muted-foreground mb-2 px-[11px] text-[0.72rem] font-bold uppercase tracking-wide">
              Categories
            </h2>
            <div className="flex flex-col gap-0.5">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#cat-${s.id}`}
                  className="text-foreground-soft hover:bg-muted/60 hover:text-foreground flex items-center justify-between gap-2 rounded-md px-[11px] py-[9px] text-[0.9rem] font-medium leading-snug transition-colors"
                >
                  <span>{s.name}</span>
                  {s.isDraft && <DraftBadge />}
                </a>
              ))}
            </div>
          </aside>

          {/* One section per top-level category. */}
          <div className="flex flex-col gap-10">
            {sections.map((section) => (
              <section key={section.id} id={`cat-${section.id}`} className="scroll-mt-24">
                <div className="border-border mb-4 flex items-center justify-between gap-4 border-b pb-3">
                  <h2 className="text-foreground inline-flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl">
                    {section.name}
                    {section.isDraft && <DraftBadge />}
                  </h2>
                  <Link
                    to={section.viewAllTo}
                    className="text-primary inline-flex shrink-0 items-center gap-1 text-sm font-medium hover:underline"
                  >
                    View all
                    <ArrowRight className="size-4 rtl:rotate-180" />
                  </Link>
                </div>
                {section.tiles.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No sub-categories yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
                    {section.tiles.map((tile) => (
                      <SubcategoryTile key={tile.id} tile={tile} />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
