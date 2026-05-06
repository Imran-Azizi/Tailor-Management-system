import React from "react";
import PropTypes from "prop-types";

/**
 * ReportRoot: Consistent wrapper for all report/print pages.
 * Handles RTL/LTR direction, font, and text alignment for Afghanistan (Dari/Pashto/English).
 *
 * Usage:
 * <ReportRoot language={language}>
 *   ...report content...
 * </ReportRoot>
 */
export default function ReportRoot({
  language,
  children,
  style = {},
  className = "",
}) {
  const l = String(language || "en").toLowerCase();
  const isRtl =
    l.startsWith("dari") ||
    l.startsWith("fa") ||
    l.startsWith("pashto") ||
    l.startsWith("ps");
  const fontFamily = isRtl
    ? "'Vazirmatn', 'Noto Naskh Arabic', 'Noto Sans Arabic', 'Bahij Zar', 'Segoe UI', Tahoma, sans-serif"
    : "'Inter', 'Segoe UI', Arial, sans-serif";
  return (
    <div
      className={`report-root ${className}`}
      style={{
        direction: isRtl ? "rtl" : "ltr",
        textAlign: isRtl ? "right" : "left",
        fontFamily,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

ReportRoot.propTypes = {
  language: PropTypes.string.isRequired,
  children: PropTypes.node,
  style: PropTypes.object,
  className: PropTypes.string,
};
