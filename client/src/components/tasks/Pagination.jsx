import { ChevronLeft, ChevronRight } from "lucide-react";

// Keep nearby page buttons and boundaries visible without rendering huge ranges.
function pageNumbers(page, totalPages) {
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
  return pages.flatMap((number, index) =>
    index && number - pages[index - 1] > 1
      ? [`gap-${number}`, number]
      : [number],
  );
}

// Share navigation and matching-result counts between the cards and list views.
export function Pagination({
  pagination,
  loading,
  error,
  page,
  limit,
  onPageChange,
  onLimitChange,
}) {
  const total = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 1;
  const start = total ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);
  return (
    <div className="pagination-footer">
      <span className="pagination-summary" role="status">
        {loading
          ? "Updating your workspace…"
          : error
            ? "Workspace unavailable"
            : `Showing ${start}–${end} of ${total} tasks`}
      </span>
      <label className="page-size">
        Tasks per page
        <select
          aria-label="Tasks per page"
          value={limit}
          disabled={loading}
          onChange={(event) => onLimitChange(Number(event.target.value))}
        >
          {[12, 24, 48].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <nav className="pagination-controls" aria-label="Task pagination">
        <button
          className="page-button"
          disabled={loading || !!error || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>
        {pageNumbers(page, totalPages).map((number) =>
          typeof number === "number" ? (
            <button
              key={number}
              className="page-button"
              aria-label={`Page ${number}`}
              aria-current={page === number ? "page" : undefined}
              disabled={loading || !!error}
              onClick={() => onPageChange(number)}
            >
              {number}
            </button>
          ) : (
            <span key={number} className="page-ellipsis">
              …
            </span>
          ),
        )}
        <button
          className="page-button"
          disabled={loading || !!error || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}
