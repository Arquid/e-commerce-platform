import { Request, Response } from "express";
import Product from "../models/Product";
import { AuthRequest } from "../middleware/auth";
import { logAdminAction } from "../utils/auditLog";

export const getProducts = async (req: Request, res: Response) => {
  const { category, search, sort } = req.query;
  const {
    page: pageNum,
    limit: limitNum,
    minPrice,
    maxPrice,
  } = res.locals.query as { page: number; limit: number; minPrice?: number; maxPrice?: number };

  const filter: Record<string, any> = {};
  if (category) filter.category = category;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  if (search) filter.$text = { $search: String(search) };

  const sortOption = sort === "price_asc" ? { price: 1 } : sort === "price_desc" ? { price: -1 } : { createdAt: -1 };

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortOption as any).skip((pageNum - 1) * limitNum).limit(limitNum),
    Product.countDocuments(filter)
  ]);

  res.json({ products, total, page: pageNum, pages: Math.ceil(total / limitNum) });
};

export const getProductById = async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  const product = await Product.create(req.body);
  await logAdminAction(req.userId as string, "product.create", "Product", product.id, {
    name: product.name,
    price: product.price,
  });
  res.status(201).json(product);
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  await logAdminAction(req.userId as string, "product.delete", "Product", product.id, {
    name: product.name,
  });
  res.json({ message: "Product deleted" });
};