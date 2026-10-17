import { Navigate, Route, Routes } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import { AppLayout } from '@/components/app-layout';
import { NotFoundPage } from '@/components/not-found-page';
import { ProtectedRoute } from '@/components/protected-route';
import { RequirePermission } from '@/components/require-permission';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { ProductsPage } from '@/features/products/products-page';
import { ProductEditPage } from '@/features/products/product-edit-page';
import { ArrangePage } from '@/features/products/arrange-page';
import { ProductPreviewPage } from '@/features/products/product-preview-page';
import { CategoryPreviewPage } from '@/features/products/category-preview-page';
import { CataloguePreviewPage } from '@/features/products/catalogue-preview-page';
import { CategoriesPage } from '@/features/categories/categories-page';
import { CategoryEditPage } from '@/features/categories/category-edit-page';
import { SuppliersPage } from '@/features/suppliers/suppliers-page';
import { SupplierEditPage } from '@/features/suppliers/supplier-edit-page';
import { BuyersPage } from '@/features/buyers/buyers-page';
import { BuyerNewPage } from '@/features/buyers/buyer-new-page';
import { BuyerEditPage } from '@/features/buyers/buyer-edit-page';
import { AccountRequestsPage } from '@/features/buyers/account-requests-page';
import { OrdersPage } from '@/features/orders/orders-page';
import { OrderDetailPage } from '@/features/orders/order-detail-page';
import { UsersPage } from '@/features/users/users-page';
import { AuditLogPage } from '@/features/audit/audit-log-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { ProfilePage } from '@/features/profile/profile-page';
import { useAuthBridge } from '@/features/auth/use-auth-bridge';
import { LoginPage } from '@/features/auth/login-page';

export default function App() {
  useAuthBridge();

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Always available to any signed-in admin */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Catalog */}
            <Route element={<RequirePermission permission="products:view" />}>
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/arrange/:categoryId" element={<ArrangePage />} />
              <Route path="/products/:id" element={<ProductEditPage />} />
            </Route>
            <Route element={<RequirePermission permission="categories:view" />}>
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/categories/:id" element={<CategoryEditPage />} />
            </Route>
            <Route element={<RequirePermission permission="suppliers:view" />}>
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/suppliers/:id" element={<SupplierEditPage />} />
            </Route>

            {/* Buyers & Operations */}
            <Route element={<RequirePermission permission="buyers:view" />}>
              <Route path="/buyer-accounts" element={<BuyersPage />} />
              <Route element={<RequirePermission permission="buyers:create" />}>
                <Route path="/buyer-accounts/new" element={<BuyerNewPage />} />
              </Route>
              <Route path="/buyer-accounts/:id" element={<BuyerEditPage />} />
            </Route>
            <Route element={<RequirePermission permission="account_requests:view" />}>
              <Route path="/account-requests" element={<AccountRequestsPage />} />
            </Route>
            <Route element={<RequirePermission permission="orders:view" />}>
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
            </Route>

            {/* Admin settings */}
            <Route element={<RequirePermission permission="users:view" />}>
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:tab" element={<UsersPage />} />
            </Route>
            <Route element={<RequirePermission permission="audit_log:view" />}>
              <Route path="/audit-log" element={<AuditLogPage />} />
            </Route>
            <Route element={<RequirePermission permission="settings:view" />}>
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/:tab" element={<SettingsPage />} />
            </Route>

            {/* Global 404 inside AppLayout */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Full-screen storefront previews — under auth + products:view, but
              deliberately OUTSIDE AppLayout (no admin chrome). Product detail
              whole sub-category grid. */}
          <Route element={<RequirePermission permission="products:view" />}>
            <Route path="/preview/catalogue" element={<CataloguePreviewPage />} />
            <Route path="/preview/product/:id" element={<ProductPreviewPage />} />
            <Route path="/preview/category/:categoryId" element={<CategoryPreviewPage />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
