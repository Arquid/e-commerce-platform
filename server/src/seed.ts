import "dotenv/config";
import mongoose from "mongoose";
import Product from "./models/Product";

const products = [
  {
    name: "Trail Runner Sneakers",
    description: "Lightweight running shoes with breathable mesh and responsive cushioning.",
    price: 89.9,
    category: "shoes",
    imageUrl: "https://placehold.co/600x600/d9c9b3/5b4636?text=Trail+Runner",
    stock: 25,
    rating: 4.5,
  },
  {
    name: "Classic Leather Boots",
    description: "Durable full-grain leather boots built for everyday wear.",
    price: 129.0,
    category: "shoes",
    imageUrl: "https://placehold.co/600x600/d9c9b3/5b4636?text=Leather+Boots",
    stock: 15,
    rating: 4.7,
  },
  {
    name: "Everyday Canvas Sneakers",
    description: "Classic low-top canvas sneakers that go with everything.",
    price: 54.5,
    category: "shoes",
    imageUrl: "https://placehold.co/600x600/d9c9b3/5b4636?text=Canvas+Sneakers",
    stock: 40,
    rating: 4.2,
  },
  {
    name: "High-Top Basketball Shoes",
    description: "Ankle-support high-tops with shock-absorbing soles.",
    price: 109.0,
    category: "shoes",
    imageUrl: "https://placehold.co/600x600/d9c9b3/5b4636?text=Basketball+Shoes",
    stock: 18,
    rating: 4.6,
  },
  {
    name: "Wireless Noise-Cancelling Headphones",
    description: "Over-ear headphones with active noise cancellation and 30-hour battery life.",
    price: 199.0,
    category: "electronics",
    imageUrl: "https://placehold.co/600x600/dbe4ee/334155?text=Headphones",
    stock: 30,
    rating: 4.8,
  },
  {
    name: "Smartwatch Series 5",
    description: "Fitness tracking, heart-rate monitoring, and notifications on your wrist.",
    price: 249.0,
    category: "electronics",
    imageUrl: "https://placehold.co/600x600/dbe4ee/334155?text=Smartwatch",
    stock: 20,
    rating: 4.4,
  },
  {
    name: "Portable Bluetooth Speaker",
    description: "Compact waterproof speaker with rich bass and 12-hour playtime.",
    price: 59.9,
    category: "electronics",
    imageUrl: "https://placehold.co/600x600/dbe4ee/334155?text=Bluetooth+Speaker",
    stock: 50,
    rating: 4.3,
  },
  {
    name: "USB-C Fast Charger 65W",
    description: "Compact GaN charger that fast-charges laptops, tablets, and phones.",
    price: 39.9,
    category: "electronics",
    imageUrl: "https://placehold.co/600x600/dbe4ee/334155?text=USB-C+Charger",
    stock: 60,
    rating: 4.6,
  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  await Product.deleteMany({});
  const created = await Product.insertMany(products);
  console.log(`Seeded ${created.length} products.`);
  await mongoose.disconnect();
}

run();
