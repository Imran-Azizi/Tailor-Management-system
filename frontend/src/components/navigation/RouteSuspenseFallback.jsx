import { useEffect } from "react";
import { beginSuspenseLoad } from "../../lib/navigationLoading.js";
import { PageSkeleton } from "../ui/Skeleton.jsx";

/** Suspense fallback: keeps the top progress bar alive and shows a page-shaped skeleton. */
export default function RouteSuspenseFallback() {
  useEffect(() => beginSuspenseLoad(), []);
  return <PageSkeleton />;
}
