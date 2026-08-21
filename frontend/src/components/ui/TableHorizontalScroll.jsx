import { useEffect, useRef, useState } from "react";

const THUMB_MIN = 64;
const DEFAULT_MAX_VISIBLE_ROWS = 5;

let cachedRtlScrollType = null;

function detectRtlScrollType() {
  if (typeof document === "undefined") return "negative";
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

function countDataRows(viewport) {
  if (!viewport) return 0;
  const tables = viewport.querySelectorAll("table");
  let maxRows = 0;
  tables.forEach((table) => {
    const rows = table.tBodies?.[0]?.rows?.length || 0;
    if (rows > maxRows) maxRows = rows;
  });
  return maxRows;
}

function measureCappedHeight(viewport, maxVisibleRows) {
  const table = viewport?.querySelector("table");
  if (!table || !maxVisibleRows) return null;

  const bodyRows = table.tBodies?.[0]?.rows;
  if (!bodyRows?.length) return null;

  const styles = window.getComputedStyle(viewport);
  const paddingY =
    (Number.parseFloat(styles.paddingTop) || 0) +
    (Number.parseFloat(styles.paddingBottom) || 0);

  let height = paddingY;
  if (table.tHead) {
    height += table.tHead.getBoundingClientRect().height;
  }

  const sampleCount = Math.min(maxVisibleRows, bodyRows.length);
  for (let index = 0; index < sampleCount; index += 1) {
    height += bodyRows[index].getBoundingClientRect().height;
  }

  // Small buffer so the 5th row isn't clipped by borders.
  return Math.ceil(height + 2);
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Reusable table scroll shell.
 * - Horizontal scroll only inside the container (custom bar when needed)
 * - When rows exceed maxVisibleRows, viewport height locks to ~N records
 *   and additional rows scroll vertically inside the same container
 */
export default function TableHorizontalScroll({
  children,
  className = "",
  viewportClassName = "",
  ariaLabel = "Table horizontal scroll",
  minWidth,
  maxVisibleRows = DEFAULT_MAX_VISIBLE_ROWS,
}) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const metricsRef = useRef({
    canScroll: false,
    maxScroll: 0,
    thumbLeft: 0,
    thumbWidth: THUMB_MIN,
  });
  const dragRef = useRef(null);
  const rafRef = useRef(0);
  const [metrics, setMetrics] = useState(metricsRef.current);
  const [rowCount, setRowCount] = useState(0);
  const [isCapped, setIsCapped] = useState(false);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    if (minWidth) {
      viewport.style.setProperty("--table-hscroll-min-width", minWidth);
    }

    const update = () => {
      const table = viewport.querySelector("table");
      const nextRowCount = countDataRows(viewport);
      const shouldCap =
        Number(maxVisibleRows) > 0 && nextRowCount > Number(maxVisibleRows);

      const forcedMinWidth = minWidth
        ? Number.parseFloat(String(minWidth))
        : Number.parseFloat(
            viewport.style.getPropertyValue("--table-hscroll-min-width") || "0",
          );

      if (table && Number.isFinite(forcedMinWidth) && forcedMinWidth > 0) {
        table.style.minWidth = `${forcedMinWidth}px`;
      }

      if (shouldCap) {
        const cappedHeight = measureCappedHeight(viewport, Number(maxVisibleRows));
        if (cappedHeight) {
          viewport.style.setProperty(
            "--table-hscroll-max-height",
            `${cappedHeight}px`,
          );
        }
      } else {
        viewport.style.removeProperty("--table-hscroll-max-height");
      }

      // Prefer table scrollWidth so compressed layouts still report overflow.
      const contentWidth = Math.max(
        viewport.scrollWidth,
        table?.scrollWidth || 0,
        table?.offsetWidth || 0,
        Number.isFinite(forcedMinWidth) ? forcedMinWidth : 0,
      );
      const maxScroll = Math.max(0, contentWidth - viewport.clientWidth);
      const trackWidth =
        (trackRef.current && !trackRef.current.closest("[hidden]")
          ? trackRef.current.clientWidth
          : 0) || viewport.clientWidth;
      const canScroll = maxScroll > 2 && viewport.clientWidth > 0;
      const thumbWidth = canScroll
        ? Math.max(
            THUMB_MIN,
            Math.round((viewport.clientWidth / Math.max(contentWidth, 1)) * trackWidth),
          )
        : trackWidth;
      const maxThumbLeft = Math.max(0, trackWidth - thumbWidth);
      const normalizedScrollLeft = getNormalizedScrollLeft(viewport);
      const thumbLeft =
        canScroll && maxScroll > 0
          ? Math.round((normalizedScrollLeft / maxScroll) * maxThumbLeft)
          : 0;

      setRowCount(nextRowCount);
      setIsCapped(shouldCap);
      setMetrics({ canScroll, maxScroll, thumbLeft, thumbWidth });
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = window.requestAnimationFrame(update);
    };

    scheduleUpdate();
    viewport.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(viewport);
      if (viewport.firstElementChild) {
        resizeObserver.observe(viewport.firstElementChild);
      }
    }

    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(scheduleUpdate);
    mutationObserver?.observe(viewport, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      viewport.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.cancelAnimationFrame(rafRef.current);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      viewport.style.removeProperty("--table-hscroll-min-width");
      viewport.style.removeProperty("--table-hscroll-max-height");
    };
  }, [minWidth, maxVisibleRows]);

  useEffect(() => {
    if (!metrics.canScroll) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      if (!viewport || !track) return;
      const table = viewport.querySelector("table");
      const forcedMinWidth = minWidth ? Number.parseFloat(String(minWidth)) : 0;
      const contentWidth = Math.max(
        viewport.scrollWidth,
        table?.scrollWidth || 0,
        table?.offsetWidth || 0,
        Number.isFinite(forcedMinWidth) ? forcedMinWidth : 0,
      );
      const maxScroll = Math.max(0, contentWidth - viewport.clientWidth);
      const trackWidth = track.clientWidth || viewport.clientWidth;
      if (maxScroll <= 2 || trackWidth <= 0) return;
      const thumbWidth = Math.max(
        THUMB_MIN,
        Math.round((viewport.clientWidth / Math.max(contentWidth, 1)) * trackWidth),
      );
      const maxThumbLeft = Math.max(0, trackWidth - thumbWidth);
      const normalizedScrollLeft = getNormalizedScrollLeft(viewport);
      const thumbLeft = Math.round((normalizedScrollLeft / maxScroll) * maxThumbLeft);
      setMetrics((prev) => ({
        ...prev,
        maxScroll,
        thumbWidth,
        thumbLeft,
      }));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [metrics.canScroll, minWidth]);

  const scrollToThumbLeft = (thumbLeft) => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const maxThumbLeft = Math.max(1, track.clientWidth - metricsRef.current.thumbWidth);
    const ratio = Math.min(1, Math.max(0, thumbLeft / maxThumbLeft));
    setNormalizedScrollLeft(viewport, ratio * metricsRef.current.maxScroll);
  };

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const track = trackRef.current;
    if (!track || !metricsRef.current.canScroll) return;

    event.preventDefault();
    const rect = track.getBoundingClientRect();
    const onThumb = Boolean(event.target.closest(".table-hscroll-scrollbar__thumb"));
    const nextThumbLeft = onThumb
      ? metricsRef.current.thumbLeft
      : event.clientX - rect.left - metricsRef.current.thumbWidth / 2;

    if (!onThumb) scrollToThumbLeft(nextThumbLeft);

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startThumbLeft: Math.min(
        Math.max(0, nextThumbLeft),
        Math.max(0, track.clientWidth - metricsRef.current.thumbWidth),
      ),
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    scrollToThumbLeft(drag.startThumbLeft + event.clientX - drag.startX);
  };

  const stopDragging = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  const handleKeyDown = (event) => {
    const viewport = viewportRef.current;
    if (!viewport || !metricsRef.current.canScroll) return;

    const current = getNormalizedScrollLeft(viewport);
    const step = Math.max(48, Math.round(viewport.clientWidth * 0.18));
    let next = current;

    if (event.key === "ArrowLeft") next = current - step;
    else if (event.key === "ArrowRight") next = current + step;
    else if (event.key === "PageUp") next = current - viewport.clientWidth * 0.8;
    else if (event.key === "PageDown") next = current + viewport.clientWidth * 0.8;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = metricsRef.current.maxScroll;
    else return;

    event.preventDefault();
    setNormalizedScrollLeft(viewport, next);
  };

  return (
    <div
      className={cn(
        "table-hscroll-shell orders-scroll-shell",
        rowCount > DEFAULT_MAX_VISIBLE_ROWS && "table-hscroll-shell--dense",
        isCapped && "table-hscroll-shell--capped",
        className,
      )}
      data-system-scroll-ignore="true"
      data-row-count={rowCount > DEFAULT_MAX_VISIBLE_ROWS ? "gt5" : String(rowCount)}
      data-capped={isCapped ? "true" : undefined}
    >
      <div
        ref={viewportRef}
        className={cn(
          "table-hscroll-viewport tbl-wrap order-scroll-x",
          viewportClassName,
        )}
        data-has-min-width={minWidth ? "true" : undefined}
        tabIndex={0}
      >
        {children}
      </div>
      <div
        className={cn(
          "table-hscroll-scrollbar orders-table-scrollbar",
          metrics.canScroll && "is-visible",
        )}
        hidden={!metrics.canScroll}
        aria-hidden={!metrics.canScroll}
      >
          <div
            ref={trackRef}
            className="table-hscroll-scrollbar__track orders-table-scrollbar__track"
            role="scrollbar"
            aria-label={ariaLabel}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={Math.round(metrics.maxScroll)}
            aria-valuenow={Math.round(
              metrics.maxScroll > 0
                ? (metrics.thumbLeft /
                    Math.max(
                      1,
                      (trackRef.current?.clientWidth || 0) - metrics.thumbWidth,
                    )) *
                    metrics.maxScroll
                : 0,
            )}
            tabIndex={metrics.canScroll ? 0 : -1}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
          >
            <div
              className="table-hscroll-scrollbar__thumb orders-table-scrollbar__thumb"
              style={{
                width: `${metrics.thumbWidth}px`,
                transform: `translateX(${metrics.thumbLeft}px)`,
              }}
            />
          </div>
        </div>
    </div>
  );
}
