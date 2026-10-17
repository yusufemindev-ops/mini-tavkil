import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BuyersPage } from './buyers-page';
import { AccountRequestsPage } from './account-requests-page';
import { Route, Routes } from 'react-router';
import { BuyerNewPage } from './buyer-new-page';
import { BuyerEditPage } from './buyer-edit-page';
import type { AccountRequest, Buyer } from './queries';
import type { AdminOrder } from '@/features/orders/queries';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockUseBuyers = vi.fn<() => { data?: Buyer[]; isLoading: boolean }>();
const mockUseBuyer = vi.fn<() => { data?: Buyer; isLoading: boolean; isError: boolean }>();
const mockUseAccountRequests = vi.fn<() => { data?: AccountRequest[]; isLoading: boolean }>();
const mockUseOrders = vi.fn<() => { data?: AdminOrder[]; isLoading: boolean }>();

vi.mock('./queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./queries')>();
  return {
    ...actual,
    useBuyers: () => mockUseBuyers(),
    useBuyer: () => mockUseBuyer(),
    useAccountRequests: () => mockUseAccountRequests(),
    useProfileEditRequests: () => ({ data: [], isLoading: false }),
    useBuyerOrders: () => mockUseOrders(),
  };
});

describe('Buyers & AccountRequests components', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockUseBuyers.mockReset();
    mockUseBuyer.mockReset();
    mockUseAccountRequests.mockReset();
    mockUseOrders.mockReset();
  });

  afterEach(() => {
    container.remove();
  });

  it('renders BuyersPage active and suspended filter tabs', () => {
    mockUseBuyers.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 'buy-1',
          company: 'Anatolia Industrial',
          firstName: 'Ahmet',
          lastName: 'Yilmaz',
          contactName: 'Ahmet Yilmaz',
          email: 'ahmet@anatolia.com',
          jobTitle: 'Procurement Director',
          phone: '+90 532 111 2233',
          countryCode: 'TR',
          city: 'Istanbul',
          address: null,
          tierMarkup: 15,
          orders: 3,
          status: 'active',
          verified: true,
          googleConnected: true,
          hasActiveSession: false,
          lastSeenAt: null,
          createdAt: new Date().toISOString(),
          notes: null,
        },
      ],
    });

    const root = createRoot(container);
    act(() => {
      root.render(
        <MemoryRouter>
          <BuyersPage />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Anatolia Industrial');
    expect(container.textContent).toContain('ahmet@anatolia.com');
    expect(container.textContent).toContain('15%');
    expect(container.textContent).toContain('Export CSV');

    act(() => {
      root.unmount();
    });
  });

  it('renders AccountRequestsPage pending requests without retention or edit-request bloat', () => {
    mockUseAccountRequests.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 'req-1',
          firstName: 'Leyla',
          lastName: 'Kaya',
          email: 'leyla@kaya-machinery.com',
          phone: '+90 533 999 8877',
          jobTitle: 'Purchasing Manager',
          company: 'Kaya Machinery',
          countryCode: 'TR',
          city: 'Bursa',
          address: 'OSB Cad. No 12',
          message: 'Interested in hydraulic pumps.',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const qc = new QueryClient();
    const root = createRoot(container);
    act(() => {
      root.render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <AccountRequestsPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain('Leyla Kaya');
    expect(container.textContent).toContain('leyla@kaya-machinery.com');
    expect(container.textContent).toContain('Kaya Machinery');
    expect(container.textContent).toContain('Approve');
    expect(container.textContent).toContain('Reject');

    act(() => {
      root.unmount();
    });
  });

  it('renders BuyerNewPage with initial Tier markup % and live price preview', () => {
    const qc = new QueryClient();
    const root = createRoot(container);
    act(() => {
      root.render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <BuyerNewPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain('New buyer');
    expect(container.textContent).toContain('Pricing tier');
    expect(container.textContent).toContain('Tier markup %');
    expect(container.textContent).toContain('$10.00');

    act(() => {
      root.unmount();
    });
  });

  it('renders BuyerEditPage with profile details, tier markup, and live Order history', () => {
    const nowIso = new Date().toISOString();
    mockUseBuyer.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'buy-1',
        company: 'Anatolia Industrial',
        firstName: 'Ahmet',
        lastName: 'Yilmaz',
        contactName: 'Ahmet Yilmaz',
        email: 'ahmet@anatolia.com',
        jobTitle: 'Procurement Director',
        phone: '+90 532 111 2233',
        countryCode: 'TR',
        city: 'Istanbul',
        address: 'Tuzla No 42',
        tierMarkup: 15,
        orders: 1,
        status: 'active',
        verified: true,
        googleConnected: true,
        hasActiveSession: false,
        lastSeenAt: nowIso,
        createdAt: nowIso,
        notes: 'VIP OEM buyer',
      },
    });
    mockUseOrders.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 'ord-1',
          orderNumber: 'ORD-2026-0099',
          status: 'submitted',
          buyer: {
            id: 'buy-1',
            name: 'Ahmet Yilmaz',
            company: 'Anatolia Industrial',
            tierMarkup: 15,
          },
          tierMarkupAtSubmit: 15,
          confirmedMarkupPercent: null,
          currency: 'USD',
          submittedSubtotal: 1150,
          confirmedSubtotal: null,
          confirmedGrandTotal: null,
          items: [],
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
      ],
    });

    const qc = new QueryClient();
    const root = createRoot(container);
    act(() => {
      root.render(
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={['/buyer-accounts/buy-1']}>
            <Routes>
              <Route path="/buyer-accounts/:id" element={<BuyerEditPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain('Anatolia Industrial');
    expect(container.textContent).toContain('Order history');
    expect(container.textContent).toContain('ORD-2026-0099');
    expect(container.textContent).toContain('$1,150.00');
    expect(container.textContent).toContain('VIP OEM buyer');

    act(() => {
      root.unmount();
    });
  });
});
