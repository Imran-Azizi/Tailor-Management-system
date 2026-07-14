import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useIsFetching } from "@tanstack/react-query";
import {
  bumpRouteGeneration,
  subscribeNavigationLoading,
} from "../../lib/navigationLoading.js";

const TICK_MS = 180;
const SETTLE_MS = 220;
const MAX_INDETERMINATE = 92;

/**
 * Top-of-viewport progress bar (nprogress-style).
 * Starts on route change; completes when Suspense chunk + in-flight queries settle.
 */
export default function NavigationProgress() {
  const location = useLocation();
  const fetchingCount = useIsFetching({
    predicate: (query) => query.state.fetchStatus === "fetching",
  });
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [suspenseLoading, setSuspenseLoading] = useState(false);

  const visibleRef = useRef(false);
  const progressRef = useRef(0);
  const tickRef = useRef(null);
  const settleRef = useRef(null);
  const completeRef = useRef(null);

  useEffect(() => {
    return subscribeNavigationLoading((state) => {
      setSuspenseLoading(state.isSuspenseLoading);
    });
  }, []);

  const clearTimers = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (settleRef.current) {
      clearTimeout(settleRef.current);
      settleRef.current = null;
    }
    if (completeRef.current) {
      clearTimeout(completeRef.current);
      completeRef.current = null;
    }
  };

  const start = () => {
    clearTimers();
    visibleRef.current = true;
    progressRef.current = 12;
    setVisible(true);
    setProgress(12);

    tickRef.current = setInterval(() => {
      const current = progressRef.current;
      if (current >= MAX_INDETERMINATE) return;
      const next = Math.min(
        MAX_INDETERMINATE,
        current + Math.max(1.5, (MAX_INDETERMINATE - current) * 0.08),
      );
      progressRef.current = next;
      setProgress(next);
    }, TICK_MS);
  };

  const finish = () => {
    clearTimers();
    progressRef.current = 100;
    setProgress(100);
    completeRef.current = setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
      setProgress(0);
      progressRef.current = 0;
      completeRef.current = null;
    }, 280);
  };

  // Route change → start immediately
  useEffect(() => {
    bumpRouteGeneration();
    start();
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: pathname/search only
  }, [location.pathname, location.search]);

  // Complete when chunk + queries are idle
  useEffect(() => {
    if (!visibleRef.current) return undefined;

    const busy = suspenseLoading || fetchingCount > 0;
    if (busy) {
      if (settleRef.current) {
        clearTimeout(settleRef.current);
        settleRef.current = null;
      }
      return undefined;
    }

    settleRef.current = setTimeout(() => {
      if (visibleRef.current) finish();
    }, SETTLE_MS);

    return () => {
      if (settleRef.current) {
        clearTimeout(settleRef.current);
        settleRef.current = null;
      }
    };
  }, [suspenseLoading, fetchingCount, location.pathname, location.search]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="nav-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-hidden={!visible}
    >
      <div
        className="nav-progress__bar"
        style={{
          transform: `scaleX(${Math.max(progress, 0) / 100})`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
