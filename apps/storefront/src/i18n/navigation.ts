import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware navigation primitives (auto-prefix the active locale).
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
