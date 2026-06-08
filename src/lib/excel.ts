import ExcelJS from "exceljs";
import type { ParsedTransaction, ParseResult } from "./types";

/** Hard cap so a huge file can't exhaust memory / payload limits. */
const MAX_ROWS = 5000;
/** How many leading rows to scan when auto-detecting the header. */
const HEADER_SCAN_DEPTH = 20;

export interface ParseOptions {
  /** 1-based header row override (otherwise auto-detected). */
  headerRowIndex?: number;
  /** Force which column is the customer identifier. */
  identifierColumn?: string;
  /** Which worksheet to read (defaults to first non-empty sheet). */
  sheetName?: string;
}

// A stable key (phone/account/wallet) is preferred over a party name, because
// the name is exactly what we are trying to remember against that key.
const IDENTIFIER_STRONG =
  /(msisdn|phone|t[eé]l|num[eé]ro|number|account|compte|wallet|iban|rib)/i;
const IDENTIFIER_WEAK =
  /(sender|payer|payeur|client|customer|abonn|exp[eé]diteur)/i;

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 19).replace("T", " ");
  if (typeof value === "object") {
    // Formula / rich-text / hyperlink cells.
    const v = value as unknown as Record<string, unknown>;
    if ("result" in v && v.result !== undefined) return String(v.result);
    if ("text" in v && v.text !== undefined) return String(v.text);
    if ("richText" in v && Array.isArray(v.richText)) {
      return (v.richText as { text: string }[]).map((r) => r.text).join("");
    }
    if ("hyperlink" in v && v.hyperlink !== undefined) return String(v.hyperlink);
  }
  return String(value);
}

/** Read a row into a 1-based array of trimmed string cells. */
function rowToCells(row: ExcelJS.Row): string[] {
  const out: string[] = [];
  // row.values is 1-based (index 0 is null); normalise to a dense array.
  const values = row.values as ExcelJS.CellValue[];
  for (let c = 1; c < values.length; c++) {
    out[c] = cellToString(values[c]).trim();
  }
  return out;
}

function countNonEmpty(cells: string[]): number {
  return cells.filter((c) => c && c.length > 0).length;
}

/** Pick the row most likely to be the header (most filled cells, earliest). */
function detectHeaderRow(rows: string[][]): number {
  let bestIndex = 1;
  let bestScore = -1;
  const limit = Math.min(rows.length, HEADER_SCAN_DEPTH);
  for (let i = 0; i < limit; i++) {
    const score = countNonEmpty(rows[i] ?? []);
    if (score > bestScore && score >= 2) {
      bestScore = score;
      bestIndex = i + 1; // store as 1-based
    }
  }
  return bestIndex;
}

/** Build de-duplicated, non-empty column labels from a header row. */
function buildColumns(headerCells: string[]): string[] {
  const columns: string[] = [];
  const seen = new Map<string, number>();
  for (let c = 1; c < headerCells.length; c++) {
    let label = (headerCells[c] ?? "").trim();
    if (!label) label = `Column ${c}`;
    const count = seen.get(label) ?? 0;
    seen.set(label, count + 1);
    columns.push(count === 0 ? label : `${label} (${count + 1})`);
  }
  return columns;
}

function guessIdentifierColumn(columns: string[]): string | null {
  return (
    columns.find((c) => IDENTIFIER_STRONG.test(c)) ??
    columns.find((c) => IDENTIFIER_WEAK.test(c)) ??
    null
  );
}

/** Parse a workbook buffer into a structured, display-ready result. */
export async function parseWorkbook(
  buffer: Buffer,
  fileName: string,
  options: ParseOptions = {},
): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".csv")) {
    // exceljs reads CSV from a stream; emit the buffer as one chunk.
    const { Readable } = await import("stream");
    await workbook.csv.read(Readable.from([buffer]));
  } else {
    // Cast through the expected parameter type to avoid a Buffer type-identity
    // mismatch between @types/node and exceljs's bundled typings.
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
  }

  const sheetNames = workbook.worksheets.map((ws) => ws.name);
  if (sheetNames.length === 0) {
    throw new Error("The file does not contain any worksheets.");
  }

  const worksheet =
    (options.sheetName &&
      workbook.worksheets.find((ws) => ws.name === options.sheetName)) ||
    workbook.worksheets.find((ws) => ws.rowCount > 0) ||
    workbook.worksheets[0];

  // Read all rows, indexed by their true (1-based) row number so the mapping
  // between array position and sheet row stays correct even with gaps.
  const rows: string[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    rows[rowNumber - 1] = rowToCells(row);
  });

  const headerRowIndex =
    options.headerRowIndex && options.headerRowIndex > 0
      ? options.headerRowIndex
      : detectHeaderRow(rows);

  const headerCells = rows[headerRowIndex - 1] ?? [];
  const columns = buildColumns(headerCells);

  const preamble: string[] = [];
  for (let i = 0; i < headerRowIndex - 1; i++) {
    const line = (rows[i] ?? []).filter((c) => c && c.length).join("  ·  ");
    if (line) preamble.push(line);
  }

  const identifierColumn =
    options.identifierColumn && columns.includes(options.identifierColumn)
      ? options.identifierColumn
      : guessIdentifierColumn(columns);

  const transactions: ParsedTransaction[] = [];
  let truncated = false;
  for (let r = headerRowIndex; r < rows.length; r++) {
    const cells = rows[r] ?? [];
    if (countNonEmpty(cells) === 0) continue; // skip blank rows
    if (transactions.length >= MAX_ROWS) {
      truncated = true;
      break;
    }
    const record: Record<string, string> = {};
    columns.forEach((col, idx) => {
      record[col] = cells[idx + 1] ?? "";
    });
    const identifier = identifierColumn ? record[identifierColumn] || null : null;
    transactions.push({
      rowNumber: r + 1, // 1-based original row number
      cells: record,
      identifier,
      knownCustomerName: null, // filled in by the route after a store lookup
    });
  }

  return {
    fileName,
    sheetNames,
    sheetName: worksheet.name,
    headerRowIndex,
    columns,
    preamble,
    identifierColumn,
    transactions,
    truncated,
  };
}
