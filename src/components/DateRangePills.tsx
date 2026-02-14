import type { DateRange } from '@/lib/date-utils';

export function DateRangePills({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden" role="group" aria-label="Date range filter">
      {(['30d', '90d', '6m', '1y', 'all'] as DateRange[]).map(range => (
        <button
          key={range}
          onClick={() => onChange(range)}
          aria-pressed={value === range}
          className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
            value === range ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
          }`}
        >
          {range === 'all' ? 'All' : range}
        </button>
      ))}
    </div>
  );
}
