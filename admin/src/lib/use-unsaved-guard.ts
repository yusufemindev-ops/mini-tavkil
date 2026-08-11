import { useCallback, useEffect, useRef } from 'react';

/**
 * Warn before leaving a form with unsaved edits.
 *
 * The product editor is dozens of fields across three locales, and a stray ⌘W, a
 * Back gesture or a click on the sidebar threw all of it away with no prompt.
 * That is the one interaction where a browser-native confirm is genuinely wanted.
 *
 * Dirtiness comes from `input`/`change` events inside the container rather than
 * from diffing state: the editors hold their values in a dozen separate
 * `useState` hooks with no dirty flag, and threading one through every setter in
 * a 1,400-line working file is a far bigger change than this warrants. The DOM
 * already knows when the user typed.
 *
 * Deliberately holds the flag in a ref and returns a **callback ref**. Both
 * alternatives are lint errors and real problems: `setState` inside an effect
 * cascades renders on every keystroke in the largest form in the app, and
 * handing back a ref object means reading `.current` during render. Nothing here
 * needs to re-render — the value is only ever read inside an event handler.
 *
 * Pass the save mutation's success flag as `saved` to clear the warning.
 */
export function useUnsavedGuard(saved: boolean): (node: HTMLElement | null) => void {
  const isDirty = useRef(false);

  useEffect(() => {
    if (saved) isDirty.current = false;
  }, [saved]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!isDirty.current) return;
      // Browsers ignore custom text and show their own wording; assigning
      // returnValue is still what triggers the prompt at all.
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
    // `input` covers typing; `change` covers selects, checkboxes and file inputs
    // that never fire `input`.
    node.addEventListener('input', mark);
    node.addEventListener('change', mark);
    return () => {
      node.removeEventListener('input', mark);
      node.removeEventListener('change', mark);
    };
  }, []);
}
