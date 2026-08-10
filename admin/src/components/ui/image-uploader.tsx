import { ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UploadImage {
  id: string;
  /** Tint for the mock thumbnail (no real upload yet). */
  color?: string;
  primary?: boolean;
  alt?: string;
}

// Prototype `.img-uploader` — 4-up grid of image thumbs (primary gets a ring
// badge) plus a dashed "add" tile. Display-only mock for now.
export function ImageUploader({ images, onAdd }: { images: UploadImage[]; onAdd?: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {images.map((img) => (
        <div
          key={img.id}
          className={cn(
            'border-border relative aspect-square overflow-hidden rounded-lg border',
            img.primary && 'ring-accent ring-2',
          )}
          style={{
            background: img.color
              ? `radial-gradient(circle at 30% 25%, color-mix(in srgb, ${img.color} 50%, var(--muted)), var(--muted))`
              : 'var(--muted)',
          }}
        >
          {img.primary && (
            <span className="bg-primary text-primary-foreground absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase">
              Primary
            </span>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="border-border text-muted-foreground hover:border-primary hover:text-primary grid aspect-square place-items-center gap-1 rounded-lg border border-dashed text-xs transition-colors"
      >
        <ImagePlus className="size-5" />
        Add
      </button>
    </div>
  );
}
