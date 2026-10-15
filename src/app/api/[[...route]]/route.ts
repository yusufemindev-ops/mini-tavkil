import { revalidatePath } from 'next/cache';
import { handle } from 'hono/vercel';
import { registerRevalidator } from '@/lib/cache';
import { app } from '@/server/app';

export const dynamic = 'force-dynamic';

registerRevalidator(revalidatePath);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
