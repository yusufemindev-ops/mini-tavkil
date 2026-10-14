import {
  FolderTree,
  LayoutDashboard,
  Package,
  Settings,
  Truck,
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
    label: 'Admin settings',
    items: [
      { label: 'User management', to: '/users', icon: Users, permission: 'users:view' },
      { label: 'Settings', to: '/settings', icon: Settings, permission: 'settings:view' },
    ],
  },
];
