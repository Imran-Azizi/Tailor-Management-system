import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
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
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "var(--surface)",
            color: "var(--text1)",
            border: "1px solid var(--border2)",
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.18)",
          },
          success: {
            iconTheme: {
              primary: "#16A34A",
              secondary: "#FFFFFF",
            },
          },
          error: {
            iconTheme: {
              primary: "#DC2626",
              secondary: "#FFFFFF",
            },
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>,
);
