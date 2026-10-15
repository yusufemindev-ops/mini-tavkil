import { Hono } from 'hono';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { AppError, invalid } from '@/lib/api/errors';
import { resolveImageUrl } from '@/lib/media/image-url';
import { contentTypeFor, extensionFor, sniffImageFormat } from '@/lib/media/sniff';
import {
  adminJson,
  auditAdmin,
  requireAdminPerm,
  type AppEnv,
  type R2BucketLike,
} from '@/server/factory';

function maxBytes(): number {
  const configured = Number(process.env.MAX_UPLOAD_MB);
  const megabytes = Number.isFinite(configured) && configured > 0 ? configured : 10;
  return megabytes * 1024 * 1024;
}

function resolveImagesBucket(cEnv?: AppEnv['Bindings']): R2BucketLike | undefined {
  if (cEnv?.IMAGES) return cEnv.IMAGES;
  try {
    return (getCloudflareContext().env as unknown as { IMAGES?: R2BucketLike }).IMAGES;
  } catch {
    return undefined;
  }
}

/** Admin image upload to Cloudflare R2 (`IMAGES` binding). */
export const adminMediaRoutes = new Hono<AppEnv>().post(
  '/',
  requireAdminPerm('media:upload'),
  async (c) => {
    const form = await c.req.raw.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) throw invalid('No file was provided.');

    if (file.size === 0) throw invalid('That file is empty.');
    if (file.size > maxBytes()) {
      throw invalid(`That image is larger than the ${maxBytes() / 1024 / 1024} MB limit.`);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const format = sniffImageFormat(bytes);
    if (!format) {
      throw invalid('Only JPEG, PNG and WebP images are accepted. SVG is not allowed.');
    }

    const bucket = resolveImagesBucket(c.env);
    if (!bucket) {
      throw new AppError(
        'internal.error',
        'Image storage is only available on the deployed Worker (run `pnpm preview` to test uploads locally).',
      );
    }

    const key = `products/${crypto.randomUUID()}.${extensionFor(format)}`;
    await bucket.put(key, bytes, { httpMetadata: { contentType: contentTypeFor(format) } });
    const filename = key.split('/').pop() ?? key;

    await auditAdmin(c, {
      action: 'media.uploaded',
      resourceType: 'media',
      resourceId: key,
      target: filename,
      summary: `Uploaded image ${filename}`,
    });

    return adminJson(c, {
      key,
      url: resolveImageUrl(key),
      filename,
    });
  },
);
