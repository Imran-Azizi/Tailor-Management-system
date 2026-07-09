import { useEffect } from "react";
import "./SystemHorizontalScrollbars.css";

const MOBILE_QUERY = "(max-width: 768px)";
const MIN_THUMB_WIDTH = 64;
const KNOWN_VIEWPORT_SELECTOR = [
  ".tbl-wrap",
  ".report-table-wrap",
  ".items-table-wrap",
  ".order-scroll-x",
  ".overflow-x-auto",
  ".assign-orders-records-table-wrap",
  ".contributor-list-desktop-wrap",
  ".payment-history-records-wrap",
  ".completed-worker-orders-table-wrap",
  ".dt-table-scroll-wrap",
  ".user-management-table-wrap",
  ".superadmin-table-wrap",
  '[style*="overflow-x"]',
].join(",");
const MANAGED_ANCESTOR_SELECTOR = [
  ".orders-scroll-shell",
  ".delivery-scroll-shell",
  ".rakht-manager-scroll-shell",
  "[data-system-scroll-ignore='true']",
].join(",");
const PRINT_ANCESTOR_SELECTOR = [
  ".print-a6-sheet",
  ".print-bill-table-wrap",
  ".print-customer-combined-wrap",
  ".print-tailor-ledger-wrap",
  "[class*='print-']",
].join(",");

let cachedRtlScrollType = null;

function detectRtlScrollType() {
  if (cachedRtlScrollType) return cachedRtlScrollType;

  const scroller = document.createElement("div");
  const content = document.createElement("div");
  scroller.dir = "rtl";
  scroller.style.cssText =
    "position:absolute;top:-9999px;width:4px;height:1px;overflow:scroll;visibility:hidden;";
  content.style.cssText = "width:8px;height:1px;";
  scroller.appendChild(content);
  document.body.appendChild(scroller);

  if (scroller.scrollLeft > 0) {
    cachedRtlScrollType = "default";
  } else {
    scroller.scrollLeft = 1;
    cachedRtlScrollType = scroller.scrollLeft === 0 ? "negative" : "reverse";
  }

  document.body.removeChild(scroller);
  return cachedRtlScrollType;
}

function getNormalizedScrollLeft(element) {
  const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
  const direction = window.getComputedStyle(element).direction;
  const scrollLeft = element.scrollLeft;

  if (direction !== "rtl") {
    return Math.min(maxScroll, Math.max(0, scrollLeft));
  }

  switch (detectRtlScrollType()) {
    case "negative":
      return Math.min(maxScroll, Math.max(0, maxScroll + scrollLeft));
    case "reverse":
      return Math.min(maxScroll, Math.max(0, maxScroll - scrollLeft));
    default:
      return Math.min(maxScroll, Math.max(0, scrollLeft));
  }
}

function setNormalizedScrollLeft(element, value) {
  const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
  const nextValue = Math.min(maxScroll, Math.max(0, value));
  const direction = window.getComputedStyle(element).direction;

  if (direction !== "rtl") {
    element.scrollLeft = nextValue;
    return;
  }

  switch (detectRtlScrollType()) {
    case "negative":
      element.scrollLeft = nextValue - maxScroll;
      break;
    case "reverse":
      element.scrollLeft = maxScroll - nextValue;
      break;
    default:
      element.scrollLeft = nextValue;
  }
}

function isRtlScrollContext(element) {
  return Boolean(
    element.closest('[dir="rtl"]') ||
      document.documentElement.getAttribute("dir") === "rtl",
  );
}

function alignToRtlScrollStart(viewport) {
  if (!isRtlScrollContext(viewport)) return;

  const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  if (maxScroll <= 0) return;

  const direction = window.getComputedStyle(viewport).direction;
  if (direction === "rtl") {
    // Normalized maxScroll = physical right edge (RTL reading start).
    setNormalizedScrollLeft(viewport, maxScroll);
    return;
  }

  viewport.scrollLeft = maxScroll;
}

function getThumbRatio(viewport, maxScroll) {
  if (maxScroll <= 0) {
    return isRtlScrollContext(viewport) ? 1 : 0;
  }

  if (!isRtlScrollContext(viewport)) {
    return getNormalizedScrollLeft(viewport) / maxScroll;
  }

  const direction = window.getComputedStyle(viewport).direction;
  if (direction === "rtl") {
    return getNormalizedScrollLeft(viewport) / maxScroll;
  }

  return Math.min(maxScroll, Math.max(0, viewport.scrollLeft)) / maxScroll;
}

function setScrollFromThumbRatio(viewport, ratio, maxScroll) {
  const nextRatio = Math.min(1, Math.max(0, ratio));
  const direction = window.getComputedStyle(viewport).direction;

  if (!isRtlScrollContext(viewport) || direction === "rtl") {
    setNormalizedScrollLeft(viewport, nextRatio * maxScroll);
    return;
  }

  viewport.scrollLeft = nextRatio * maxScroll;
}

function applyThumbPosition(thumb, thumbLeft, maxThumbLeft, rtl) {
  if (rtl) {
    thumb.style.left = "auto";
    thumb.style.transform = "none";
    thumb.style.right = `${Math.max(0, maxThumbLeft - thumbLeft)}px`;
    return;
  }

  thumb.style.right = "auto";
  thumb.style.left = "0";
  thumb.style.transform = `translateX(${thumbLeft}px)`;
}

function getColumnCount(table) {
  return table.tHead?.rows?.[0]?.cells?.length || table.rows?.[0]?.cells?.length || 0;
}

function findViewport(table) {
  const knownViewport = table.closest(KNOWN_VIEWPORT_SELECTOR);
  if (knownViewport && !knownViewport.matches("body, html")) return knownViewport;

  let candidate = table.parentElement;
  for (let depth = 0; candidate && depth < 4; depth += 1) {
    if (candidate.matches("body, html, #root")) break;
    const overflowX = window.getComputedStyle(candidate).overflowX;
    if (overflowX === "auto" || overflowX === "scroll") return candidate;
    candidate = candidate.parentElement;
  }

  return table.parentElement;
}

function shouldSkipTable(table) {
  return Boolean(
    table.closest(MANAGED_ANCESTOR_SELECTOR) ||
      table.closest(PRINT_ANCESTOR_SELECTOR) ||
      table.closest("[hidden], [aria-hidden='true']"),
  );
}

export default function SystemHorizontalScrollbars() {
  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const states = new Map();
    let scanFrame = 0;

    const removeState = (viewport) => {
      const state = states.get(viewport);
      if (!state) return;
      state.cleanup();
      states.delete(viewport);
    };

    const enhance = (table) => {
      if (shouldSkipTable(table)) return;

      const columnCount = getColumnCount(table);
      const viewport = findViewport(table);
      if (!viewport || viewport.matches("body, html, #root")) return;

      if (states.has(viewport)) {
        states.get(viewport).update();
        return;
      }

      if (columnCount < 4 && viewport.scrollWidth <= viewport.clientWidth + 1) {
        return;
      }

      const controller = document.createElement("div");
      const track = document.createElement("div");
      const thumb = document.createElement("div");
      const rtlScrollbar = isRtlScrollContext(viewport);
      controller.className = rtlScrollbar
        ? "system-horizontal-scrollbar system-horizontal-scrollbar--rtl"
        : "system-horizontal-scrollbar";
      controller.setAttribute("aria-hidden", "true");
      track.className = "system-horizontal-scrollbar__track";
      track.setAttribute("role", "scrollbar");
      track.setAttribute("aria-label", "Horizontal table scroll");
      track.setAttribute("aria-orientation", "horizontal");
      track.setAttribute("aria-valuemin", "0");
      track.tabIndex = -1;
      thumb.className = "system-horizontal-scrollbar__thumb";
      track.appendChild(thumb);
      controller.appendChild(track);
      viewport.insertAdjacentElement("afterend", controller);

      viewport.classList.add("system-horizontal-scroll-viewport");
      table.classList.add("system-horizontal-scroll-table");
      if (columnCount >= 4) {
        const minWidth = Math.min(1400, Math.max(640, columnCount * 128));
        table.style.setProperty("--system-table-min-width", `${minWidth}px`);
      }

      let metrics = {
        canScroll: false,
        maxScroll: 0,
        thumbLeft: 0,
        thumbWidth: MIN_THUMB_WIDTH,
        rtlScrollbar,
      };
      let drag = null;
      let rafId = 0;
      let lastAlignedScrollWidth = 0;

      const update = () => {
        if (!viewport.isConnected || !table.isConnected) {
          removeState(viewport);
          return;
        }

        const isVisible =
          mediaQuery.matches &&
          viewport.getClientRects().length > 0 &&
          window.getComputedStyle(viewport).display !== "none";
        const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const trackWidth = track.clientWidth || viewport.clientWidth;
        const canScroll = isVisible && maxScroll > 1 && trackWidth > 0;

        if (
          canScroll &&
          rtlScrollbar &&
          viewport.scrollWidth !== lastAlignedScrollWidth
        ) {
          alignToRtlScrollStart(viewport);
          lastAlignedScrollWidth = viewport.scrollWidth;
        }

        const thumbWidth = canScroll
          ? Math.min(
              trackWidth,
              Math.max(
                MIN_THUMB_WIDTH,
                Math.round((viewport.clientWidth / viewport.scrollWidth) * trackWidth),
              ),
            )
          : trackWidth;
        const maxThumbLeft = Math.max(0, trackWidth - thumbWidth);
        const thumbRatio = getThumbRatio(viewport, maxScroll);
        const thumbLeft =
          canScroll && maxScroll > 0
            ? Math.round(thumbRatio * maxThumbLeft)
            : 0;
        const scrollLeft = getNormalizedScrollLeft(viewport);

        metrics = { canScroll, maxScroll, thumbLeft, thumbWidth, rtlScrollbar };
        controller.classList.toggle("is-visible", canScroll);
        controller.setAttribute("aria-hidden", String(!canScroll));
        track.tabIndex = canScroll ? 0 : -1;
        track.setAttribute("aria-valuemax", String(Math.round(maxScroll)));
        track.setAttribute("aria-valuenow", String(Math.round(scrollLeft)));
        thumb.style.width = `${thumbWidth}px`;
        applyThumbPosition(thumb, thumbLeft, maxThumbLeft, rtlScrollbar);
      };

      const scheduleUpdate = () => {
        window.cancelAnimationFrame(rafId);
        rafId = window.requestAnimationFrame(update);
      };

      const scrollToThumbLeft = (thumbLeft) => {
        const maxThumbLeft = Math.max(1, track.clientWidth - metrics.thumbWidth);
        const ratio = Math.min(1, Math.max(0, thumbLeft / maxThumbLeft));
        setScrollFromThumbRatio(viewport, ratio, metrics.maxScroll);
      };

      const onPointerDown = (event) => {
        if (!metrics.canScroll || (event.button !== undefined && event.button !== 0)) {
          return;
        }

        event.preventDefault();
        const rect = track.getBoundingClientRect();
        const onThumb = event.target === thumb;
        const nextThumbLeft = onThumb
          ? metrics.thumbLeft
          : event.clientX - rect.left - metrics.thumbWidth / 2;

        if (!onThumb) scrollToThumbLeft(nextThumbLeft);

        drag = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startThumbLeft: Math.min(
            Math.max(0, nextThumbLeft),
            Math.max(0, track.clientWidth - metrics.thumbWidth),
          ),
        };
        track.setPointerCapture?.(event.pointerId);
      };

      const onPointerMove = (event) => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.preventDefault();
        scrollToThumbLeft(drag.startThumbLeft + event.clientX - drag.startX);
      };

      const stopDragging = (event) => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        drag = null;
        track.releasePointerCapture?.(event.pointerId);
      };

      const onKeyDown = (event) => {
        if (!metrics.canScroll) return;

        const current = getNormalizedScrollLeft(viewport);
        const step = Math.max(48, Math.round(viewport.clientWidth * 0.18));
        let next = current;

        if (event.key === "ArrowLeft") next -= step;
        else if (event.key === "ArrowRight") next += step;
        else if (event.key === "PageUp") next -= viewport.clientWidth * 0.8;
        else if (event.key === "PageDown") next += viewport.clientWidth * 0.8;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = metrics.maxScroll;
        else return;

        event.preventDefault();
        setNormalizedScrollLeft(viewport, next);
      };

      viewport.addEventListener("scroll", scheduleUpdate, { passive: true });
      track.addEventListener("pointerdown", onPointerDown);
      track.addEventListener("pointermove", onPointerMove);
      track.addEventListener("pointerup", stopDragging);
      track.addEventListener("pointercancel", stopDragging);
      track.addEventListener("keydown", onKeyDown);

      const resizeObserver =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(scheduleUpdate);
      resizeObserver?.observe(viewport);
      resizeObserver?.observe(table);

      states.set(viewport, {
        update: scheduleUpdate,
        cleanup: () => {
          viewport.removeEventListener("scroll", scheduleUpdate);
          track.removeEventListener("pointerdown", onPointerDown);
          track.removeEventListener("pointermove", onPointerMove);
          track.removeEventListener("pointerup", stopDragging);
          track.removeEventListener("pointercancel", stopDragging);
          track.removeEventListener("keydown", onKeyDown);
          resizeObserver?.disconnect();
          window.cancelAnimationFrame(rafId);
          controller.remove();
          viewport.classList.remove("system-horizontal-scroll-viewport");
          table.classList.remove("system-horizontal-scroll-table");
          table.style.removeProperty("--system-table-min-width");
        },
      });

      scheduleUpdate();
    };

    const scan = () => {
      window.cancelAnimationFrame(scanFrame);
      scanFrame = window.requestAnimationFrame(() => {
        document.querySelectorAll("table").forEach(enhance);
        states.forEach((state, viewport) => {
          if (!viewport.isConnected) removeState(viewport);
          else state.update();
        });
      });
    };

    const mutationObserver = new MutationObserver(scan);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
    mediaQuery.addEventListener?.("change", scan);
    window.addEventListener("resize", scan);
    scan();

    return () => {
      mutationObserver.disconnect();
      mediaQuery.removeEventListener?.("change", scan);
      window.removeEventListener("resize", scan);
      window.cancelAnimationFrame(scanFrame);
      [...states.keys()].forEach(removeState);
    };
  }, []);

  return null;
}
