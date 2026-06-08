import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { BuildPdfRequest } from "./types";

// A4 in points.
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const ACCENT = rgb(0.78, 0.12, 0.12); // restrained red
const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.85, 0.87, 0.9);
const ZEBRA = rgb(0.96, 0.97, 0.98);

interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
}

/** Split text so each line fits within maxWidth at the given size. */
function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // Hard-break a single word that is itself too long.
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let chunk = "";
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function newPage(ctx: Ctx): void {
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN;
}

function ensureSpace(ctx: Ctx, needed: number): void {
  if (ctx.y - needed < MARGIN + 30) newPage(ctx);
}

export async function buildTransactionPdf(req: BuildPdfRequest): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    font,
    bold,
    y: PAGE_HEIGHT - MARGIN,
  };

  const title = req.title?.trim() || "Orange Cameroun — Mobile Money Transaction";

  // --- Title bar -------------------------------------------------------------
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 6,
    width: 4,
    height: 26,
    color: ACCENT,
  });
  ctx.page.drawText(title, { x: MARGIN + 14, y: ctx.y, size: 16, font: bold, color: INK });
  ctx.y -= 28;

  // --- Metadata --------------------------------------------------------------
  const meta: string[] = [];
  if (req.customerName?.trim()) meta.push(`Customer: ${req.customerName.trim()}`);
  meta.push(`Source file: ${req.fileName}`);
  meta.push(`Generated: ${new Date().toLocaleString("en-GB")}`);
  for (const line of meta) {
    ctx.page.drawText(line, { x: MARGIN + 14, y: ctx.y, size: 9, font, color: MUTED });
    ctx.y -= 13;
  }
  ctx.y -= 6;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_WIDTH - MARGIN, y: ctx.y },
    thickness: 1,
    color: LINE,
  });
  ctx.y -= 18;

  // --- File header / preamble ------------------------------------------------
  if (req.preamble.length > 0) {
    ctx.page.drawText("File header", { x: MARGIN, y: ctx.y, size: 9, font: bold, color: MUTED });
    ctx.y -= 14;
    for (const line of req.preamble) {
      for (const wrapped of wrap(font, line, 8.5, CONTENT_WIDTH)) {
        ensureSpace(ctx, 12);
        ctx.page.drawText(wrapped, { x: MARGIN, y: ctx.y, size: 8.5, font, color: MUTED });
        ctx.y -= 11;
      }
    }
    ctx.y -= 10;
  }

  // --- Transaction table (Field | Value[s]) ----------------------------------
  const selected = req.selected.slice(0, 2);
  const valueCols = Math.max(1, selected.length);
  const fieldColWidth = 150;
  const valueColWidth = (CONTENT_WIDTH - fieldColWidth) / valueCols;
  const fieldSize = 9;
  const valueSize = 9;
  const padX = 6;
  const padY = 5;

  // Header row of the table.
  const drawTableHeader = () => {
    const labels = ["Field", ...selected.map((_, i) => selected.length > 1 ? `Transaction ${i + 1}` : "Value")];
    const rowH = 20;
    ensureSpace(ctx, rowH);
    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.y - rowH + 4,
      width: CONTENT_WIDTH,
      height: rowH,
      color: INK,
    });
    let x = MARGIN + padX;
    const widths = [fieldColWidth, ...selected.map(() => valueColWidth)];
    labels.forEach((label, i) => {
      ctx.page.drawText(label, {
        x,
        y: ctx.y - rowH + 4 + padY + 2,
        size: fieldSize,
        font: bold,
        color: rgb(1, 1, 1),
      });
      x += widths[i];
    });
    ctx.y -= rowH;
  };

  drawTableHeader();

  req.columns.forEach((col, rowIdx) => {
    const fieldLines = wrap(bold, col, fieldSize, fieldColWidth - padX * 2);
    const valueLinesPerTxn = selected.map((t) =>
      wrap(font, t.cells[col] ?? "", valueSize, valueColWidth - padX * 2),
    );
    const maxLines = Math.max(
      fieldLines.length,
      ...valueLinesPerTxn.map((l) => l.length),
    );
    const rowH = maxLines * 12 + padY * 2;

    if (ctx.y - rowH < MARGIN + 30) {
      newPage(ctx);
      drawTableHeader();
    }

    if (rowIdx % 2 === 1) {
      ctx.page.drawRectangle({
        x: MARGIN,
        y: ctx.y - rowH,
        width: CONTENT_WIDTH,
        height: rowH,
        color: ZEBRA,
      });
    }

    const top = ctx.y - padY - 9;
    // Field label.
    fieldLines.forEach((line, i) => {
      ctx.page.drawText(line, {
        x: MARGIN + padX,
        y: top - i * 12,
        size: fieldSize,
        font: bold,
        color: INK,
      });
    });
    // Values.
    valueLinesPerTxn.forEach((lines, txnIdx) => {
      const x = MARGIN + fieldColWidth + padX + txnIdx * valueColWidth;
      lines.forEach((line, i) => {
        ctx.page.drawText(line, {
          x,
          y: top - i * 12,
          size: valueSize,
          font,
          color: INK,
        });
      });
    });

    ctx.y -= rowH;
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y },
      end: { x: PAGE_WIDTH - MARGIN, y: ctx.y },
      thickness: 0.5,
      color: LINE,
    });
  });

  // Row references footer note.
  ctx.y -= 16;
  ensureSpace(ctx, 14);
  const refs = selected.map((t) => `#${t.rowNumber}`).join(", ");
  ctx.page.drawText(
    `Extracted from row(s) ${refs} of sheet "${req.fileName}".`,
    { x: MARGIN, y: ctx.y, size: 8, font, color: MUTED },
  );

  // --- Page footers ----------------------------------------------------------
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(
      `Generated by the Finance Operations Toolkit · Page ${i + 1} of ${pages.length}`,
      { x: MARGIN, y: MARGIN - 18, size: 7.5, font, color: MUTED },
    );
  });

  return doc.save();
}

/** Build a safe PDF file name from the transaction context. */
export function pdfFileName(req: BuildPdfRequest): string {
  const base = (req.customerName?.trim() || req.selected[0]?.identifier || "transaction")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `orange-cameroun-${base || "transaction"}.pdf`;
}
