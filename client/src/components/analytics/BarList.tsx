import { cn } from '../../lib/cn';

export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** CSS colour for the bar; defaults to the primary chart colour. */
  color?: string;
}

interface Props {
  items: BarItem[];
  /** Shown instead of the bars when every value is zero. */
  emptyText: string;
}

/**
 * Horizontal bars for comparing amounts. Each row carries its own label and number, so no
 * legend is needed and nothing depends on colour alone. Bars start at zero and are 8px thin.
 */
export function BarList({ items, emptyText }: Props) {
  const max = Math.max(...items.map((item) => item.value), 0);
  if (max === 0) return <p className="py-6 text-center text-sm text-muted">{emptyText}</p>;

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key} className="grid grid-cols-[minmax(6rem,9rem)_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate">{item.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-subtle" aria-hidden>
            <span
              className={cn('block h-full rounded-full')}
              style={{ width: `${(item.value / max) * 100}%`, background: item.color ?? 'var(--chart-a)' }}
            />
          </span>
          <span className="tabular text-right font-medium">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
