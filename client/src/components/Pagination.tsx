interface PaginationProps {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, pages, onPageChange }: PaginationProps) {
  if (pages <= 1) return null;

  return (
    <div className="mt-10 flex justify-center gap-1.5">
      {Array.from({ length: pages }).map((_, i) => (
        <button
          key={i}
          onClick={() => onPageChange(i + 1)}
          className={`h-9 min-w-9 rounded-md px-3 text-sm font-medium transition-colors ${
            page === i + 1
              ? "bg-blue-600 text-white"
              : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}
