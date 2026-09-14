'use client';

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
 */

export interface SearchBarProps {
  /** Current query value (controlled). */
  value: string;
  /** Called on every change. */
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
  const hasQuery = value.trim() !== '';

  const clear = (): void => {
    onValueChange('');
  };

  return (
    <div className={cn('relative w-full', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
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