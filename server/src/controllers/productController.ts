import { Request, Response } from "express";
import Product from "../models/Product";
import { AuthRequest } from "../middleware/auth";
import { logAdminAction } from "../utils/auditLog";

export const getProducts = async (req: Request, res: Response) => {
  const { category, minPrice, maxPrice, search, page = "1", limit = "12", sort } = req.query;

  const filter: Record<string, any> = {};
  if (category) filter.category = category;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (search) filter.$text = { $search: String(search) };

  const pageNum = Number(page);
  const limitNum = Number(limit);
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