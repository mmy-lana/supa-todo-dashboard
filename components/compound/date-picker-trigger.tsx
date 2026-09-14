'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { formatDateTime, fromDateTimeLocalValue, toDateTimeLocalValue } from '@/lib/utils/date';

/**
 * Phase 4 / Step 4.4 (support) — Date picker trigger.
 *
 * Compact due-date editor: a trigger button showing the current value (or a
 * placeholder) opens an inline native `datetime-local` input. Changes commit
 * immediately in UTC ISO format; a separate clear button removes the value.
 * Fully keyboard-accessible (native input) and touch-friendly (44px targets).
 */

export interface DatePickerTriggerProps {
  /** Current due date as a UTC ISO string, or `null`. */
  value: string | null;
  /** Receives the new ISO value, or `null` when cleared. */
  onValueChange: (value: string | null) => void;
  /** Visible field label. Defaults to `Due date`. */
  label?: string;
  /** Text shown on the trigger while `value` is null. Defaults to `Set due date`. */
  placeholder?: string;
  /** Disable all controls. */
  disabled?: boolean;
  className?: string;
}

export function DatePickerTrigger({
  value,
  onValueChange,
  label = 'Due date',
  placeholder = 'Set due date',
  disabled = false,
  className,
}: DatePickerTriggerProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((current) => !current)}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="true"
          className="min-w-0 flex-1 justify-start font-normal [@media(hover:none)]:h-11"
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {value ? (
            <span className="min-w-0 truncate text-foreground">{formatDateTime(value)}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onValueChange(null)}
            disabled={disabled}
            aria-label="Clear due date"
            className="size-8 shrink-0 text-muted-foreground [@media(hover:none)]:size-9"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {open ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="datetime-local"
            value={toDateTimeLocalValue(value)}
            onChange={(event) => {
              onValueChange(fromDateTimeLocalValue(event.target.value));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false);
              }
            }}
            disabled={disabled}
            aria-label={`${label} and time`}
            className={cn(
              'h-10 w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm transition-colors duration-150 [@media(hover:none)]:h-11',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={disabled}
          >
            Done
          </Button>
        </div>
      ) : null}
    </div>
  );
}