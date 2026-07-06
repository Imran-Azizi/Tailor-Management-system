import fs from "fs";
import path from "path";

function pathExists(target) {
  try {
    return fs.existsSync(target);
  } catch {
    return false;
  }
}

/** Resolve Vite build output for same-server VPS deployments. */
export function resolveFrontendDist() {
  const configured = process.env.FRONTEND_DIST_PATH?.trim();
  const candidates = [
    configured,
    path.resolve(process.cwd(), "../frontend/dist"),
    path.resolve(process.cwd(), "frontend/dist"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (pathExists(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return null;
}

export function shouldServeFrontend() {
  const flag = String(process.env.SERVE_FRONTEND || "").toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return process.env.NODE_ENV === "production";
}

/**
 * Serve the built React app from Express (production VPS).
 * API routes must be registered before calling this.
 */
export function mountFrontend(app, expressStatic) {
  if (!shouldServeFrontend()) {
    return false;
  }

  const distPath = resolveFrontendDist();
  if (!distPath) {
    console.warn(
      "[frontend] Build output not found. Run: npm --prefix frontend run build",
    );
    return false;
  }

  console.log(`[frontend] Serving SPA from ${distPath}`);

  app.use(
    expressStatic(distPath, {
      index: false,
      maxAge: "365d",
      immutable: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });

  return true;
}
