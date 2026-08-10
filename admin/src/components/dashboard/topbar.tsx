import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, LogOut, Menu, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { logout } from '@/features/auth/auth-api';
import { SESSION_QUERY_KEY, useSession } from '@/features/auth/use-session';

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: admin } = useSession();

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      queryClient.removeQueries({ queryKey: SESSION_QUERY_KEY });
      navigate('/login', { replace: true });
    },
  });

  return (
    <header className="bg-background/80 border-border sticky top-0 z-10 flex h-14 items-center gap-4 border-b px-4 backdrop-blur sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open menu"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="ms-auto flex items-center gap-2">
        <ThemeToggle />
        {admin && (
          <DropdownMenu>
            <DropdownMenuTrigger className="border-border hover:border-primary/40 hover:bg-muted/60 data-[popup-open]:border-primary/40 flex items-center gap-2.5 rounded-full border py-1 pe-2.5 ps-1 transition-colors">
              <span className="bg-primary-soft text-primary grid size-8 place-items-center rounded-full text-xs font-semibold">
                {initials(admin.fullName)}
              </span>
              <span className="hidden text-start leading-tight sm:block">
                <span className="text-foreground block text-sm font-medium">{admin.fullName}</span>
              </span>
              <ChevronDown className="text-muted-foreground hidden size-3.5 sm:block" />
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuLabel className="flex items-center gap-2.5">
                <span className="bg-primary-soft text-primary grid size-9 flex-none place-items-center rounded-full text-sm font-semibold">
                  {initials(admin.fullName)}
                </span>
                <span className="min-w-0">
                  <span className="text-foreground block truncate text-sm font-semibold">
                    {admin.fullName}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {admin.email}
                  </span>
                  {admin.roles.length > 0 && (
                    <span className="bg-primary-soft text-primary mt-1.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium">
                      {admin.roles.join(', ')}
                    </span>
                  )}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem render={<Link to="/profile" />}>
                <User className="size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="text-destructive data-[highlighted]:text-destructive"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
