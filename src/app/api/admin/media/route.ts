import { getCloudflareContext } from '@opennextjs/cloudflare';
import { requirePermission } from '@/lib/auth-guard';
import { invalid, toErrorResponse, AppError } from '@/lib/api/errors';
import { contentTypeFor, extensionFor, sniffImageFormat } from '@/lib/media/sniff';
import { resolveImageUrl } from '@/lib/media/image-url';

/**
 * Admin image upload → Cloudflare R2.
 *
 * Path kept as `/api/admin/media` so the admin SPA's existing upload call works
 * unchanged (PLAN.md §8).
 *
 * Sharp cannot run on Workers and a WASM encoder would not fit in the bundle, so
 * the resizing happens in the browser before this is called
 * (`admin/src/lib/image-resize.ts`): the Worker never decodes image bytes, it only
 * checks and stores them. That is also why the size cap here is generous — it is a
 * backstop against a hand-rolled request, not the actual compression step.
 *
 * What is stored is a **bare key**, not a URL. Step 15 swaps the images host, and
 * absolute URLs in the database would turn that into a migration over every row.
 */
export const dynamic = 'force-dynamic';

function maxBytes(): number {
  const configured = Number(process.env.MAX_UPLOAD_MB);
  const megabytes = Number.isFinite(configured) && configured > 0 ? configured : 10;
  return megabytes * 1024 * 1024;
}

export async function POST(request: Request) {
  try {
    // First line, before the body is read: a handler that buffers 10 MB and then
    // returns 401 has done the attacker's work for them.
    await requirePermission(request, 'media:upload');

    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) throw invalid('No file was provided.');

    if (file.size === 0) throw invalid('That file is empty.');
    if (file.size > maxBytes()) {
      throw invalid(`That image is larger than the ${maxBytes() / 1024 / 1024} MB limit.`);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    // The format comes from the bytes, never from the declared Content-Type,
    // which is whatever the client typed. An SVG labelled image/png would
    // otherwise be stored and later served as a script-bearing document from a
    // host we treat as trusted.
    const format = sniffImageFormat(bytes);
    if (!format) {
      throw invalid('Only JPEG, PNG and WebP images are accepted. SVG is not allowed.');
    }

    const bucket = (
      getCloudflareContext().env as unknown as {
        IMAGES?: {
          put: (
            key: string,
            value: ArrayBuffer | Uint8Array,
            options?: { httpMetadata?: { contentType?: string } },
          ) => Promise<unknown>;
        };
      }
    ).IMAGES;

    // The R2 binding exists only in the Worker runtime. Under plain `next dev`
    // there is none — say so rather than throwing something opaque.
    if (!bucket) {
      throw new AppError(
        'internal.error',
        'Image storage is only available on the deployed Worker (run `pnpm preview` to test uploads locally).',
      );
    }

    const key = `products/${crypto.randomUUID()}.${extensionFor(format)}`;
    await bucket.put(key, bytes, { httpMetadata: { contentType: contentTypeFor(format) } });

    // `url` is what the admin renders and stores; `key` is what it should persist
    // once the product form is taught to. Both are returned so neither is a guess.
    return Response.json(
      { key, url: resolveImageUrl(key), filename: key.split('/').pop() },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
