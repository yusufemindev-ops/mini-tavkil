import type { KpiTone } from '@/components/ui/kpi-card';

// Shapes for the dashboard's live aggregates, which come from /api/admin/dashboard.
//
// This file used to also hold Tavkil's prototype mock data — sample KPIs and an
// activity feed of invented orders and buyer accounts. mini-tavkil has neither
// orders nor buyers, and the dashboard reads real rows from Neon, so the arrays
// were fiction nothing imported. Only the types survive.

export interface DashKpi {
  label: string;
  value: string;
  delta?: string;
  tone?: KpiTone;
}

export type ValueTone = 'success' | 'warning' | 'destructive';

export interface PublishStat {
  label: string;
  value: number;
  valueTone?: ValueTone;
  hint?: string;
  hintTone?: 'down';
}

export type ActivityTone = 'primary' | 'success' | 'accent' | 'warning';

// Serializable icon key (resolved to a lucide component in the page) so activity
// items survive the JSON round-trip from the API.
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
