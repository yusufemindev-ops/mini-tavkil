import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Plus,
  ToggleLeft,
  ToggleRight,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { countryName, getCountry } from '@repo/countries';
import { PageHeader } from '@/components/ui/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Table } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { pickTranslation } from '@/features/categories/translations';
import {
  publishSupplier,
  suppliersKeys,
  unpublishSupplier,
  useSuppliers,
  type AdminSupplier,
} from './queries';

function countryLabel(code: string): string {
  const c = getCountry(code);
  return c ? `${c.flag} ${countryName(c, 'en')}` : code;
}

// wa.me requires a digits-only international number (no +, spaces, or dashes).
function whatsappUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

// Prefer an explicit map URL; otherwise fall back to a Google Maps search.
function googleMapsUrl(supplier: AdminSupplier): string | null {
  if (supplier.mapUrl) return supplier.mapUrl;
  if (supplier.address)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(supplier.address)}`;
  return null;
}

// One read-only contact card in the expanded panel: a rounded tile with an icon
// badge, a label + value, and an optional action button on the right.
function ContactCell({
  icon,
  label,
  value,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-card border-border flex items-center gap-3 rounded-lg border p-3">
      <span className="bg-primary-soft text-primary flex size-9 flex-none items-center justify-center rounded-full">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-[10.5px] font-semibold uppercase tracking-wide">
          {label}
        </div>
        {value ? (
          <div className="text-foreground truncate text-[13px]" title={value}>
            {value}
          </div>
        ) : (
          <div className="text-muted-foreground/60 text-[13px] italic">Not provided</div>
        )}
      </div>
      {value && action}
    </div>
  );
}

// Compact square action button styled as a link (used inside ContactCell).
function actionLinkClass(): string {
  return cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-none px-2.5');
}

// Quiet, borderless icon actions — matches the Categories list column. View
// products · Publish/Unpublish toggle · Edit, each with a tooltip.
const ICON_BTN =
  'text-muted-foreground hover:bg-muted hover:text-foreground grid size-8 place-items-center rounded-md transition-colors';

function RowActions({
  supplier,
  onEdit,
  onViewProducts,
  onTogglePublish,
  busy,
}: {
  supplier: AdminSupplier;
  onEdit: () => void;
  onViewProducts: () => void;
  onTogglePublish: () => void;
  busy: boolean;
}) {
  const published = supplier.status === 'published';
  const publishLabel = published ? 'Unpublish' : 'Publish';
  const n = supplier.productCount;
  const hasProducts = n > 0;
  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip
        content={
          hasProducts ? `View ${n} product${n === 1 ? '' : 's'}` : 'No products for this supplier'
        }
      >
        <button
          type="button"
          aria-label="View products"
          onClick={(e) => {
            e.stopPropagation();
            if (hasProducts) onViewProducts();
          }}
          className={cn(ICON_BTN, !hasProducts && 'cursor-not-allowed opacity-40')}
        >
          <Package className="size-4" />
        </button>
      </Tooltip>
      <Tooltip content={busy ? `${publishLabel}…` : publishLabel}>
        <button
          type="button"
          aria-label={publishLabel}
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePublish();
          }}
          className={cn(ICON_BTN, 'disabled:pointer-events-none disabled:opacity-60')}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : published ? (
            <ToggleRight className="text-success size-4" />
          ) : (
            <ToggleLeft className="size-4" />
          )}
        </button>
      </Tooltip>
      <Tooltip content="Edit">
        <button
          type="button"
          aria-label="Edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className={ICON_BTN}
        >
          <Pencil className="size-4" />
        </button>
      </Tooltip>
    </div>
  );
}

export function SuppliersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: suppliers = [], isLoading } = useSuppliers();
  // Multiple rows can stay open at once — toggle each id independently.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  // Publish/unpublish straight from the table. Refetch inside the mutation so the
  // row's spinner stays until the list reflects the new status (no icon flash).
  const setPublish = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      await (publish ? publishSupplier(id) : unpublishSupplier(id));
      await queryClient.invalidateQueries({ queryKey: suppliersKeys.all });
    },
    onSuccess: (_data, { publish }) => toast.success(publish ? 'Published' : 'Unpublished'),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not change status.'),
  });
  const busyId = setPublish.isPending ? setPublish.variables?.id : undefined;

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function nameOf(supplier: AdminSupplier): string {
    return pickTranslation(supplier.translations)?.name || 'Untitled supplier';
  }

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle="Internal records · Not shown publicly"
        actions={
          <Button onClick={() => navigate('/suppliers/new')}>
            <Plus className="size-4" />
            New supplier
          </Button>
        }
      />

      <Panel>
        <PanelBody tight>
          {isLoading ? (
            <TableSkeleton
              rows={10}
              columns={[
                { header: 'Supplier', cell: 'text' },
                { header: 'Country', cell: 'text' },
                { header: 'Verified', cell: 'badge' },
                { header: 'Status', cell: 'badge' },
              ]}
            />
          ) : suppliers.length === 0 ? (
            <EmptyState
              icon={<Truck className="size-6" />}
              title="No suppliers yet"
              description="Add your first supplier to link products to their manufacturer."
              action={
                <Button onClick={() => navigate('/suppliers/new')}>
                  <Plus className="size-4" />
                  New supplier
                </Button>
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className="w-9" />
                  <th>Supplier</th>
                  <th>Country</th>
                  <th>Verified</th>
                  <th>Status</th>
                  <th className="!text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => {
                  const isExpanded = expandedIds.has(supplier.id);
                  const mapUrl = googleMapsUrl(supplier);
                  return (
                    <Fragment key={supplier.id}>
                      <tr
                        onClick={() => toggleExpanded(supplier.id)}
                        className={cn('cursor-pointer', isExpanded && 'bg-muted/30')}
                      >
                        <td>
                          <ChevronDown
                            className={cn(
                              'text-muted-foreground size-4 transition-transform',
                              isExpanded && 'rotate-180',
                            )}
                          />
                        </td>
                        <td>
                          <div className="font-medium">{nameOf(supplier)}</div>
                          {supplier.website && (
                            <div className="text-muted-foreground text-[11.5px]">
                              {supplier.website.replace(/^https?:\/\//, '')}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap">{countryLabel(supplier.countryCode)}</td>
                        <td>
                          {supplier.isVerified ? (
                            <Badge variant="success">
                              <Check className="size-2.5" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Unverified</Badge>
                          )}
                        </td>
                        <td>
                          {supplier.status === 'published' ? (
                            <Badge variant="success">Published</Badge>
                          ) : (
                            <Badge variant="warning">Draft</Badge>
                          )}
                        </td>
                        <td>
                          <RowActions
                            supplier={supplier}
                            onEdit={() => navigate(`/suppliers/${supplier.id}`)}
                            onViewProducts={() => navigate(`/products?supplier=${supplier.id}`)}
                            onTogglePublish={() =>
                              setPublish.mutate({
                                id: supplier.id,
                                publish: supplier.status !== 'published',
                              })
                            }
                            busy={busyId === supplier.id}
                          />
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="hover:bg-transparent">
                          <td colSpan={6} className="bg-muted/30 p-0">
                            <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
                              <ContactCell
                                icon={<Phone className="size-4" />}
                                label="Phone"
                                value={supplier.contactPhoneInternal}
                                action={
                                  supplier.contactPhoneInternal && (
                                    <a
                                      href={whatsappUrl(supplier.contactPhoneInternal)}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Message on WhatsApp"
                                      className={actionLinkClass()}
                                    >
                                      <MessageCircle className="size-4" />
                                    </a>
                                  )
                                }
                              />
                              <ContactCell
                                icon={<Mail className="size-4" />}
                                label="Email"
                                value={supplier.contactEmailInternal}
                                action={
                                  supplier.contactEmailInternal && (
                                    <a
                                      href={`mailto:${supplier.contactEmailInternal}`}
                                      title="Send email"
                                      className={actionLinkClass()}
                                    >
                                      <Mail className="size-4" />
                                    </a>
                                  )
                                }
                              />
                              <ContactCell
                                icon={<MapPin className="size-4" />}
                                label="Address"
                                value={supplier.address}
                                action={
                                  mapUrl && (
                                    <a
                                      href={mapUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="View on Google Maps"
                                      className={actionLinkClass()}
                                    >
                                      <ExternalLink className="size-4" />
                                    </a>
                                  )
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </Table>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
