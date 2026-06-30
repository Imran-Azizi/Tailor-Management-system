import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const WorkerPanelContext = createContext(null);

const COLLAPSED_KEY = "worker:sidebar-collapsed";

function getInitialCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function WorkerPanelProvider({ children, roleColor }) {
  const [activeTab, setActiveTab] = useState("all");
  const [tabs, setTabs] = useState([]);
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileSidebar = useCallback(() => setMobileOpen(false), []);
  const toggleMobileSidebar = useCallback(() => setMobileOpen((o) => !o), []);
  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const prevOverflow = document.body.style.overflow;
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  return (
    <WorkerPanelContext.Provider
      value={{
        activeTab,
        setActiveTab,
        tabs,
        setTabs,
        roleColor,
        collapsed,
        toggleCollapsed,
        mobileOpen,
        setMobileOpen,
        closeMobileSidebar,
        toggleMobileSidebar,
      }}
    >
      {children}
    </WorkerPanelContext.Provider>
  );
}

export function useWorkerPanel() {
  const ctx = useContext(WorkerPanelContext);
  if (!ctx) {
    throw new Error("useWorkerPanel must be used within WorkerPanelProvider");
  }
  return ctx;
}
