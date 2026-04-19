import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface FilterPillsProps {
  options: string[];
  selected: string | string[];
  onSelect: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
  multiSelect?: boolean;
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  options, selected, onSelect, className, size = 'md', multiSelect = false,
}) => {
  const selectedItems = Array.isArray(selected) ? selected : [selected];

  return (
    <ScrollArea className={cn('w-full', className)}>
      <div className="flex flex-wrap gap-2 pb-1">
        {options.map((opt) => {
          const isSelected = multiSelect ? selectedItems.includes(opt) : selected === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onSelect(opt)}
              aria-pressed={isSelected}
              className={cn(
                'min-w-max whitespace-nowrap rounded-full border px-4 py-1.5 font-medium transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

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
  <FilterPills
    options={options}
    selected={selected}
    onSelect={onToggle}
    className={className}
    size={size}
    multiSelect
  />
);
