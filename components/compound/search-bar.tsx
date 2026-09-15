'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

/**
 * Phase 3 (support) — Search bar molecule.
 *
 * Text input with an inline search affordance and an instant clear button
 * (hidden while empty). Escape also clears the query. Used by the todo filter
 * bar and suitable for any narrow search field.
 *
 * Performance contract: typing updates the internal draft state immediately so
 * the input stays responsive, while `onValueChange` is debounced by 200ms so
 * the parent's synchronous filtering and sorting pipeline (`applyTodoFilters`)
 * does not run on every raw keystroke. The clear button and Escape bypass the
 * debounce entirely and propagate the empty query with zero delay.
 */

/** Delay between the last keystroke and the debounced `onValueChange` call. */
export const SEARCH_DEBOUNCE_MS = 200;

export interface SearchBarProps {
  /** Current query value (controlled). */
  value: string;
  /** Called with the query, debounced while typing, instantly on clear. */
  onValueChange: (value: string) => void;
  /** Input placeholder text. */
  placeholder?: string;
  /** Accessible label (the surrounding filter bar may already convey context). */
  'aria-label'?: string;
  /** Autofocus the field on mount. */
  autoFocus?: boolean;
  /** Disable the input and clear button. */
  disabled?: boolean;
  className?: string;
}

export function SearchBar({
  value,
  onValueChange,
  placeholder = 'Search…',
  'aria-label': ariaLabel = 'Search',
  autoFocus = false,
  disabled = false,
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState(value);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onValueChangeRef = useRef(onValueChange);

  // Keep the latest callback available to pending debounce timers even if the
  // parent re-renders and re-creates the inline handler while a timer is open.
  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  });

  // Mirror external value changes (e.g. the parent clearing the query or
  // resetting all filters) into the internal draft state.
  useEffect(() => {
    setQuery((current) => (current === value ? current : value));
  }, [value]);

  // Never let a pending debounce timer fire a callback after unmount.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const hasQuery = query.trim() !== '';

  const handleChange = (next: string): void => {
    setQuery(next);

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      onValueChangeRef.current(next);
    }, SEARCH_DEBOUNCE_MS);
  };

  const clear = (): void => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setQuery('');
    onValueChangeRef.current('');
  };

  return (
    <div className={cn('relative w-full', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={query}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && hasQuery) {
            event.preventDefault();
            clear();
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        disabled={disabled}
        className="pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden"
      />
      {hasQuery ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={clear}
          aria-label="Clear search"
          disabled={disabled}
          className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}