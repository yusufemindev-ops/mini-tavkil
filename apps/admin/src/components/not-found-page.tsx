import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Compass, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel, PanelBody } from '@/components/ui/panel';

export function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-lg items-center justify-center py-12">
      <Panel className="w-full">
        <PanelBody className="flex flex-col items-center px-8 py-10 text-center">
          <div className="bg-primary/10 text-primary mb-4 grid size-12 place-items-center rounded-xl">
            <Compass className="size-6" />
          </div>
          <span className="bg-muted text-muted-foreground mb-2 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider uppercase">
            Error 404
          </span>
          <h1 className="text-foreground text-xl font-bold tracking-tight">Page not found</h1>
          <p className="text-muted-foreground mt-2 max-w-sm text-[13.5px] leading-relaxed">
            No admin page matches{' '}
            <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
              {location.pathname}
            </code>
            . Check the URL or return to the dashboard.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" />
              Go back
            </Button>
            <Button size="sm" onClick={() => navigate('/dashboard', { replace: true })}>
              <LayoutDashboard className="size-4" />
              Back to dashboard
            </Button>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}
