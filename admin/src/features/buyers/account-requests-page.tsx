import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, RotateCcw, Trash2 } from 'lucide-react';
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
  approveProfileEditRequest,
  buyersKeys,
  deleteAccountRequest,
  deleteProfileEditRequest,
  rejectAccountRequest,
  rejectProfileEditRequest,
  reopenAccountRequest,
  reopenProfileEditRequest,
  useAccountRequests,
  useProfileEditRequests,
  type AccountRequest,
  type AdminProfileEditRequest,
  type ProfileSnapshot,
  type RequestStatus,
} from './queries';

function DetailRow({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
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

const PROFILE_FIELDS: { key: keyof ProfileSnapshot; label: string }[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'company', label: 'Company' },
  { key: 'jobTitle', label: 'Job title' },
  { key: 'phone', label: 'Phone' },
  { key: 'country', label: 'Country' },
  { key: 'city', label: 'City' },
  { key: 'address', label: 'Address' },
];

function formatProfileField(key: keyof ProfileSnapshot, val: string | null): string {
  if (!val) return '—';
  return key === 'country' ? countryLabel(val) : val;
}

function ProfileEditRequestCard({
  req,
  onApprove,
  onReject,
  onReopen,
  onDelete,
  busy,
}: Readonly<{
  req: AdminProfileEditRequest;
  onApprove: (req: AdminProfileEditRequest) => void;
  onReject: (req: AdminProfileEditRequest) => void;
  onReopen: (req: AdminProfileEditRequest) => void;
  onDelete: (req: AdminProfileEditRequest) => void;
  busy: boolean;
}>) {
  const submitted = formatDistanceToNow(new Date(req.updatedAt), { addSuffix: true });
  const changedFields = PROFILE_FIELDS.filter(
    (f) => (req.current[f.key] ?? null) !== (req.proposed[f.key] ?? null),
  );
  const fullName =
    `${req.current.firstName ?? ''} ${req.current.lastName ?? ''}`.trim() || req.buyerEmail;

  return (
    <Panel>
      <PanelBody>
        <div className="flex flex-col gap-4">
          <div>
            <span className="mb-2 inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-violet-700 uppercase dark:bg-violet-500/15 dark:text-violet-400">
              Profile update
            </span>
            <div className="mb-1 text-[15px] font-semibold">{fullName}</div>
            <div className="text-muted-foreground mb-3 text-[13px]">
              {req.buyerEmail} · Submitted {submitted}
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-[13px] sm:grid-cols-[160px_1fr]">
              {changedFields.length === 0 ? (
                <DetailRow label="Changes">
                  <span className="text-muted-foreground">No field differences remaining</span>
                </DetailRow>
              ) : (
                changedFields.map((field) => (
                  <DetailRow key={field.key} label={field.label}>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <span className="text-muted-foreground line-through">
                        {formatProfileField(field.key, req.current[field.key])}
                      </span>
                      <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                      <span className="text-foreground font-medium">
                        {formatProfileField(field.key, req.proposed[field.key])}
                      </span>
                    </span>
                  </DetailRow>
                ))
              )}
              {req.rejectionReason && <DetailRow label="Reason">{req.rejectionReason}</DetailRow>}
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
              title="Delete this profile edit request?"
              description="This permanently removes the profile edit request. The buyer's existing profile will remain unchanged."
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
                  Approve changes
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

function RequestCard({
  req,
  onApprove,
  onReject,
  onReopen,
  onDelete,
  busy,
}: Readonly<{
  req: AccountRequest;
  onApprove: (req: AccountRequest) => void;
  onReject: (req: AccountRequest) => void;
  onReopen: (req: AccountRequest) => void;
  onDelete: (req: AccountRequest) => void;
  busy: boolean;
}>) {
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
  const { data: pendingEdits = [], isLoading: loadingPendingEdits } =
    useProfileEditRequests('pending');
  const { data: rejectedEdits = [], isLoading: loadingRejectedEdits } =
    useProfileEditRequests('rejected');
  const [filter, setFilter] = useState<RequestStatus>('pending');

  const [approveTarget, setApproveTarget] = useState<AccountRequest | null>(null);
  const [markup, setMarkup] = useState('0');
  const markupPct = Number(markup) || 0;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: buyersKeys.accountRequests });
    void queryClient.invalidateQueries({ queryKey: buyersKeys.profileEditRequests('pending') });
    void queryClient.invalidateQueries({ queryKey: buyersKeys.profileEditRequests('rejected') });
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

  const approveEdit = useMutation({
    mutationFn: (req: AdminProfileEditRequest) => approveProfileEditRequest(req.id),
    onSuccess: (_res, req) => {
      toast.success('Profile updated', {
        description: `Applied changes to ${req.buyerEmail}.`,
      });
      invalidate();
    },
    onError: () => toast.error('Could not approve profile changes.'),
  });

  const rejectEdit = useMutation({
    mutationFn: (req: AdminProfileEditRequest) => rejectProfileEditRequest(req.id),
    onSuccess: (_res, req) => {
      toast.warning('Profile edit rejected', {
        description: `Rejected changes from ${req.buyerEmail}.`,
      });
      invalidate();
    },
    onError: () => toast.error('Could not reject profile changes.'),
  });

  const reopenEdit = useMutation({
    mutationFn: (req: AdminProfileEditRequest) => reopenProfileEditRequest(req.id),
    onSuccess: (_res, req) => {
      toast.success('Moved to review', {
        description: `Profile edit from ${req.buyerEmail} is back in the pending queue.`,
      });
      invalidate();
    },
    onError: () => toast.error('Could not reopen profile edit request.'),
  });

  const removeEdit = useMutation({
    mutationFn: (req: AdminProfileEditRequest) => deleteProfileEditRequest(req.id),
    onSuccess: (_res, req) => {
      toast.success('Request deleted', {
        description: `Profile edit from ${req.buyerEmail} permanently removed.`,
      });
      invalidate();
    },
    onError: () => toast.error('Could not delete profile edit request.'),
  });

  const busy =
    approve.isPending ||
    reject.isPending ||
    reopen.isPending ||
    remove.isPending ||
    approveEdit.isPending ||
    rejectEdit.isPending ||
    reopenEdit.isPending ||
    removeEdit.isPending;

  const counts = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending').length + pendingEdits.length;
    const rejected = requests.filter((r) => r.status === 'rejected').length + rejectedEdits.length;
    return { pending, rejected };
  }, [requests, pendingEdits, rejectedEdits]);

  const rows = useMemo(() => requests.filter((r) => r.status === filter), [requests, filter]);
  const editRows = filter === 'pending' ? pendingEdits : rejectedEdits;
  const pageLoading = isLoading || loadingPendingEdits || loadingRejectedEdits;

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

      {pageLoading ? (
        <CardGridSkeleton count={4} className="flex flex-col gap-3.5" chips={4} />
      ) : rows.length === 0 && editRows.length === 0 ? (
        <Panel>
          <PanelBody>
            <p className="text-muted-foreground py-6 text-center text-sm">No {filter} requests.</p>
          </PanelBody>
        </Panel>
      ) : (
        <div className="flex flex-col gap-3.5">
          {editRows.map((req) => (
            <ProfileEditRequestCard
              key={`edit-${req.id}`}
              req={req}
              onApprove={(r) => approveEdit.mutate(r)}
              onReject={(r) => rejectEdit.mutate(r)}
              onReopen={(r) => reopenEdit.mutate(r)}
              onDelete={(r) => removeEdit.mutate(r)}
              busy={busy}
            />
          ))}
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
