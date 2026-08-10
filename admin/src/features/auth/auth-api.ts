import { authClient } from '@/lib/auth-client';

// Admins are Google-only — sign-in is initiated from the login page via
// authClient.signIn.social. This module just exposes logout.
export async function logout(): Promise<void> {
  await authClient.signOut();
}
