'use client';

import { createAuthClient } from 'better-auth/react';
import { env } from '@/lib/env';

export const authClient = createAuthClient({
  baseURL: env.apiOrigin || undefined,
});

export const { signIn, signOut, useSession } = authClient;
