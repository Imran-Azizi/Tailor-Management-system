/** Lightweight bus so route Suspense and React Query can drive the top progress bar. */

const listeners = new Set();

let suspenseDepth = 0;
let routeGeneration = 0;

function notify() {
  const snapshot = getNavigationLoadingState();
  listeners.forEach((listener) => listener(snapshot));
}

export function getNavigationLoadingState() {
  return {
    suspenseDepth,
    routeGeneration,
    isSuspenseLoading: suspenseDepth > 0,
  };
}

export function subscribeNavigationLoading(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function bumpRouteGeneration() {
  routeGeneration += 1;
  notify();
  return routeGeneration;
}

export function beginSuspenseLoad() {
  suspenseDepth += 1;
  notify();
  return () => {
    suspenseDepth = Math.max(0, suspenseDepth - 1);
    notify();
  };
}
