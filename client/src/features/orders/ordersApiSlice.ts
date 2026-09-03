import { api } from "../api/apiSlice";

export interface CheckoutSessionRequest {
  items: { productId: string; name: string; price: number; quantity: number }[];
  shippingAddress: { line1: string; city: string; postalCode: string; country: string };
}

export interface Order {
  _id: string;
  items: { product: string; name: string; quantity: number; price: number }[];
  totalAmount: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
}

export const ordersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createCheckoutSession: builder.mutation<{ url: string }, CheckoutSessionRequest>({
      query: (body) => ({ url: "/payments/create-checkout-session", method: "POST", body }),
    }),
    getMyOrders: builder.query<Order[], void>({
      query: () => "/orders",
      providesTags: ["Order"],
    }),
  }),
});

export const { useCreateCheckoutSessionMutation, useGetMyOrdersQuery } = ordersApi;