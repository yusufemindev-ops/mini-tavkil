import { buildLlmsTxt } from '@/lib/seo/llms';

// One build per hour, like the sitemap — the catalogue changes on publish, not
// continuously, and this reads every category.
export const revalidate = 3600;

export async function GET() {
  return new Response(await buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
