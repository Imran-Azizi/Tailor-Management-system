import { createContext, useContext } from "react";
import { usePwaBranding } from "../hooks/usePwaBranding.js";
import { usePwaInstall } from "../hooks/usePwaInstall.js";

const PwaContext = createContext(null);

export function PwaProvider({ children }) {
  const branding = usePwaBranding();
  const install = usePwaInstall();

  return (
    <PwaContext.Provider value={{ branding, ...install }}>
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  const ctx = useContext(PwaContext);
  if (!ctx) {
    throw new Error("usePwa must be used inside PwaProvider");
  }
  return ctx;
}
