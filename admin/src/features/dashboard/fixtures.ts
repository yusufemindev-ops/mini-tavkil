import type { KpiTone } from '@/components/ui/kpi-card';

// Mock dashboard data (prototype/adminv2.html). Replaced by real aggregates once
// the admin APIs land.

export interface DashKpi {
  label: string;
  value: string;
  delta?: string;
  tone?: KpiTone;
}

export const KPIS: DashKpi[] = [
  { label: 'Order requests today', value: '5', delta: '3 awaiting confirmation', tone: 'warn' },
  { label: 'Pending account requests', value: '3', delta: 'Oldest 2 days', tone: 'down' },
  { label: 'Buyer accounts', value: '18', delta: '+3 this week', tone: 'up' },
];

export type ValueTone = 'success' | 'warning' | 'destructive';

export interface PublishStat {
  label: string;
  value: number;
  valueTone?: ValueTone;
  hint?: string;
  hintTone?: 'down';
}

export const PUBLISH_SUMMARY: PublishStat[] = [
  { label: 'Published products', value: 12, valueTone: 'success' },
  { label: 'Draft', value: 3, hint: 'Awaiting completion' },
  {
    label: 'Missing translations',
    value: 2,
    valueTone: 'warning',
    hint: "noindex'd until reviewed",
  },
  {
    label: 'Missing primary image',
    value: 1,
    valueTone: 'destructive',
    hint: 'Blocks publish',
    hintTone: 'down',
  },
];

export type ActivityTone = 'primary' | 'success' | 'accent' | 'warning';

// Serializable icon key (resolved to a lucide component in the page) so activity
// items survive the JSON round-trip through the mock API.
export type ActivityIcon = 'inbox' | 'check' | 'search' | 'alert';

export interface ActivityItem {
  id: string;
  icon: ActivityIcon;
  tone: ActivityTone;
  before: string;
  strong: string;
  after: string;
  meta: string;
}

export const ACTIVITY: ActivityItem[] = [
  {
    id: 'a1',
    icon: 'inbox',
    tone: 'primary',
    before: 'Order ',
    strong: 'O-2026-0142',
    after: ' confirmed for Acme Textiles A.Ş.',
    meta: '2 line items · $6,760 · awaiting buyer accept — 12 minutes ago by Aylin K.',
  },
  {
    id: 'a2',
    icon: 'check',
    tone: 'success',
    before: 'Account approved for ',
    strong: 'Mehmet Yılmaz Wholesale',
    after: ' (Tier 2 · 18%)',
    meta: 'Approved by Amjad A. — 47 minutes ago',
  },
  {
    id: 'a3',
    icon: 'search',
    tone: 'accent',
    before: 'Sourcing request from ',
    strong: 'Khalid Al-Rashid',
    after: ' via email',
    meta: '"Looking for hospitality-grade bath linen…" — 1 hour ago',
  },
  {
    id: 'a4',
    icon: 'check',
    tone: 'success',
    before: 'Product ',
    strong: 'Mandallı Mop',
    after: ' published in EN, TR, AR',
    meta: 'All 3 locales pass publish-gate — 2 hours ago',
  },
  {
    id: 'a5',
    icon: 'alert',
    tone: 'warning',
    before: 'Order ',
    strong: 'O-2026-0138',
    after: ' auto-expired (no buyer response in 7 days)',
    meta: 'Buyer notified — yesterday at 04:00',
  },
];
