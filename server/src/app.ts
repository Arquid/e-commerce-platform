import "dotenv/config";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import orderRoutes from "./routes/orderRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import auditLogRoutes from "./routes/auditLogRoutes";
import userRoutes from "./routes/userRoutes";

import { notFound, errorHandler } from "./middleware/errorHandler";
import { parseTrustProxy } from "./config/trustProxy";
import { apiLimiter } from "./middleware/rateLimiters";

const app = express();

// Only trust X-Forwarded-For when explicitly told to (e.g. TRUST_PROXY=1 when
// deployed behind Render/Railway/nginx/etc.) — never on by default, since
// blindly trusting it would let a client spoof its own IP and bypass the
// rate limiters below when the app isn't actually behind a proxy.
if (process.env.TRUST_PROXY) {
  try {
    app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res
    .status(dbConnected ? 200 : 503)
    .json({ status: dbConnected ? "ok" : "degraded", db: dbConnected ? "connected" : "disconnected" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin/audit-logs", auditLogRoutes);
app.use("/api/users", userRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
