import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createCheckoutSessionSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "productId is required"),
        quantity: z.number().int().positive("Quantity must be at least 1"),
      })
    )
    .min(1, "Cart cannot be empty"),
  shippingAddress: z.object({
    line1: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    country: z.string().min(1, "Country is required"),
  }),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "shipped", "delivered", "cancelled"]),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive("Page must be a positive integer").default(1),
  limit: z.coerce.number().int().positive().max(100, "Limit cannot exceed 100").default(20),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["customer", "admin"]),
});

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().positive("Price must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.url("Image URL must be a valid URL"),
  stock: z.number().int().nonnegative("Stock cannot be negative"),
  rating: z.number().min(0).max(5).optional(),
});