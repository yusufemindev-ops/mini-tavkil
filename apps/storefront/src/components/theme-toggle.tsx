'use client';

import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Moon, Sun } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { Tooltip } from '@/components/ui/tooltip';

export function ThemeToggle() {
  const t = useTranslations('nav');
  const { resolvedTheme, setTheme } = useTheme();

  // Both icons render identically on server + client; the `.dark` class (toggled
  // by next-themes) decides which is visible via CSS — no hydration mismatch,
  // no flash. resolvedTheme is only read at click time.
  return (
    <Tooltip content={t('theme')}>
      <IconButton
        aria-label={t('theme')}
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      >
        <Sun className="hidden dark:block" />
        <Moon className="dark:hidden" />
      </IconButton>
    </Tooltip>
  );
}
