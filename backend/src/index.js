import "dotenv/config";
import { execSync } from "child_process";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middleware/errorHandler.js";
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
import { startCronJobs } from "./cron/notifications.cron.js";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: "Too many requests",
  }),
);

// Routes
app.use("/api/auth", authRoutes);
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

// Health check
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date() }),
);

app.use(errorHandler);

startCronJobs();

/**
 * Kill any external process holding the given port.
 * Silently ignores errors (port already free, PID already dead, etc.).
 */
function freePort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(
        `netstat -ano | findstr :${port} | findstr LISTENING`,
        { encoding: "utf8" },
      ).trim();
      const lines = out.split("\n").filter(Boolean);
      const pids = [
        ...new Set(
          lines.map((l) => l.trim().split(/\s+/).at(-1)).filter(Boolean),
        ),
      ];
      for (const pid of pids) {
        if (pid !== String(process.pid)) {
          try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
            console.log(`🔧 Freed port ${port} (killed PID ${pid})`);
          } catch {
            /* already dead */
          }
        }
      }
    } else {
      execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: "ignore" });
    }
  } catch {
    /* port already free */
  }
}

/**
 * Try to start the HTTP server. On EADDRINUSE, kill the holder and retry
 * up to `retries` times with a 700ms gap between attempts.
 */
function startServer(retries = 5) {
  app
    .listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE" && retries > 0) {
        console.warn(
          `⚠️  Port ${PORT} busy — freeing and retrying (${retries} attempts left)...`,
        );
        freePort(PORT);
        setTimeout(() => startServer(retries - 1), 700);
      } else {
        console.error(
          `❌ Cannot bind port ${PORT}. Set a different PORT in backend/.env.`,
        );
        process.exit(1);
      }
    });
}

startServer();
