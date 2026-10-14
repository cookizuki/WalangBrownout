import { Link } from '@inertiajs/react';

export type PageLinks = { page: number; previous: string | null; next: string | null };

export function PaginationLinks({ pagination }: { pagination: PageLinks }) {
  if (!pagination.previous && !pagination.next) return null;
  return <nav aria-label="Pagination" className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
    {pagination.previous ? <Link href={pagination.previous} preserveState preserveScroll>Previous</Link> : <span />}
    <span>Page {pagination.page}</span>
    {pagination.next ? <Link href={pagination.next} preserveState preserveScroll>Next</Link> : <span />}
  </nav>;
}
