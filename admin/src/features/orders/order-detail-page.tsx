import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Check, ChevronRight, Eye, Info, RotateCcw, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Panel, PanelHead, PanelBody } from '@/components/ui/panel';
import { Table } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, FieldLabel, FieldHelp } from '@/components/ui/field';
import { TwoCol, RightStack } from '@/components/ui/two-col';
import { EditPageSkeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/client';
import {
  buildConfirmPayload,
  confirmOrder,
  defaultBuyerPrice,
  markupAllPrices,
  money,
  orderBuyerTotal,
  ordersKeys,
  rejectOrder,
  useInvalidateOrders,
  useOrder,
  type AdminOrder,
} from './queries';

const STATUS_HINT: Record<string, string> = {
  submitted: 'Awaiting your confirmation',
  confirmed: 'Awaiting the buyer’s response',
  accepted: 'The buyer accepted this quote',
  rejected: 'The order was rejected',
  expired: 'No response in time',
};

function activity(order: AdminOrder): { label: string; when: string }[] {
  const at = (iso: string | null) => iso?.slice(0, 16).replace('T', ' ') ?? '';
  const out = [{ label: 'Submitted', when: at(order.submittedAt) }];
  if (order.confirmedAt) out.push({ label: 'Confirmed', when: at(order.confirmedAt) });
  if (order.acceptedAt) out.push({ label: 'Accepted by buyer', when: at(order.acceptedAt) });
  if (order.rejectedAt) out.push({ label: 'Rejected', when: at(order.rejectedAt) });
  if (order.expiredAt) out.push({ label: 'Expired', when: at(order.expiredAt) });
  return out;
}

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(id ?? '', !!id);

  if (isLoading) return <EditPageSkeleton actions={2} />;

  if (!order) {
    return (
      <div>
        <PageHeader title="Order not found" />
        <Panel>
          <EmptyState
            icon={<Info className="size-6" />}
            title="Order not found"
            description="This order may have been removed."
            action={
              <Button variant="outline" onClick={() => navigate('/orders')}>
                Back to orders inbox
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }

  return <OrderDetail key={`${order.id}-${order.status}`} order={order} />;
}

function OrderDetail({ order }: { order: AdminOrder }) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateOrders();
  const editable = order.status === 'submitted' || order.status === 'confirmed';
  const reconfirming = order.status === 'confirmed';

  const seedMarkup = order.confirmedMarkupPercent ?? order.tierMarkupAtSubmit ?? 0;
  const [buyerPrices, setBuyerPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      order.items.map((i) => [
        i.id,
        String(i.unitPriceFinal ?? defaultBuyerPrice(i.unitPriceBase, seedMarkup)),
      ]),
    ),
  );
  const [adminNote, setAdminNote] = useState(order.notesAdmin ?? '');

  const baseSubtotal = useMemo(
    () => order.items.reduce((sum, i) => sum + i.unitPriceBase * i.quantity, 0),
    [order.items],
  );
  const buyerTotalAmount = useMemo(
    () => orderBuyerTotal(order.items, buyerPrices),
    [order.items, buyerPrices],
  );

  const confirm = useMutation({
    mutationFn: () =>
      confirmOrder(
        order.id,
        buildConfirmPayload(order.items, buyerPrices, seedMarkup, adminNote.trim() || null),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(ordersKeys.detail(order.id), updated);
      toast.success('Order confirmed');
      invalidate(order.id);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not confirm the order.'),
  });

  const reject = useMutation({
    mutationFn: (reason: string | null) => rejectOrder(order.id, reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(ordersKeys.detail(order.id), updated);
      toast.success('Order rejected');
      invalidate(order.id);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not reject the order.'),
  });

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const submitReject = () => {
    reject.mutate(rejectReason.trim() || null);
    setRejectOpen(false);
    setRejectReason('');
  };

  const busy = confirm.isPending || reject.isPending;

  return (
    <div className="mx-auto max-w-[1200px]">
      <nav className="text-muted-foreground mb-3 flex items-center gap-1.5 text-[12.5px]">
        <Link to="/orders" className="hover:text-foreground transition-colors">
          Orders inbox
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="text-foreground font-mono">{order.orderNumber}</span>
      </nav>

      <PageHeader
        title={order.orderNumber}
        subtitle={`From ${order.buyer.company ?? order.buyer.name}`}
        actions={
          editable ? (
            <>
              <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={busy}>
                <X className="size-3.5" />
                Reject
              </Button>
              <Button onClick={() => confirm.mutate()} disabled={busy}>
                <Check className="size-3.5" />
                {reconfirming ? 'Update quote' : 'Confirm order'}
              </Button>
            </>
          ) : undefined
        }
      />

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogTitle>Reject this order?</DialogTitle>
          <DialogDescription>
            The buyer will see this order as rejected. Add an optional reason — they will see it.
          </DialogDescription>
          <Textarea
            className="mt-3"
            rows={3}
            placeholder="Reason (optional) — e.g. this price is no longer available"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              size="sm"
              onClick={submitReject}
              disabled={reject.isPending}
            >
              <X className="size-3.5" />
              Reject order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-1.5">
        <StatusBadge status={order.status} />
        <span className="text-muted-foreground ms-2 text-xs">{STATUS_HINT[order.status]}</span>
      </div>

      <TwoCol>
        <div className="flex flex-col gap-[18px]">
          <Panel>
            <PanelHead
              title="Line items"
              action={
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">
                    {order.items.length === 1 ? '1 item' : `${order.items.length} items`} ·{' '}
                    {editable ? 'buyer prices editable' : 'frozen'}
                  </span>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => setBuyerPrices(markupAllPrices(order.items, seedMarkup))}
                      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                    >
                      <RotateCcw className="size-3" />
                      Reset to {seedMarkup}% tier
                    </button>
                  )}
                </div>
              }
            />
            <Table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="w-16">Qty</th>
                  <th className="w-[100px]">Base price</th>
                  <th className="w-[120px] whitespace-nowrap">Buyer price</th>
                  <th className="w-[150px]">Total (buyer price)</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => {
                  const buyerPrice = Number(buyerPrices[i.id]) || 0;
                  return (
                    <tr key={i.id}>
                      <td>
                        <div className="flex items-start gap-2.5">
                          {i.imageUrl ? (
                            <img
                              src={i.imageUrl}
                              alt={i.name}
                              className="border-border size-9 flex-none rounded border object-cover"
                            />
                          ) : (
                            <div className="border-border bg-muted size-9 flex-none rounded border" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{i.name}</span>
                              <Link
                                to={`/preview/product/${i.productId}`}
                                target="_blank"
                                title="Preview product"
                                aria-label={`Preview ${i.name}`}
                                className="text-muted-foreground hover:text-primary flex-none"
                              >
                                <Eye className="size-3.5" />
                              </Link>
                            </div>
                            {i.options.length > 0 && (
                              <div className="text-muted-foreground mt-0.5 flex flex-col gap-y-0.5 text-[11.5px]">
                                {i.options.map((o) => (
                                  <span key={o.name}>
                                    <span className="opacity-70">{o.name}:</span>{' '}
                                    <span className="text-foreground font-medium">{o.value}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="text-muted-foreground text-[11.5px]">
                              {i.quantity} {i.unit}
                              {i.buyerNote ? ` · “${i.buyerNote}”` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{i.quantity}</td>
                      <td className="text-muted-foreground font-mono text-[12.5px]">
                        {money(i.unitPriceBase, order.currency)}
                      </td>
                      <td>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!editable}
                          aria-label={`Buyer price per unit for ${i.name}`}
                          className="h-[30px] text-[12.5px]"
                          value={buyerPrices[i.id] ?? ''}
                          onChange={(e) =>
                            setBuyerPrices((prev) => ({ ...prev, [i.id]: e.target.value }))
                          }
                        />
                      </td>
                      <td>
                        <strong>{money(buyerPrice * i.quantity, order.currency)}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Panel>

          {order.notesBuyer && (
            <Panel>
              <PanelHead title="Buyer's note" />
              <PanelBody>
                <p className="text-[13.5px] leading-relaxed">“{order.notesBuyer}”</p>
              </PanelBody>
            </Panel>
          )}

          <Panel>
            <PanelHead title="Admin note" />
            <PanelBody>
              <Field className="mb-0">
                <FieldLabel>Internal / quote note</FieldLabel>
                <Textarea
                  rows={3}
                  disabled={!editable}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Optional internal note saved with this order confirmation."
                />
              </Field>
            </PanelBody>
          </Panel>

          {order.rejectionReason && (
            <Panel className="border-destructive/30">
              <PanelHead title="Rejection reason" className="border-destructive/30" />
              <PanelBody>
                <p className="text-[13.5px] leading-relaxed">“{order.rejectionReason}”</p>
              </PanelBody>
            </Panel>
          )}
        </div>

        <RightStack>
          <Panel>
            <PanelHead
              title="Pricing"
              action={
                <Link
                  to={`/buyer-accounts/${order.buyer.id}`}
                  className="text-primary text-xs hover:underline"
                >
                  Buyer profile →
                </Link>
              }
            />
            <PanelBody>
              <Field>
                <FieldLabel>Buyer tier markup (default)</FieldLabel>
                <Input value={`${order.tierMarkupAtSubmit}%`} disabled className="bg-muted/50" />
                <FieldHelp>Captured from the buyer’s account at submit.</FieldHelp>
              </Field>
              <div className="border-border border-t pt-3.5 text-[13px]">
                <div className="mb-1.5 flex justify-between">
                  <span className="text-muted-foreground">Total (base price)</span>
                  <span>{money(baseSubtotal, order.currency)}</span>
                </div>
                <div className="border-border flex justify-between border-t pt-2 text-[15px] font-semibold">
                  <span>Total (buyer price)</span>
                  <span className="text-primary">{money(buyerTotalAmount, order.currency)}</span>
                </div>
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Activity" />
            <PanelBody className="flex flex-col gap-2.5 px-[18px] py-3 text-[12.5px]">
              {activity(order).map((ev, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3">
                  <strong>{ev.label}</strong>
                  <span className="text-muted-foreground flex-none">{ev.when}</span>
                </div>
              ))}
            </PanelBody>
          </Panel>
        </RightStack>
      </TwoCol>
    </div>
  );
}
