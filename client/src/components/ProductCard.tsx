import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addItem } from "../features/cart/cartSlice";
import type { Product } from "../features/products/productApiSlice";

export default function ProductCard({ product }: { product: Product }) {
  const dispatch = useDispatch();

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-lg">
      <Link to={`/products/${product._id}`} className="block overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {product.category}
        </span>
        <Link to={`/products/${product._id}`}>
          <h3 className="font-medium text-slate-900 leading-snug hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-semibold text-slate-900">{product.price.toFixed(2)} €</span>
          <button
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            onClick={() =>
              dispatch(
                addItem({
                  productId: product._id,
                  name: product.name,
                  price: product.price,
                  quantity: 1,
                  imageUrl: product.imageUrl,
                })
              )
            }
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}
