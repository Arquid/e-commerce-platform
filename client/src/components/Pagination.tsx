import { getPageItems } from "../utils/pagination";

interface PaginationProps {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, pages, onPageChange }: PaginationProps) {
  if (pages <= 1) return null;

  return (
    <div className="mt-10 flex justify-center gap-1.5">
      {getPageItems(page, pages).map((item, i) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            className="flex h-9 min-w-9 items-center justify-center text-sm text-slate-400"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={`h-9 min-w-9 rounded-md px-3 text-sm font-medium transition-colors ${
              page === item
                ? "bg-blue-600 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {item}
          </button>
        )
      )}
    </div>
  );
}
