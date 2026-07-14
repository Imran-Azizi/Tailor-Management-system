import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:8000";

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: ["system_icon.png", "logo.png"],
        manifest: {
          id: "/",
          name: "Hoshmand Safi",
          short_name: "Hoshmand",
          description:
            "Tailor management system for orders, customers, inventory, and finance.",
          theme_color: "#D97706",
          background_color: "#F8FAFC",
          display: "standalone",
          orientation: "any",
          scope: "/",
          start_url: "/",
          dir: "auto",
          lang: "en",
          categories: ["business", "productivity"],
          icons: [
            {
              src: "/system_icon.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/system_icon.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/system_icon.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.method !== "GET" ||
                url.pathname.startsWith("/api") ||
                url.pathname.startsWith("/uploads"),
              handler: "NetworkOnly",
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "external-fonts",
                expiration: {
                  maxEntries: 12,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    optimizeDeps: {
      include: [
        "react-hook-form",
        "@hookform/resolvers/zod",
        "zod",
        "react-icons/fa",
        "react-icons/lu",
      ],
    },
    build: {
      target: "es2020",
      cssCodeSplit: true,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 900,
      modulePreload: {
        polyfill: true,
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            const normalizedId = id.replace(/\\/g, "/");

            if (
              normalizedId.includes("/node_modules/react/") ||
              normalizedId.includes("/node_modules/react-dom/") ||
              normalizedId.includes("/node_modules/scheduler/")
            ) {
              return "vendor-react";
            }
            if (id.includes("react-router")) {
              return "vendor-router";
            }
            if (id.includes("@tanstack/react-query")) {
              return "vendor-query";
            }
            if (id.includes("jspdf") || id.includes("html2canvas")) {
              return "vendor-print";
            }
            if (id.includes("recharts") || id.includes("d3-")) {
              return "vendor-charts";
            }
            if (id.includes("i18next") || id.includes("react-i18next")) {
              return "vendor-i18n";
            }
            if (id.includes("react-select")) {
              return "vendor-select";
            }
            if (id.includes("react-hot-toast")) {
              return "vendor-toast";
            }
            if (id.includes("react-icons")) {
              return "vendor-icons";
            }

            return "vendor-misc";
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/uploads": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
