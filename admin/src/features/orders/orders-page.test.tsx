import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrdersPage } from './orders-page';
import { OrderDetailPage } from './order-detail-page';
import type { AdminOrder } from './queries';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockUseOrders = vi.fn<() => { data?: AdminOrder[]; isLoading: boolean }>();
const mockUseOrder = vi.fn<() => { data?: AdminOrder; isLoading: boolean; isError: boolean }>();

vi.mock('./queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./queries')>();
  return {
    ...actual,
    useOrders: () => mockUseOrders(),
    useOrder: () => mockUseOrder(),
  };
});

describe('OrdersPage & OrderDetailPage components', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockUseOrders.mockReset();
    mockUseOrder.mockReset();
  });

  afterEach(() => {
    container.remove();
  });

  it('renders submitted orders in To confirm tab and switches to Awaiting buyer tab', () => {
    const nowIso = new Date().toISOString();
    mockUseOrders.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 'ord-1',
          orderNumber: 'ORD-2026-0001',
          status: 'submitted',
          buyer: {
            id: 'buy-1',
            name: 'Ahmet Yilmaz',
            company: 'Anatolia Hydraulics Ltd.',
            tierMarkup: 15,
          },
          tierMarkupAtSubmit: 15,
          confirmedMarkupPercent: null,
          currency: 'USD',
          submittedSubtotal: 1150,
          confirmedSubtotal: null,
          confirmedGrandTotal: null,
          items: [
            {
              id: 'item-1',
              productId: 'prod-1',
              name: 'HP-AX100 Axial Piston Pump',
              imageUrl: null,
              unit: 'unit',
              moq: 1,
              quantity: 5,
              unitPriceBase: 200,
              unitPriceFinal: null,
              lineSubtotal: null,
              currency: 'USD',
              options: [],
              buyerNote: null,
            },
          ],
          notesBuyer: null,
          notesAdmin: null,
          rejectionReason: null,
          assignedUserId: null,
          submittedAt: nowIso,
          confirmedAt: null,
          acceptedAt: null,
          rejectedAt: null,
          expiredAt: null,
        },
        {
          id: 'ord-2',
          orderNumber: 'ORD-2026-0002',
          status: 'confirmed',
          buyer: {
            id: 'buy-2',
            name: 'Sara Al-Mansoor',
            company: 'Gulf Industrial Co.',
            tierMarkup: 10,
          },
          tierMarkupAtSubmit: 10,
          confirmedMarkupPercent: 10,
          currency: 'USD',
          submittedSubtotal: 550,
          confirmedSubtotal: 525,
          confirmedGrandTotal: 525,
          items: [],
          notesBuyer: null,
          notesAdmin: 'Special discount',
          rejectionReason: null,
          assignedUserId: null,
          submittedAt: nowIso,
          confirmedAt: nowIso,
          acceptedAt: null,
          rejectedAt: null,
          expiredAt: null,
        },
      ],
    });

    const root = createRoot(container);
    act(() => {
      root.render(
        <MemoryRouter>
          <OrdersPage />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('ORD-2026-0001');
    expect(container.textContent).toContain('Anatolia Hydraulics Ltd.');
    expect(container.textContent).toContain('$1,150.00');
    expect(container.textContent).not.toContain('ORD-2026-0002');

    const awaitingBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Awaiting buyer'),
    );
    expect(awaitingBtn).toBeDefined();

    act(() => {
      awaitingBtn!.click();
    });

    expect(container.textContent).toContain('ORD-2026-0002');
    expect(container.textContent).toContain('Gulf Industrial Co.');
    expect(container.textContent).toContain('$525.00');

    act(() => {
      root.unmount();
    });
  });

  it('renders OrderDetailPage with editable line items, Reset to tier button, and Admin note', () => {
    const nowIso = new Date().toISOString();
    mockUseOrder.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'ord-1',
        orderNumber: 'ORD-2026-0001',
        status: 'submitted',
        buyer: {
          id: 'buy-1',
          name: 'Ahmet Yilmaz',
          company: 'Anatolia Hydraulics Ltd.',
          tierMarkup: 15,
        },
        tierMarkupAtSubmit: 15,
        confirmedMarkupPercent: null,
        currency: 'USD',
        submittedSubtotal: 1150,
        confirmedSubtotal: null,
        confirmedGrandTotal: null,
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            name: 'HP-AX100 Axial Piston Pump',
            imageUrl: null,
            unit: 'unit',
            moq: 1,
            quantity: 5,
            unitPriceBase: 200,
            unitPriceFinal: null,
            lineSubtotal: null,
            currency: 'USD',
            options: [{ name: 'Port', value: 'G3/4' }],
            buyerNote: 'Urgent delivery',
          },
        ],
        notesBuyer: 'Please ship via DHL Express',
        notesAdmin: null,
        rejectionReason: null,
        assignedUserId: null,
        submittedAt: nowIso,
        confirmedAt: null,
        acceptedAt: null,
        rejectedAt: null,
        expiredAt: null,
      },
    });

    const qc = new QueryClient();
    const root = createRoot(container);
    act(() => {
      root.render(
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={['/orders/ord-1']}>
            <Routes>
              <Route path="/orders/:id" element={<OrderDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain('ORD-2026-0001');
    expect(container.textContent).toContain('HP-AX100 Axial Piston Pump');
    expect(container.textContent).toContain('Reset to 15% tier');
    expect(container.textContent).toContain('Please ship via DHL Express');
    expect(container.textContent).toContain('Internal / quote note');
    expect(container.textContent).toContain('$1,000.00');
    expect(container.textContent).toContain('$1,150.00');

    act(() => {
      root.unmount();
    });
  });
});
