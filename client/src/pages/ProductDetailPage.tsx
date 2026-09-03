import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useGetProductByIdQuery } from "../features/products/productApiSlice";
import { addItem } from "../features/cart/cartSlice";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const { data: product, isLoading, isError } = useGetProductByIdQuery(id!);
  const [added, setAdded] = useState(false);

  if (isLoading) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square w-full animate-pulse rounded-xl bg-slate-200" />
        <div className="flex flex-col gap-3 pt-2">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
          <div className="h-7 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center">
        <p className="font-medium text-slate-900">Product not found</p>
        <Link to="/" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          Back to all products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        ← Back to all products
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="aspect-square w-full rounded-xl object-cover"
        />
        <div className="flex flex-col gap-4">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {product.category}
          </span>
          <h1 className="text-2xl font-semibold text-slate-900">{product.name}</h1>
          <span className="text-2xl font-semibold text-slate-900">{product.price.toFixed(2)} €</span>
          <p className="leading-relaxed text-slate-600">{product.description}</p>

          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
              product.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${product.stock > 0 ? "bg-emerald-500" : "bg-red-500"}`}
            />
            {product.stock > 0 ? `In stock (${product.stock} left)` : "Out of stock"}
          </span>

          <button
            disabled={product.stock === 0}
            onClick={() => {
              dispatch(
                addItem({
                  productId: product._id,
                  name: product.name,
                  price: product.price,
                  quantity: 1,
                  imageUrl: product.imageUrl,
                })
              );
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);
            }}
            className="mt-2 rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {added ? "Added ✓" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
