import { useState } from "react";
import type { FormEvent } from "react";
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useDeleteProductMutation,
} from "../features/products/productApiSlice";

const emptyForm = { name: "", description: "", price: "", category: "", imageUrl: "", stock: "" };

export default function AdminProductsPage() {
  const { data, isLoading } = useGetProductsQuery({ limit: 100 });
  const [createProduct, { isLoading: isCreating, isError: createFailed }] = useCreateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [form, setForm] = useState(emptyForm);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createProduct({
        name: form.name,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        imageUrl: form.imageUrl,
        stock: Number(form.stock),
      }).unwrap();
      setForm(emptyForm);
    } catch {
      // isError below already reflects the failed request
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this product?")) {
      await deleteProduct(id);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Manage products</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {isLoading && <p className="p-4 text-sm text-slate-500">Loading products...</p>}

          {!isLoading && data?.products.length === 0 && (
            <p className="p-4 text-sm text-slate-500">No products yet — add one on the right.</p>
          )}

          {!isLoading &&
            data?.products.map((p) => (
              <div key={p._id} className="flex items-center gap-4 p-4">
                <img src={p.imageUrl} alt={p.name} className="h-12 w-12 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{p.name}</p>
                  <p className="text-sm text-slate-500">
                    {p.category} · {p.price.toFixed(2)} € · stock {p.stock}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(p._id)}
                  className="text-sm text-slate-400 hover:text-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
        </div>

        <form onSubmit={handleSubmit} className="h-fit rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Add product</h2>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Description
              <textarea
                required
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Price
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Stock
                <input
                  required
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Category
              <input
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Image URL
              <input
                required
                type="url"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          {createFailed && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Could not create product. Check the fields and try again.
            </p>
          )}

          <button
            type="submit"
            disabled={isCreating}
            className="mt-5 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? "Adding..." : "Add product"}
          </button>
        </form>
      </div>
    </div>
  );
}
