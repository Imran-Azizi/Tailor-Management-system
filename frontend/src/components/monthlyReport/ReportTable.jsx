import TableHorizontalScroll from "../ui/TableHorizontalScroll.jsx";

function resolveCellAlignment(isNumeric, isRtl) {
  if (isNumeric) return "text-end";
  return isRtl ? "text-right" : "text-left";
}

function resolveCellDirection(column, isRtl) {
  if (column.isNumeric) return "ltr";
  if (column.direction === "ltr" || column.direction === "rtl") {
    return column.direction;
  }
  return isRtl ? "rtl" : "ltr";
}

export default function ReportTable({
  columns,
  rows,
  rowKey = "id",
  emptyText = "-",
  isRtl = false,
  columnFlow,
}) {
  if (!Array.isArray(columns) || columns.length === 0) return null;

  const tableDirection =
    columnFlow === "ltr" || columnFlow === "rtl"
      ? columnFlow
      : isRtl
        ? "rtl"
        : "ltr";

  return (
    <TableHorizontalScroll
      viewportClassName="report-table-wrap enterprise-scroll-x"
      ariaLabel="Report table horizontal scroll"
      minWidth="980px"
    >
      <table
        className="report-table report-table--shared min-w-[980px] w-full border-separate border-spacing-0"
        dir={tableDirection}
        data-report-dir={isRtl ? "rtl" : "ltr"}
        data-column-flow={tableDirection}
      >
          <thead>
            <tr>
              {columns.map((column) => {
                const alignClass = resolveCellAlignment(column.isNumeric, isRtl);
                return (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-xs font-semibold ${alignClass} ${column.headerClassName || ""}`.trim()}
                    style={column.width ? { width: column.width } : undefined}
                    data-number={column.isNumeric ? "true" : undefined}
                    data-report-text={
                      column.isNumeric ? "ltr" : isRtl ? "rtl" : "ltr"
                    }
                  >
                    {column.label}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => {
                const key =
                  typeof rowKey === "function"
                    ? rowKey(row)
                    : (row?.[rowKey] ?? `row-${rowIndex}`);
                const stripeClass =
                  rowIndex % 2 === 0
                    ? "bg-white dark:bg-slate-900"
                    : "bg-slate-50/55 dark:bg-slate-900/80";

                return (
                  <tr
                    key={key}
                    className={`${stripeClass} transition hover:bg-slate-50 dark:hover:bg-slate-800`}
                  >
                    {columns.map((column) => {
                      const alignClass = resolveCellAlignment(
                        column.isNumeric,
                        isRtl,
                      );
                      const cellDirection = resolveCellDirection(column, isRtl);
                      const cellValue = column.render
                        ? column.render(row, rowIndex)
                        : row?.[column.key];
                      return (
                        <td
                          key={`${key}-${column.key}`}
                          className={`report-table-cell border-t px-4 py-3 text-sm align-top ${alignClass} ${column.isNumeric ? "report-table-cell--numeric" : "report-table-cell--text"} ${column.cellClassName || ""}`.trim()}
                          data-number={column.isNumeric ? "true" : undefined}
                          data-report-text={cellDirection}
                          data-column-key={column.key}
                        >
                          {cellValue ?? "-"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
    </TableHorizontalScroll>
  );
}
