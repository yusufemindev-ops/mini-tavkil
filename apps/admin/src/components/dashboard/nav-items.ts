import {
  Building2,
  FolderTree,
  Inbox,
  LayoutDashboard,
  Package,
  ScrollText,
  Settings,
  Truck,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Optional count pill (mock for now). */
  badge?: number;
  /** RBAC permission required to see + open this item. Omit = any admin. */
  permission?: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

// Grouped sidebar navigation items gated by RBAC permission.
export const NAV_GROUPS: NavGroup[] = [
  { items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }] },
  {
    label: 'Catalog',
    items: [
      { label: 'Products', to: '/products', icon: Package, permission: 'products:view' },
      { label: 'Categories', to: '/categories', icon: FolderTree, permission: 'categories:view' },
      { label: 'Suppliers', to: '/suppliers', icon: Truck, permission: 'suppliers:view' },
    ],
  },
  {
    label: 'Buyers',
    items: [
      {
        label: 'Buyer accounts',
        to: '/buyer-accounts',
        icon: Building2,
        permission: 'buyers:view',
      },
      {
        label: 'Account requests',
        to: '/account-requests',
        icon: UserPlus,
        permission: 'account_requests:view',
      },
    ],
  },
  {
    label: 'Operations',
    items: [{ label: 'Orders inbox', to: '/orders', icon: Inbox, permission: 'orders:view' }],
  },
  {
    label: 'Admin settings',
    items: [
      { label: 'User management', to: '/users', icon: Users, permission: 'users:view' },
      { label: 'Audit log', to: '/audit-log', icon: ScrollText, permission: 'audit_log:view' },
      { label: 'Settings', to: '/settings', icon: Settings, permission: 'settings:view' },
    ],
  },
];
