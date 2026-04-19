import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface FilterPillsProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  options, selected, onSelect, className, size = 'md',
}) => (
  <ScrollArea className={cn('w-full', className)}>
    <div className="flex gap-2 pb-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          aria-pressed={selected === opt}
          className={cn(
            'whitespace-nowrap rounded-full border font-medium transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
            selected === opt
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
);

interface MultiFilterPillsProps {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const MultiFilterPills: React.FC<MultiFilterPillsProps> = ({
  options, selected, onToggle, className, size = 'md',
}) => (
  <ScrollArea className={cn('w-full', className)}>
    <div className="flex gap-2 pb-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onToggle(opt)}
          className={cn(
            'whitespace-nowrap rounded-full border font-medium transition-all shrink-0',
            size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
            selected.includes(opt)
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
);
