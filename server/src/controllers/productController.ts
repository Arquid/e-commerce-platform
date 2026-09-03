import { Request, Response } from "express";
import Product from "../models/Product";

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

export const createProduct = async (req: Request, res: Response) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
};