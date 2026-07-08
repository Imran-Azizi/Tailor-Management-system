import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import App from "./App.jsx";
import "./index.css";
import "./i18n/index.js";
import {
  installEnglishDigitInputNormalizer,
  patchLocaleFormatters,
} from "./lib/englishDigits.js";

patchLocaleFormatters();
installEnglishDigitInputNormalizer();

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchIntervalInBackground: false,
    },
  },
});

function LocalizedToaster() {
  const { i18n } = useTranslation();
  const isRtl = (i18n.dir?.() || "ltr") === "rtl";

  return (
    <Toaster
      position={isRtl ? "top-left" : "top-right"}
      gutter={10}
      containerClassName={`app-toast-container ${
        isRtl ? "app-toast-container--rtl" : "app-toast-container--ltr"
      }`}
      toastOptions={{
        duration: 3500,
        className: `app-toast ${isRtl ? "app-toast--rtl" : "app-toast--ltr"}`,
        ariaProps: {
          role: "status",
          "aria-live": "polite",
        },
        style: {
          direction: isRtl ? "rtl" : "ltr",
          textAlign: isRtl ? "right" : "left",
          background: "var(--surface)",
          color: "var(--text1)",
          border: "1px solid color-mix(in srgb, var(--border2) 80%, transparent)",
          borderRadius: 12,
          boxShadow:
            "0 14px 32px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.06)",
          maxWidth: "min(400px, calc(100vw - 24px))",
          padding: "12px 14px",
          fontSize: 13.5,
          fontWeight: 500,
          lineHeight: 1.55,
          overflowWrap: "anywhere",
        },
        success: {
          duration: 3200,
          className: `app-toast app-toast--success ${isRtl ? "app-toast--rtl" : "app-toast--ltr"}`,
          iconTheme: {
            primary: "#16A34A",
            secondary: "#FFFFFF",
          },
        },
        error: {
          duration: 4800,
          className: `app-toast app-toast--error ${isRtl ? "app-toast--rtl" : "app-toast--ltr"}`,
          iconTheme: {
            primary: "#DC2626",
            secondary: "#FFFFFF",
          },
        },
        loading: {
          duration: Infinity,
          className: `app-toast app-toast--info ${isRtl ? "app-toast--rtl" : "app-toast--ltr"}`,
        },
      }}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
      <LocalizedToaster />
    </QueryClientProvider>
  </React.StrictMode>,
);
