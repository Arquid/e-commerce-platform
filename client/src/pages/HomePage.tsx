import { useState } from "react";
import { useGetProductsQuery } from "../features/products/productApiSlice";
import ProductCard from "../components/ProductCard";
import Pagination from "../components/Pagination";

export default function HomePage() {
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useGetProductsQuery({
    category: category || undefined,
    search: search || undefined,
    page,
    limit: 12,
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">All products</h1>
        <p className="mt-1 text-sm text-slate-500">Browse our full catalog, or search for something specific.</p>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <input
          className="flex-1 min-w-[200px] rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          placeholder="Search products..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          <option value="shoes">Shoes</option>
          <option value="electronics">Electronics</option>
        </select>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
          Failed to load products. Please try again later.
        </div>
      )}

      {!isLoading && !isError && data?.products.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center">
          <p className="font-medium text-slate-900">No products found</p>
          <p className="mt-1 text-sm text-slate-500">Try a different search term or category.</p>
        </div>
      )}

      {!isLoading && !isError && data && data.products.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {data.products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>

          <Pagination page={page} pages={data.pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
