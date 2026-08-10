import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'tavkil_admin_theme';

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
}

// Both icons render identically on every paint; the `.dark` class (set pre-paint
// in index.html and toggled here) decides which is visible via CSS.
export function ThemeToggle() {
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
      <Sun className="hidden h-4 w-4 dark:block" />
      <Moon className="h-4 w-4 dark:hidden" />
    </Button>
  );
}
