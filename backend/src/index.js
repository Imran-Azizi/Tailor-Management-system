import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { errorHandler } from "./middleware/errorHandler.js";
import { normalizeDigitsMiddleware } from "./middleware/normalizeDigits.middleware.js";
import { csrfProtection } from "./middleware/csrf.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import orderRoutes from "./routes/order.routes.js";
import boxRoutes from "./routes/box.routes.js";
import designRoutes from "./routes/design.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import dailyTaskRoutes from "./routes/dailyTask.routes.js";
import rakhtRoutes from "./routes/rakht.routes.js";
import backupRoutes from "./routes/backup.routes.js";
import damagedClothesRoutes from "./routes/damagedClothes.routes.js";
import tenantRoutes from "./routes/tenant.routes.js";
import publicRoutes from "./routes/public.routes.js";
import { startCronJobs } from "./cron/notifications.cron.js";
import { startBackupCron } from "./cron/backup.cron.js";
import { itemRoutes } from "./routes/item.routes.js";
import { itemCategoryRoutes } from "./routes/itemCategory.routes.js";
import { itemSaleRoutes } from "./routes/itemSale.routes.js";
import rbacRoutes from "./routes/rbac.routes.js";
import {
  createCorsMiddlewareOptions,
  parseConfiguredOrigins,
} from "./lib/corsOrigins.js";
import { mountFrontend } from "./lib/serveFrontend.js";
import { resolveTenantHost } from "./middleware/tenantHost.middleware.js";

const app = express();
const parsePort = (value) => {
  const port = Number(value || 8000);
  return Number.isInteger(port) && port > 0 ? port : 8000;
};

const PORT = parsePort(process.env.PORT);
const parseTrustProxy = (value) => {
  if (value === undefined || value === null || value === "") return 1;
  if (String(value).toLowerCase() === "true") return true;
  if (String(value).toLowerCase() === "false") return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 1;
};

app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

const configuredOrigins = parseConfiguredOrigins();
if (process.env.NODE_ENV !== "production") {
  console.log("[CORS] Configured origins:", configuredOrigins);
}

const corsOptions = createCorsMiddlewareOptions(configuredOrigins);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(
  compression({
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }),
);

// Ensure preflight requests always succeed for allowed origins.
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "5mb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.FORM_BODY_LIMIT || "1mb",
  }),
);
app.use(normalizeDigitsMiddleware);
app.use(resolveTenantHost);
app.use("/api", csrfProtection);
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    fallthrough: false,
    maxAge: "7d",
    immutable: true,
  }),
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: "Too many requests",
  }),
);

// Routes
app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/boxes", boxRoutes);
app.use("/api/designs", designRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/daily-tasks", dailyTaskRoutes);
app.use("/api/rakhts", rakhtRoutes);
app.use("/api/backups", backupRoutes);
app.use("/api/damaged-clothes", damagedClothesRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/item-categories", itemCategoryRoutes);
app.use("/api/item-sales", itemSaleRoutes);
app.use("/api/rbac", rbacRoutes);

// Health check
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date() }),
);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found." });
});

mountFrontend(app, express.static);

app.use(errorHandler);

startCronJobs();
startBackupCron();

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Auth CSRF:  http://localhost:${PORT}/api/auth/csrf`);
});

server.on("error", (error) => {
  console.error(`Server failed to start on port ${PORT}:`, error.message);
  process.exit(1);
});
