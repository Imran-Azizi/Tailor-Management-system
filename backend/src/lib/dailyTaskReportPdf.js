import PDFDocument from "pdfkit";

function formatReportType(type) {
  const value = String(type || "daily");
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatDate(value) {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function truncate(value, maxLength = 24) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

function drawSummaryRow(doc, label, value, y) {
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#334155")
    .text(label, 44, y, { width: 180 });

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#0F172A")
    .text(String(value), 230, y, { width: 320 });
}

function drawTableHeader(doc, y) {
  const rowHeight = 22;
  doc.save();
  doc.roundedRect(40, y, 515, rowHeight, 4).fill("#E2E8F0");
  doc.restore();

  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(9);
  doc.text("#", 48, y + 7, { width: 20 });
  doc.text("Date", 72, y + 7, { width: 104 });
  doc.text("From", 182, y + 7, { width: 110 });
  doc.text("Recipient", 298, y + 7, { width: 110 });
  doc.text("Amount", 414, y + 7, { width: 70, align: "right" });
  doc.text("Note", 492, y + 7, { width: 56 });

  return y + rowHeight;
}

export function buildDailyTaskReportPdf(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      info: {
        Title: "Daily Tasks Report",
        Author: "Tailor System",
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const from = report?.filters?.from;
    const to = report?.filters?.to;
    const type = report?.filters?.reportType || "daily";
    const summary = report?.summary || {};
    const tasks = Array.isArray(report?.tasks) ? report.tasks : [];

    doc
      .font("Helvetica-Bold")
      .fontSize(19)
      .fillColor("#0F172A")
      .text("Daily Tasks Report", 40, 36);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#475569")
      .text(`Generated at: ${formatDate(new Date().toISOString())}`, 40, 62);

    doc
      .moveTo(40, 78)
      .lineTo(555, 78)
      .lineWidth(1)
      .strokeColor("#CBD5E1")
      .stroke();

    drawSummaryRow(doc, "Report type", formatReportType(type), 92);
    drawSummaryRow(
      doc,
      "Date range",
      `${formatDate(from)} - ${formatDate(to)}`,
      108,
    );
    drawSummaryRow(doc, "Total tasks", summary.totalTasks || 0, 124);
    drawSummaryRow(
      doc,
      "Total amount / expenses",
      formatMoney(summary.totalAmount),
      140,
    );
    drawSummaryRow(
      doc,
      "Highest expense",
      formatMoney(summary.highestExpense),
      156,
    );
    drawSummaryRow(
      doc,
      "Average expense",
      formatMoney(summary.averageAmount),
      172,
    );

    let y = 196;
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#0F172A")
      .text("Daily Task Records", 40, y);

    y += 10;
    y = drawTableHeader(doc, y + 6);

    const rowHeight = 20;
    const footerThreshold = doc.page.height - 52;

    if (tasks.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#64748B")
        .text("No daily task records found for the selected period.", 44, y + 10);
    } else {
      tasks.forEach((task, index) => {
        if (y + rowHeight > footerThreshold) {
          doc.addPage();
          y = 40;
          doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor("#0F172A")
            .text("Daily Task Records (continued)", 40, y);
          y = drawTableHeader(doc, y + 16);
        }

        if (index % 2 === 0) {
          doc.save();
          doc.rect(40, y, 515, rowHeight).fill("#F8FAFC");
          doc.restore();
        }

        doc.fillColor("#0F172A").font("Helvetica").fontSize(9);
        doc.text(String(index + 1), 48, y + 6, { width: 20 });
        doc.text(formatDate(task.taskDate), 72, y + 6, { width: 104 });
        doc.text(truncate(task.fromName, 18), 182, y + 6, { width: 110 });
        doc.text(truncate(task.recipientName, 18), 298, y + 6, { width: 110 });
        doc.text(formatMoney(task.amount), 414, y + 6, { width: 70, align: "right" });
        doc.text(truncate(task.note || "-", 12), 492, y + 6, { width: 56 });

        y += rowHeight;
      });
    }

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#94A3B8")
      .text("Tailor System - Daily Tasks Report", 40, doc.page.height - 26, {
        width: 515,
        align: "center",
      });

    doc.end();
  });
}
