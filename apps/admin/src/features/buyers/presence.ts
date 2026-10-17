export type Presence = 'online' | 'offline' | 'never';

export const ONLINE_MS = 3 * 60 * 1000;

export function buyerPresence(
  lastSeenAt: string | null,
  hasActiveSession: boolean,
  now: number,
): Presence {
  if (!lastSeenAt) return 'never';
  const online = hasActiveSession && now - new Date(lastSeenAt).getTime() < ONLINE_MS;
  return online ? 'online' : 'offline';
}
