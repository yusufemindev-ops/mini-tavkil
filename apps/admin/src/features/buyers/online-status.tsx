import { useState } from 'react';
import { buyerPresence } from './presence';

function lastSeenLabel(lastSeenAt: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(lastSeenAt).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function OnlineStatus({
  lastSeenAt,
  hasActiveSession,
}: {
  lastSeenAt: string | null;
  hasActiveSession: boolean;
}) {
  const [now] = useState(() => Date.now());
  const presence = buyerPresence(lastSeenAt, hasActiveSession, now);

  if (presence === 'never') {
    return (
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <span className="bg-muted-foreground/30 size-2 rounded-full" />
        Never signed in
      </span>
    );
  }

  return presence === 'online' ? (
    <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
      <span className="size-2 rounded-full bg-green-500" />
      Online
    </span>
  ) : (
    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <span className="bg-muted-foreground/40 size-2 rounded-full" />
      Last seen {lastSeenAt ? lastSeenLabel(lastSeenAt, now) : ''}
    </span>
  );
}
