import { AlertTriangle, Check, Inbox, Search, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { SelectMenu } from '@/components/ui/select-menu';
import { KpiCard } from '@/components/ui/kpi-card';
import { Panel, PanelBody, PanelHead } from '@/components/ui/panel';
import { ActivitySkeleton, KpiCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { type ActivityIcon, type ActivityTone, type ValueTone } from './fixtures';
import { useDashboard } from './queries';

// Resolve the fixture's serializable icon key to a lucide component.
const ACTIVITY_ICON: Record<ActivityIcon, LucideIcon> = {
  inbox: Inbox,
  check: Check,
  search: Search,
  alert: AlertTriangle,
};

const ACTIVITY_TONE: Record<ActivityTone, string> = {
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  accent: 'bg-accent-soft text-accent',
  warning: 'bg-warning-soft text-warning',
};

const VALUE_TONE: Record<ValueTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDashboard();
  const kpis = data?.kpis ?? [];
  const publishSummary = data?.publishSummary ?? [];
  const activity = data?.activity ?? [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Snapshot of catalog, buyers, and order pipeline"
        actions={
          <SelectMenu
            defaultValue="30d"
            className="h-9 w-auto"
            options={[
              { value: '30d', label: 'Last 30 days' },
              { value: '7d', label: 'Last 7 days' },
              { value: 'quarter', label: 'This quarter' },
            ]}
          />
        }
      />

      {/* KPIs (hidden until the dashboard backend provides metrics) */}
      {(isLoading || kpis.length > 0) && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
            : kpis.map((k) => (
                <KpiCard
                  key={k.label}
                  label={k.label}
                  value={k.value}
                  delta={k.delta}
                  tone={k.tone}
                />
              ))}
        </div>
      )}

      {/* Catalog publish-readiness */}
      <Panel className="mb-6">
        <PanelHead
          title="Catalog publish-readiness"
          action={
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="text-primary text-sm font-medium hover:underline"
            >
              Manage products →
            </button>
          }
        />
        <PanelBody>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-2.5 w-2/3" />
                  <Skeleton className="h-6 w-10" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              ))}
            </div>
          ) : publishSummary.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No catalog metrics yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {publishSummary.map((s) => (
                <div key={s.label}>
                  <div className="text-muted-foreground text-[0.7rem] font-semibold uppercase tracking-wide">
                    {s.label}
                  </div>
                  <div
                    className={cn(
                      'text-foreground mt-1.5 text-[1.4rem] font-bold',
                      s.valueTone && VALUE_TONE[s.valueTone],
                    )}
                  >
                    {s.value}
                  </div>
                  {s.hint && (
                    <div
                      className={cn(
                        'mt-0.5 text-[0.72rem]',
                        s.hintTone === 'down' ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {s.hint}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </PanelBody>
      </Panel>

      {/* Recent activity */}
      <Panel>
        <PanelHead
          title="Recent activity"
          action={
            <button
              type="button"
              onClick={() => navigate('/audit-log')}
              className="text-primary text-sm font-medium hover:underline"
            >
              View all
            </button>
          }
        />
        <PanelBody tight>
          {isLoading ? (
            <ActivitySkeleton rows={5} />
          ) : activity.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">No recent activity.</p>
          ) : (
            <div className="flex flex-col">
              {activity.map((a, i) => {
                const Icon = ACTIVITY_ICON[a.icon];
                return (
                  <div
                    key={a.id}
                    className={cn(
                      'flex items-start gap-3 px-[18px] py-3.5',
                      i > 0 && 'border-border border-t',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-8 flex-none place-items-center rounded-full',
                        ACTIVITY_TONE[a.tone],
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground text-[0.85rem]">
                        {a.before}
                        <b className="font-semibold">{a.strong}</b>
                        {a.after}
                      </div>
                      <div className="text-muted-foreground mt-0.5 text-[0.72rem]">{a.meta}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
