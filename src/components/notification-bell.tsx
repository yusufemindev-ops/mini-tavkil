'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import { iconButtonVariants } from '@/components/ui/icon-button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip } from '@/components/ui/tooltip';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type NotificationType = 'order_confirmed' | 'order_decision' | 'message' | 'tier_updated';

interface BuyerNotificationItem {
  id: string;
  type: NotificationType;
  params: Record<string, string>;
  href: string;
  createdAt: string;
}

const READ_STORAGE_KEY = 'tavkil.buyer.read_notifs.v1';

function loadReadSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? new Set(parsed.filter((x): x is string => typeof x === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

function saveReadSet(set: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // Ignore storage quota errors
  }
}

export function NotificationBell() {
  const t = useTranslations('store');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BuyerNotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadSet());

  useEffect(() => {
    let cancelled = false;
    fetch('/api/buyer/notifications', { credentials: 'include' })
      .then((res) => (res.ok ? (res.json() as Promise<{ data: BuyerNotificationItem[] }>) : null))
      .then((body) => {
        if (!cancelled && Array.isArray(body?.data)) {
          setItems(body.data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  const unreadCount = items.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = () => {
    const next = new Set(readIds);
    for (const item of items) next.add(item.id);
    setReadIds(next);
    saveReadSet(next);
  };

  const handleSelect = (item: BuyerNotificationItem) => {
    if (!readIds.has(item.id)) {
      const next = new Set(readIds);
      next.add(item.id);
      setReadIds(next);
      saveReadSet(next);
    }
    setOpen(false);
    if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip content={t('notif_title')}>
        <PopoverTrigger
          aria-label={t('notif_title')}
          className={cn(iconButtonVariants(), 'relative')}
        >
          <Bell className="size-[17px]" />
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[0.6rem] leading-none font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </PopoverTrigger>
      </Tooltip>

      <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] p-0 sm:w-90">
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-foreground text-sm font-bold">{t('notif_title')}</h2>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-primary text-xs font-semibold hover:underline"
            >
              {t('notif_mark_read')}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm">{t('notif_empty')}</p>
        ) : (
          <ul className="divide-border max-h-96 divide-y overflow-y-auto">
            {items.map((n) => {
              const unread = !readIds.has(n.id);
              const Icon =
                n.type === 'order_decision'
                  ? Clock
                  : n.type === 'message'
                    ? MessageSquare
                    : CheckCircle2;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(n)}
                    className={cn(
                      'hover:bg-background-2 flex w-full items-start gap-3 px-4 py-3 text-start transition-colors',
                      unread && 'bg-primary/5',
                    )}
                  >
                    <Icon className="text-primary mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-foreground truncate text-xs font-semibold">
                          {t(`notif_${n.type}_t`, n.params)}
                        </p>
                        {unread && (
                          <span className="bg-primary size-2 shrink-0 rounded-full" aria-hidden />
                        )}
                      </div>
                      <p className="text-foreground-soft mt-0.5 text-xs">
                        {t(`notif_${n.type}_d`, n.params)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
