import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/features/auth/use-permissions';
import { NAV_GROUPS } from './nav-items';
import { BrandSeal } from '@/components/brand-seal';

// Grouped sidebar (prototype `.sidebar`): brand + labelled nav groups, orange
// active state, teal count badges.
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  // Only show nav the current role can access (matches the router's RequirePermission
  // guards); drop groups left empty after filtering.
  const { can } = usePermissions();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="bg-sidebar text-sidebar-foreground border-sidebar-border flex h-full w-[244px] flex-col border-r">
      {/* Brand */}
      <div className="border-sidebar-border flex h-14 flex-none items-center gap-2.5 border-b px-5">
        <BrandSeal className="size-7 flex-none" />
        <div className="leading-tight">
          <div className="text-[0.95rem] font-semibold">Tavkil</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {groups.map((group, gi) => (
          <div key={group.label ?? gi} className="mb-4">
            {group.label && (
              <div className="text-muted-foreground px-2.5 py-2 text-[0.66rem] font-semibold uppercase tracking-wider">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const badge = item.badge;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'mb-px flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.84rem] transition-colors',
                      isActive
                        ? 'bg-primary-soft text-primary font-semibold'
                        : 'text-foreground hover:bg-muted',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className="size-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {badge != null && (
                        <span
                          className={cn(
                            'grid min-w-5 place-items-center rounded-full px-1.5 text-[0.66rem] font-semibold',
                            isActive ? 'bg-primary text-white' : 'bg-accent text-accent-foreground',
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
