import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, pageSize, onChange }: PaginationProps) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm sm:px-5"
    >
      <p className="tabular text-muted">
        {from}-{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<ChevronLeft aria-hidden className="size-4" />}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>
        <span className="tabular text-muted">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
