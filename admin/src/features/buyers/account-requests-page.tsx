import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { getCountry, countryName } from '@repo/countries';
import { PageHeader } from '@/components/ui/page-header';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FilterPills, type FilterPill } from '@/components/ui/filter-pills';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import {
  approveAccountRequest,
  buyersKeys,
  deleteAccountRequest,
  rejectAccountRequest,
  reopenAccountRequest,
  useAccountRequests,
  type AccountRequest,
  type RequestStatus,
} from './queries';

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="text-muted-foreground">{label}</div>
      <div>{children}</div>
    </>
  );
}

function countryLabel(code: string): string {
  const c = getCountry(code);
  return c ? `${c.flag} ${countryName(c, 'en')}` : code;
}

function RequestCard({
  req,
  onApprove,
  onReject,
  onReopen,
  onDelete,
  busy,
}: {
  req: AccountRequest;
  onApprove: (req: AccountRequest) => void;
  onReject: (req: AccountRequest) => void;
  onReopen: (req: AccountRequest) => void;
  onDelete: (req: AccountRequest) => void;
  busy: boolean;
}) {
  const fullName = `${req.firstName} ${req.lastName}`.trim();
  const submitted = formatDistanceToNow(new Date(req.createdAt), { addSuffix: true });
  return (
    <Panel>
      <PanelBody>
        <div className="flex flex-col gap-4">
          <div>
            <span className="mb-2 inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-sky-700 uppercase dark:bg-sky-500/15 dark:text-sky-400">
              New account
            </span>
            <div className="mb-1 text-[15px] font-semibold capitalize">{fullName}</div>
            <div className="text-muted-foreground mb-3 text-[13px]">Submitted {submitted}</div>
            <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-[160px_1fr]">
              <DetailRow label="Email">{req.email}</DetailRow>
              <DetailRow label="Phone">{req.phone ?? '—'}</DetailRow>
              {req.jobTitle && <DetailRow label="Job title">{req.jobTitle}</DetailRow>}
              {req.company && <DetailRow label="Company">{req.company}</DetailRow>}
              <DetailRow label="Country / City">
                {countryLabel(req.countryCode)}
                {req.city ? ` · ${req.city}` : ''}
              </DetailRow>
              {req.address && <DetailRow label="Address">{req.address}</DetailRow>}
              {req.message && <DetailRow label="Note">{req.message}</DetailRow>}
            </div>
          </div>

          <div className="border-border flex items-center justify-end gap-2 border-t pt-4">
            <ConfirmDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  aria-label="Delete request"
                  title="Delete request"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              }
              title="Delete this request?"
              description="This permanently removes the request and all its details. This cannot be undone."
              confirmLabel="Delete request"
              destructive
              onConfirm={() => onDelete(req)}
            />
            {req.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReject(req)}
                  disabled={busy}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Reject
                </Button>
                <Button size="sm" onClick={() => onApprove(req)} disabled={busy}>
                  <Check className="size-4" />
                  Approve
                </Button>
              </>
            )}
            {req.status === 'rejected' && (
              <Button variant="outline" size="sm" onClick={() => onReopen(req)} disabled={busy}>
                <RotateCcw className="size-4" />
                Move to review
              </Button>
            )}
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}

export function AccountRequestsPage() {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useAccountRequests();
  const [filter, setFilter] = useState<RequestStatus>('pending');

  const [approveTarget, setApproveTarget] = useState<AccountRequest | null>(null);
  const [markup, setMarkup] = useState('0');
  const markupPct = Number(markup) || 0;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: buyersKeys.accountRequests });
    void queryClient.invalidateQueries({ queryKey: buyersKeys.all });
  };

  const approve = useMutation({
    mutationFn: (req: AccountRequest) => approveAccountRequest(req.id, markupPct),
    onSuccess: (buyer) => {
      toast.success('Buyer account created', {
        description: `${buyer.email} can now sign in with Google.`,
      });
      setApproveTarget(null);
      invalidate();
    },
    onError: () => toast.error('Could not approve the request.'),
  });

  const reject = useMutation({
    mutationFn: (req: AccountRequest) => rejectAccountRequest(req.id),
    onSuccess: (_res, req) => {
      toast.warning('Request rejected', {
        description: `${req.company ?? `${req.firstName} ${req.lastName}`} marked as rejected.`,
      });
      invalidate();
    },
    onError: () => toast.error('Could not reject the request.'),
  });

  const reopen = useMutation({
    mutationFn: (req: AccountRequest) => reopenAccountRequest(req.id),
    onSuccess: (_res, req) => {
      toast.success('Moved to review', {
        description: `${req.company ?? `${req.firstName} ${req.lastName}`} is back in the pending queue.`,
      });
      invalidate();
    },
    onError: () => toast.error('Could not reopen the request.'),
  });

  const remove = useMutation({
    mutationFn: (req: AccountRequest) => deleteAccountRequest(req.id),
    onSuccess: (_res, req) => {
      toast.success('Request deleted', {
        description: `${req.company ?? `${req.firstName} ${req.lastName}`} permanently removed.`,
      });
      invalidate();
    },
    onError: () => toast.error('Could not delete the request.'),
  });

  const busy = approve.isPending || reject.isPending || reopen.isPending || remove.isPending;

  const counts = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending').length;
    const rejected = requests.filter((r) => r.status === 'rejected').length;
    return { pending, rejected };
  }, [requests]);

  const rows = useMemo(() => requests.filter((r) => r.status === filter), [requests, filter]);

  const pills: FilterPill[] = [
    { value: 'pending', label: 'Pending', count: counts.pending },
    { value: 'rejected', label: 'Rejected', count: counts.rejected },
  ];

  return (
    <div>
      <PageHeader
        title="Account requests"
        subtitle={`${counts.pending} pending · ${counts.rejected} rejected · approved buyers move to Buyer accounts`}
      />

      <FilterPills pills={pills} value={filter} onChange={(v) => setFilter(v as RequestStatus)} />

      {isLoading ? (
        <CardGridSkeleton count={4} className="flex flex-col gap-3.5" chips={4} />
      ) : rows.length === 0 ? (
        <Panel>
          <PanelBody>
            <p className="text-muted-foreground py-6 text-center text-sm">No {filter} requests.</p>
          </PanelBody>
        </Panel>
      ) : (
        <div className="flex flex-col gap-3.5">
          {rows.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              onApprove={(r) => {
                setMarkup('0');
                setApproveTarget(r);
              }}
              onReject={(r) => reject.mutate(r)}
              onReopen={(r) => reopen.mutate(r)}
              onDelete={(r) => remove.mutate(r)}
              busy={busy}
            />
          ))}
        </div>
      )}

      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        {approveTarget && (
          <DialogContent>
            <DialogTitle>Approve buyer</DialogTitle>
            <DialogDescription>
              Set the tier markup for {approveTarget.firstName} {approveTarget.lastName}. It is
              applied to every price they see — set it now so prices don’t change after they sign
              in.
            </DialogDescription>

            <div className="mt-4">
              <label className="text-foreground mb-1.5 block text-xs font-semibold">
                Tier markup %
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
              />
              <div className="bg-muted/50 mt-2 rounded-md px-3 py-2.5 text-[12.5px]">
                <strong>Example:</strong> a base price of $10 displays as{' '}
                <strong>${(10 * (1 + markupPct / 100)).toFixed(2)}</strong> for this buyer.
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setApproveTarget(null)}
                disabled={approve.isPending}
              >
                Cancel
              </Button>
              <Button onClick={() => approve.mutate(approveTarget)} disabled={approve.isPending}>
                <Check className="size-4" />
                Approve
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
