// Shared types used by both server (parsing/PDF/email) and client (task UI).

/** A single transaction line extracted from an uploaded workbook. */
export interface ParsedTransaction {
  /** 1-based row number in the original sheet (useful for traceability). */
  rowNumber: number;
  /** Column label -> cell value (already stringified for display). */
  cells: Record<string, string>;
  /** Value of the column chosen as the customer identifier (e.g. phone number). */
  identifier: string | null;
  /** Customer name remembered from a previous session, if this identifier is known. */
  knownCustomerName: string | null;
}

/** Result of parsing an uploaded Excel/CSV file. */
export interface ParseResult {
  fileName: string;
  /** All worksheet names found in the workbook. */
  sheetNames: string[];
  /** The worksheet the transactions were read from. */
  sheetName: string;
  /** 1-based index of the row treated as the column header. */
  headerRowIndex: number;
  /** Column labels (the "header"). */
  columns: string[];
  /** Lines that appeared above the header row (file title / metadata). */
  preamble: string[];
  /** The column currently used to identify the customer, if any. */
  identifierColumn: string | null;
  /** Every data row below the header. */
  transactions: ParsedTransaction[];
  /** True if the row list was capped for performance. */
  truncated: boolean;
}

/** Payload sent from the client to generate a PDF (or email one). */
export interface BuildPdfRequest {
  fileName: string;
  title?: string;
  customerName?: string;
  columns: string[];
  preamble: string[];
  identifierColumn: string | null;
  /** The 1 or 2 transactions the user selected. */
  selected: ParsedTransaction[];
}

/** Email-specific fields layered on top of a PDF request. */
export interface SendEmailRequest extends BuildPdfRequest {
  recipient: string;
  subject?: string;
  message?: string;
}

/** A stored customer name <-> identifier mapping. */
export interface CustomerRecord {
  identifier: string;
  name: string;
  updatedAt: string;
}
