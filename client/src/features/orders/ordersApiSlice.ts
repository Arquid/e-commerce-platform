import { api } from "../api/apiSlice";

export interface CheckoutSessionRequest {
  items: { productId: string; quantity: number }[];
  shippingAddress: { line1: string; city: string; postalCode: string; country: string };
}

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

export interface Order {
  _id: string;
  items: { product: string; name: string; quantity: number; price: number }[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
}

export interface AdminOrder extends Order {
  user: { _id: string; name: string; email: string } | string;
}

interface OrdersResponse { orders: Order[]; total: number; page: number; pages: number; }
interface AdminOrdersResponse { orders: AdminOrder[]; total: number; page: number; pages: number; }

export const ordersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createCheckoutSession: builder.mutation<{ url: string }, CheckoutSessionRequest>({
      query: (body) => ({ url: "/payments/create-checkout-session", method: "POST", body }),
    }),
    getMyOrders: builder.query<OrdersResponse, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: "/orders", params: params ?? undefined }),
      providesTags: ["Order"],
    }),
    getAllOrders: builder.query<AdminOrdersResponse, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: "/orders/all", params: params ?? undefined }),
      providesTags: ["Order"],
    }),
    updateOrderStatus: builder.mutation<Order, { id: string; status: OrderStatus }>({
      query: ({ id, status }) => ({ url: `/orders/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: ["Order"],
    }),
  }),
});

export const {
  useCreateCheckoutSessionMutation,
  useGetMyOrdersQuery,
  useGetAllOrdersQuery,
  useUpdateOrderStatusMutation,
} = ordersApi;
