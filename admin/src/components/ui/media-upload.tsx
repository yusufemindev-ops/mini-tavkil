import { useRef, useState } from 'react';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ApiError, uploadFile } from '@/lib/api/client';
import { resizeToWebp } from '@/lib/image-resize';

interface UploadedMedia {
  url: string;
  filename: string;
}

// Generic fallback — the backend is the source of truth for the size limit
// (MAX_UPLOAD_MB), so we don't hard-code a number that could drift.
const UPLOAD_ERROR = 'Upload failed — use a supported image within the size limit.';

// Shared upload routine: downscale to WebP in the browser, POST each file to
// /admin/media, surface a toast on failure, and hand back the resulting URLs.
// One file's error doesn't abort the others.
//
// The resize is not an optimisation here, it is the whole pipeline: the Worker
// cannot run Sharp, so if the browser doesn't do this nothing does, and a 6 MB
// phone photo goes to R2 and then to every visitor.
async function uploadFiles(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    try {
      let payload = file;
      try {
        payload = await resizeToWebp(file);
      } catch {
        // A format the browser can't decode (or a canvas failure) shouldn't lose
        // the upload — send the original and let the server's sniff decide.
        payload = file;
      }
      const media = await uploadFile<UploadedMedia>('/admin/media', payload);
      urls.push(media.url);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : UPLOAD_ERROR);
    }
  }
  return urls;
}

interface ImageDropzoneProps {
  // Allow selecting more than one file at once (products take a gallery).
  multiple?: boolean;
  // Called with every successfully uploaded URL after the batch resolves.
  onUploaded: (urls: string[]) => void;
  title?: string;
  subtitle?: string;
  // Extra classes — e.g. a fixed square for a single-image slot.
  className?: string;
  // Compact mode: icon + title only (used for the small single-image square).
  compact?: boolean;
  // Icon only, no text — for tiny square slots (e.g. an option-value swatch).
  iconOnly?: boolean;
}

// Reusable image upload area. Click ANYWHERE opens the file picker; dragging
// files over it highlights and drops to upload. Handles single or multiple.
export function ImageDropzone({
  multiple = false,
  onUploaded,
  title = 'Drag & drop or click to upload',
  subtitle = 'JPEG, PNG or WebP — resized to 1600px before upload',
  className,
  compact = false,
  iconOnly = false,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function upload(list: FileList | null): Promise<void> {
    const files = list ? Array.from(list).filter((f) => f.type.startsWith('image/')) : [];
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls = await uploadFiles(files);
      if (urls.length > 0) onUploaded(urls);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const open = () => {
    if (!uploading) inputRef.current?.click();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!uploading) void upload(e.dataTransfer.files);
      }}
      className={cn(
        'border-border text-muted-foreground hover:border-primary hover:text-foreground flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-center outline-none transition-colors',
        'focus-visible:border-primary focus-visible:ring-primary/30 focus-visible:ring-2',
        iconOnly ? 'p-0' : compact ? 'gap-1 p-2' : 'px-4 py-6',
        dragging && 'border-primary bg-primary-soft/40 text-foreground',
        uploading && 'pointer-events-none opacity-70',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => void upload(e.target.files)}
      />
      {uploading ? (
        <Loader2 className={cn('animate-spin', compact || iconOnly ? 'size-5' : 'size-6')} />
      ) : (
        <UploadCloud className={compact || iconOnly ? 'size-5' : 'size-6'} />
      )}
      {!iconOnly && (
        <div>
          <p className={cn('text-foreground font-medium', compact ? 'text-[11px]' : 'text-sm')}>
            {uploading ? 'Uploading…' : title}
          </p>
          {!compact && subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}

interface SingleImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  // 'md'   — a 112px box with a label (supplier logo).
  // 'sm'   — a compact icon-only square that lines up with the colour picker
  //          (option-value swatch).
  // 'full' — a full-width drop area with icon + label + hint (category tile).
  size?: 'md' | 'sm' | 'full';
}

// One image at a time: a thumbnail when set, otherwise a dropzone. Used by the
// category tile ('full'), supplier logo ('md'), and option-value swatches ('sm').
export function SingleImageUpload({ value, onChange, label, size = 'md' }: SingleImageUploadProps) {
  const full = size === 'full';
  const box = size === 'sm' ? 'size-9' : full ? 'w-full' : 'size-28';

  if (value) {
    return (
      <div
        className={cn(
          'border-border relative overflow-hidden rounded-lg border',
          full ? 'block w-full' : cn('inline-flex', box),
        )}
      >
        <img
          src={value}
          alt=""
          className={full ? 'h-44 w-full object-cover' : 'size-full object-cover'}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'bg-background/80 hover:bg-background absolute',
            size === 'sm'
              ? 'inset-0 size-full rounded-none opacity-0 hover:opacity-100'
              : 'right-2 top-2 size-8',
          )}
          title="Remove image"
          onClick={() => onChange('')}
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <ImageDropzone
      compact={size === 'md'}
      iconOnly={size === 'sm'}
      title={label ?? (full ? 'Drag & drop or click to upload' : 'Add image')}
      className={box}
      onUploaded={(urls) => urls[0] && onChange(urls[0])}
    />
  );
}
