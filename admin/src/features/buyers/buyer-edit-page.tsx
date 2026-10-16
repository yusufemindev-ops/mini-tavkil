import { type ReactNode, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { Check, ChevronRight, Minus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { COUNTRIES, countryName, getCountry } from '@repo/countries';
import { WhatsAppIcon } from '@repo/icons';
import { PageHeader } from '@/components/ui/page-header';
import { Panel, PanelBody, PanelHead } from '@/components/ui/panel';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { SelectMenu } from '@/components/ui/select-menu';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { TwoCol, RightStack } from '@/components/ui/two-col';
import { Field, FieldError, FieldHelp, FieldLabel, FormRow } from '@/components/ui/field';
import { ApiError } from '@/lib/api/client';
import { apiFieldErrors } from '@/lib/api/field-errors';
import { EditPageSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/features/auth/use-permissions';
import { buyerTotal, money } from '@/features/orders/queries';
import { OnlineStatus } from './online-status';
import {
  buyersKeys,
  deleteBuyer,
  setBuyerSuspended,
  setBuyerVerified,
  updateBuyer,
  useBuyer,
  useBuyerOrders,
  type Buyer,
} from './queries';

const countryOptions = COUNTRIES.map((c) => ({
  value: c.code,
  label: `${c.flag} ${countryName(c, 'en')}`,
}));

const countryLabel = (code: string): string => {
  const c = code ? getCountry(code) : undefined;
  return c ? `${c.flag} ${countryName(c, 'en')}` : code;
};

const waHref = (phone: string): string => `https://wa.me/${phone.replace(/\D/g, '')}`;

function ReadValue({ children }: { children?: ReactNode }) {
  const empty = children === null || children === undefined || children === '';
  return (
    <div className="text-foreground min-h-9 py-[7px] text-sm">
      {empty ? <span className="text-muted-foreground">—</span> : children}
    </div>
  );
}

export function BuyerEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: buyer, isLoading } = useBuyer(id ?? '', !!id);

  if (isLoading) {
    return <EditPageSkeleton actions={1} />;
  }

  if (!buyer) {
    return <div className="text-muted-foreground p-8">Buyer not found.</div>;
  }

  return <BuyerEditForm key={buyer.id} buyer={buyer} />;
}

function BuyerEditForm({ buyer }: { buyer: Buyer }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canEdit = can('buyers:edit');
  const canDisable = can('buyers:disable');

  const { data: buyerOrders = [], isLoading: ordersLoading } = useBuyerOrders(
    buyer.id,
    buyer.orders > 0,
  );

  const suspended = buyer.status === 'suspended';

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(buyer.firstName ?? '');
  const [lastName, setLastName] = useState(buyer.lastName ?? '');
  const [company, setCompany] = useState(buyer.company ?? '');
  const [jobTitle, setJobTitle] = useState(buyer.jobTitle ?? '');
  const [phone, setPhone] = useState(buyer.phone ?? '');
  const [country, setCountry] = useState(buyer.countryCode ?? '');
  const [city, setCity] = useState(buyer.city ?? '');
  const [address, setAddress] = useState(buyer.address ?? '');
  const [markup, setMarkup] = useState(String(buyer.tierMarkup));
  const [notes, setNotes] = useState(buyer.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const clearError = (k: string) => setErrors((p) => ({ ...p, [k]: undefined }));
  const markupPct = Number(markup) || 0;

  const resetForm = () => {
    setFirstName(buyer.firstName ?? '');
    setLastName(buyer.lastName ?? '');
    setCompany(buyer.company ?? '');
    setJobTitle(buyer.jobTitle ?? '');
    setPhone(buyer.phone ?? '');
    setCountry(buyer.countryCode ?? '');
    setCity(buyer.city ?? '');
    setAddress(buyer.address ?? '');
    setMarkup(String(buyer.tierMarkup));
    setNotes(buyer.notes ?? '');
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: buyersKeys.detail(buyer.id) });
    void queryClient.invalidateQueries({ queryKey: buyersKeys.all });
  };

  const save = useMutation({
    mutationFn: () =>
      updateBuyer(buyer.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim() || null,
        jobTitle: jobTitle.trim() || null,
        phone: phone.trim() || null,
        country: country || undefined,
        city: city.trim() || null,
        address: address.trim() || null,
        tierMarkup: Number(markup) || 0,
        notes: notes.trim() || null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(buyersKeys.detail(buyer.id), updated);
      toast.success('Buyer saved', { description: 'Changes have been applied.' });
      setIsEditing(false);
      invalidate();
    },
    onError: (err) => {
      const fieldErrors = apiFieldErrors(err, {
        keyFor: (path) => {
          if (path[0] === 'tierMarkup') return 'markup';
          const last = path[path.length - 1];
          return typeof last === 'string' ? last : undefined;
        },
        allowed: [
          'firstName',
          'lastName',
          'company',
          'jobTitle',
          'phone',
          'city',
          'address',
          'markup',
        ],
      });
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        toast.error('Please fix the highlighted fields.');
        return;
      }
      toast.error(err instanceof ApiError ? err.message : 'Could not save the buyer.');
    },
  });

  const suspend = useMutation({
    mutationFn: () => setBuyerSuspended(buyer.id, !suspended),
    onSuccess: (updated) => {
      queryClient.setQueryData(buyersKeys.detail(buyer.id), updated);
      toast[suspended ? 'success' : 'warning'](
        suspended ? 'Account reactivated' : 'Account suspended',
        { description: suspended ? 'Buyer can sign in again.' : 'Buyer can no longer sign in.' },
      );
      invalidate();
    },
    onError: () => toast.error('Could not change the account status.'),
  });

  const remove = useMutation({
    mutationFn: () => deleteBuyer(buyer.id),
    onSuccess: () => {
      toast.success('Account deleted', { description: 'This buyer was permanently removed.' });
      void queryClient.invalidateQueries({ queryKey: buyersKeys.all });
      navigate('/buyer-accounts');
    },
    onError: () => toast.error('Could not delete the buyer.'),
  });

  const verify = useMutation({
    mutationFn: () => setBuyerVerified(buyer.id, !buyer.verified),
    onSuccess: (updated) => {
      queryClient.setQueryData(buyersKeys.detail(buyer.id), updated);
      toast.success(buyer.verified ? 'Buyer unverified' : 'Buyer verified');
      invalidate();
    },
    onError: () => toast.error('Could not change verification.'),
  });

  const onCancel = () => {
    resetForm();
    setIsEditing(false);
  };

  const heading = buyer.company ?? buyer.contactName;
  const joined = formatDistanceToNow(new Date(buyer.createdAt), { addSuffix: true });

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="text-muted-foreground mb-3 flex items-center gap-1.5 text-sm">
        <Link to="/buyer-accounts" className="hover:text-foreground">
          Buyer accounts
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{heading}</span>
      </div>

      <PageHeader
        title={heading}
        actions={
          isEditing ? (
            <>
              <Button variant="outline" onClick={onCancel} disabled={save.isPending}>
                Cancel
              </Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                <Check className="size-4" />
                Save changes
              </Button>
            </>
          ) : canEdit ? (
            <Button onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null
        }
      />

      <div className="-mt-4 mb-6">
        <OnlineStatus lastSeenAt={buyer.lastSeenAt} hasActiveSession={buyer.hasActiveSession} />
      </div>

      <TwoCol>
        <div className="flex flex-col gap-[18px]">
          <Panel>
            <PanelHead title="Profile information" />
            <PanelBody>
              <FormRow>
                <Field>
                  <FieldLabel>First name</FieldLabel>
                  {isEditing ? (
                    <Input
                      value={firstName}
                      aria-invalid={!!errors.firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        clearError('firstName');
                      }}
                    />
                  ) : (
                    <ReadValue>{firstName}</ReadValue>
                  )}
                  {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>Last name</FieldLabel>
                  {isEditing ? (
                    <Input
                      value={lastName}
                      aria-invalid={!!errors.lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        clearError('lastName');
                      }}
                    />
                  ) : (
                    <ReadValue>{lastName}</ReadValue>
                  )}
                  {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
                </Field>
              </FormRow>
              <FormRow>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <ReadValue>{buyer.email}</ReadValue>
                  <FieldHelp>Google sign-in email — cannot be changed.</FieldHelp>
                </Field>
                <Field>
                  <FieldLabel>Phone</FieldLabel>
                  {isEditing ? (
                    <>
                      <Input
                        type="tel"
                        value={phone}
                        aria-invalid={!!errors.phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          clearError('phone');
                        }}
                      />
                      {errors.phone && <FieldError>{errors.phone}</FieldError>}
                    </>
                  ) : (
                    <ReadValue>
                      {phone ? (
                        <span className="inline-flex items-center gap-2">
                          {phone}
                          <a
                            href={waHref(phone)}
                            target="_blank"
                            rel="noreferrer"
                            title="Open WhatsApp chat"
                            className="inline-flex text-[#25D366] hover:opacity-80"
                          >
                            <WhatsAppIcon className="size-[18px]" />
                          </a>
                        </span>
                      ) : null}
                    </ReadValue>
                  )}
                </Field>
              </FormRow>
              <FormRow>
                <Field>
                  <FieldLabel>Company</FieldLabel>
                  {isEditing ? (
                    <Input
                      value={company}
                      aria-invalid={!!errors.company}
                      onChange={(e) => {
                        setCompany(e.target.value);
                        clearError('company');
                      }}
                    />
                  ) : (
                    <ReadValue>{company}</ReadValue>
                  )}
                  {errors.company && <FieldError>{errors.company}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>Job title</FieldLabel>
                  {isEditing ? (
                    <Input
                      value={jobTitle}
                      aria-invalid={!!errors.jobTitle}
                      onChange={(e) => {
                        setJobTitle(e.target.value);
                        clearError('jobTitle');
                      }}
                    />
                  ) : (
                    <ReadValue>{jobTitle}</ReadValue>
                  )}
                  {errors.jobTitle && <FieldError>{errors.jobTitle}</FieldError>}
                </Field>
              </FormRow>
              <FormRow className="mb-0">
                <Field className="mb-0">
                  <FieldLabel>Country</FieldLabel>
                  {isEditing ? (
                    <SelectMenu
                      value={country}
                      onValueChange={setCountry}
                      options={countryOptions}
                      placeholder="Select a country…"
                    />
                  ) : (
                    <ReadValue>{country ? countryLabel(country) : null}</ReadValue>
                  )}
                </Field>
                <Field className="mb-0">
                  <FieldLabel>City</FieldLabel>
                  {isEditing ? (
                    <Input
                      value={city}
                      aria-invalid={!!errors.city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        clearError('city');
                      }}
                    />
                  ) : (
                    <ReadValue>{city}</ReadValue>
                  )}
                  {errors.city && <FieldError>{errors.city}</FieldError>}
                </Field>
              </FormRow>
              <Field className="mt-3.5">
                <FieldLabel>Address</FieldLabel>
                {isEditing ? (
                  <Input
                    value={address}
                    aria-invalid={!!errors.address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      clearError('address');
                    }}
                  />
                ) : (
                  <ReadValue>{address}</ReadValue>
                )}
                {errors.address && <FieldError>{errors.address}</FieldError>}
              </Field>
              <Field className="mb-0">
                <FieldLabel>Joined</FieldLabel>
                <ReadValue>{joined}</ReadValue>
              </Field>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead
              title="Order history"
              action={
                buyer.orders > 0 ? (
                  <Link to="/orders" className="text-primary text-xs hover:underline">
                    View in Orders inbox →
                  </Link>
                ) : undefined
              }
            />
            {buyer.orders === 0 ? (
              <PanelBody>
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No orders yet — this buyer hasn’t submitted a request.
                </p>
              </PanelBody>
            ) : ordersLoading ? (
              <PanelBody tight>
                <TableSkeleton
                  rows={4}
                  columns={[
                    { header: 'Order #', cell: 'code' },
                    { header: 'Date', cell: 'text' },
                    { header: 'Total', cell: 'number' },
                    { header: 'Status', cell: 'badge' },
                  ]}
                />
              </PanelBody>
            ) : (
              <PanelBody tight>
                <Table>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyerOrders.map((o) => (
                      <tr
                        key={o.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/orders/${o.id}`)}
                      >
                        <td>
                          <strong className="font-mono text-xs">{o.orderNumber}</strong>
                        </td>
                        <td className="text-muted-foreground text-xs">
                          {format(new Date(o.submittedAt), 'd MMM yyyy')}
                        </td>
                        <td>{money(buyerTotal(o), o.currency)}</td>
                        <td>
                          <StatusBadge status={o.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </PanelBody>
            )}
          </Panel>

          <Panel>
            <PanelHead title="Internal notes" />
            <PanelBody>
              <Field className="mb-0">
                <FieldLabel>Notes</FieldLabel>
                {isEditing ? (
                  <Textarea
                    rows={6}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Prefers Turkish-language invoices. Big order expected in Q3."
                  />
                ) : (
                  <ReadValue>
                    {notes ? <span className="whitespace-pre-wrap">{notes}</span> : null}
                  </ReadValue>
                )}
                <FieldHelp>Visible to admins only.</FieldHelp>
              </Field>
            </PanelBody>
          </Panel>
        </div>

        <RightStack>
          <Panel className="border-primary/30">
            <PanelHead title="Tier markup" />
            <PanelBody>
              <Field>
                <FieldLabel required>Tier markup %</FieldLabel>
                {isEditing ? (
                  <>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={markup}
                      aria-invalid={!!errors.markup}
                      onChange={(e) => {
                        setMarkup(e.target.value);
                        clearError('markup');
                      }}
                    />
                    {errors.markup && <FieldError>{errors.markup}</FieldError>}
                  </>
                ) : (
                  <ReadValue>
                    <span className="font-semibold">{markupPct}%</span>
                  </ReadValue>
                )}
                <FieldHelp>Applied to base prices for every product this buyer sees.</FieldHelp>
              </Field>
              <div className="bg-muted/50 rounded-md px-3 py-2.5 text-[12.5px]">
                <strong>Example:</strong> a base price of $10 displays as{' '}
                <strong>${(10 * (1 + markupPct / 100)).toFixed(2)}</strong> for this buyer.
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Account state" />
            <PanelBody>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <div>
                  <Badge variant={suspended ? 'destructive' : 'success'}>
                    {suspended ? 'Suspended' : 'Active'}
                  </Badge>
                </div>
                <FieldHelp>
                  Suspended buyers cannot sign in (sessions are revoked). Change this in the danger
                  zone below.
                </FieldHelp>
              </Field>
              <Field>
                <FieldLabel>Verification</FieldLabel>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={buyer.verified ? 'success' : 'secondary'}>
                    {buyer.verified ? 'Verified' : 'Unverified'}
                  </Badge>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => verify.mutate()}
                      disabled={verify.isPending}
                    >
                      {buyer.verified ? 'Mark unverified' : 'Mark verified'}
                    </Button>
                  )}
                </div>
                <FieldHelp>
                  Verify a buyer after manually confirming their identity (e.g. on WhatsApp).
                </FieldHelp>
              </Field>
              <Field className="mb-0">
                <FieldLabel>Sign-in method</FieldLabel>
                <div className="flex items-center gap-2 text-[13px]">
                  {buyer.googleConnected ? (
                    <Badge variant="success">
                      <Check className="size-2.5" />
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Minus className="size-2.5" />
                    </Badge>
                  )}
                  <span className={buyer.googleConnected ? '' : 'text-muted-foreground'}>
                    Google{' '}
                    <span className="text-muted-foreground text-xs">
                      ({buyer.googleConnected ? 'connected' : 'not signed in yet'})
                    </span>
                  </span>
                </div>
                <FieldHelp>Buyers sign in with Google only.</FieldHelp>
              </Field>
            </PanelBody>
          </Panel>

          {canDisable && (
            <Panel className="border-destructive/20">
              <PanelHead
                title={<span className="text-destructive">Danger zone</span>}
                className="border-destructive/20"
              />
              <PanelBody className="flex flex-col gap-2">
                {suspended ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => suspend.mutate()}
                    disabled={suspend.isPending}
                  >
                    Reactivate account
                  </Button>
                ) : (
                  <ConfirmDialog
                    trigger={
                      <Button variant="destructive" size="sm" disabled={suspend.isPending}>
                        Suspend account
                      </Button>
                    }
                    title="Suspend this account?"
                    description="The buyer will be signed out and cannot sign in until reactivated."
                    confirmLabel="Suspend account"
                    destructive
                    onConfirm={() => suspend.mutate()}
                  />
                )}
                <ConfirmDialog
                  trigger={
                    <Button variant="destructive" size="sm" disabled={remove.isPending}>
                      Delete account
                    </Button>
                  }
                  title="Delete this account?"
                  description="This permanently removes the buyer and all their data. This cannot be undone."
                  confirmLabel="Delete account"
                  destructive
                  onConfirm={() => remove.mutate()}
                />
              </PanelBody>
            </Panel>
          )}
        </RightStack>
      </TwoCol>
    </div>
  );
}
