import { api } from "../api/apiSlice";

export interface Product {
  _id: string; name: string; description: string; price: number;
  category: string; imageUrl: string; stock: number; rating: number;
}
interface ProductResponse { products: Product[]; total: number; page: number; pages: number; }

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  stock: number;
}

export const productsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<ProductResponse, Record<string, string | number | undefined>>({
      query: (params) => ({ url: "/products", params }),
      providesTags: ["Product"]
    }),
    getProductById: builder.query<Product, string>({
      query: (id) => `/products/${id}`
    }),
    createProduct: builder.mutation<Product, CreateProductRequest>({
      query: (body) => ({ url: "/products", method: "POST", body }),
      invalidatesTags: ["Product"],
    }),
    deleteProduct: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      invalidatesTags: ["Product"],
    }),
  })
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useDeleteProductMutation,
} = productsApi;
