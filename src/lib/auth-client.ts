'use client';

import { createAuthClient } from 'better-auth/react';

// Staff-only client, used by the sign-in page and the admin shell. Same-origin, so
// no baseURL is needed. There is no buyer-side auth client here — Tavkil's is
// deliberately not ported (PLAN.md §4).
export const authClient = createAuthClient();
export const { signIn, signOut, useSession } = authClient;
