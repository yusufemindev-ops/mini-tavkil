import { useCallback, useEffect, useRef } from 'react';

/** Attaches DOM event listeners to warn before navigating away with unsaved form edits. */
export function useUnsavedGuard(saved: boolean): (node: HTMLElement | null) => void {
  const isDirty = useRef(false);

  useEffect(() => {
    if (saved) isDirty.current = false;
  }, [saved]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!isDirty.current) return;
      // Standard beforeunload trigger across browsers.
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const mark = () => {
      isDirty.current = true;
    };
    // Track text input and form selection changes.
    node.addEventListener('input', mark);
    node.addEventListener('change', mark);
    return () => {
      node.removeEventListener('input', mark);
      node.removeEventListener('change', mark);
    };
  }, []);
}
