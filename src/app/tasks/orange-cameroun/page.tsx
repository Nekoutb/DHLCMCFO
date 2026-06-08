"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getTask } from "@/lib/tasks";
import type { BuildPdfRequest, ParseResult, SendEmailRequest } from "@/lib/types";

const MAX_SELECTION = 2;
const MAX_DISPLAY_ROWS = 300;

type Notice = { type: "success" | "error" | "info"; text: string } | null;

export default function OrangeCamerounPage() {
  const meta = getTask("orange-cameroun");

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  // Advanced parsing overrides.
  const [sheetName, setSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState("");
  const [identifierColumn, setIdentifierColumn] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Selection + output.
  const [selected, setSelected] = useState<number[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [filter, setFilter] = useState("");

  // Email.
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [busy, setBusy] = useState<"pdf" | "email" | "save" | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Load email config once.
  useEffect(() => {
    fetch("/api/tasks/orange-cameroun/config")
      .then((r) => r.json())
      .then((c) => {
        setEmailConfigured(Boolean(c.emailConfigured));
        if (c.defaultRecipient) setRecipient(c.defaultRecipient);
      })
      .catch(() => undefined);
  }, []);

  const parse = useCallback(
    async (f: File, overrides?: { sheetName?: string; headerRow?: string; identifierColumn?: string }) => {
      setParsing(true);
      setNotice(null);
      try {
        const form = new FormData();
        form.append("file", f);
        if (overrides?.sheetName) form.append("sheetName", overrides.sheetName);
        if (overrides?.headerRow) form.append("headerRow", overrides.headerRow);
        if (overrides?.identifierColumn)
          form.append("identifierColumn", overrides.identifierColumn);

        const res = await fetch("/api/tasks/orange-cameroun/parse", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not read the file.");

        const parsed = data as ParseResult;
        setResult(parsed);
        setSheetName(parsed.sheetName);
        setHeaderRow(String(parsed.headerRowIndex));
        setIdentifierColumn(parsed.identifierColumn ?? "");
        setSelected([]);
        if (parsed.truncated) {
          setNotice({
            type: "info",
            text: `Large file — showing the first ${parsed.transactions.length} transactions.`,
          });
        }
      } catch (err) {
        setResult(null);
        setNotice({
          type: "error",
          text: err instanceof Error ? err.message : "Could not read the file.",
        });
      } finally {
        setParsing(false);
      }
    },
    [],
  );

  const onFile = useCallback(
    (f: File | undefined) => {
      if (!f) return;
      setFile(f);
      setCustomerName("");
      parse(f);
    },
    [parse],
  );

  // Drag and drop.
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const over = (e: DragEvent) => {
      e.preventDefault();
      el.classList.add("ring-2", "ring-red-400");
    };
    const leave = () => el.classList.remove("ring-2", "ring-red-400");
    const drop = (e: DragEvent) => {
      e.preventDefault();
      leave();
      onFile(e.dataTransfer?.files?.[0]);
    };
    el.addEventListener("dragover", over);
    el.addEventListener("dragleave", leave);
    el.addEventListener("drop", drop);
    return () => {
      el.removeEventListener("dragover", over);
      el.removeEventListener("dragleave", leave);
      el.removeEventListener("drop", drop);
    };
  }, [onFile]);

  const reReadWithOptions = () => {
    if (file) parse(file, { sheetName, headerRow, identifierColumn });
  };

  const toggleRow = (rowNumber: number) => {
    setSelected((prev) => {
      if (prev.includes(rowNumber)) return prev.filter((r) => r !== rowNumber);
      if (prev.length >= MAX_SELECTION) {
        setNotice({
          type: "info",
          text: `You can include at most ${MAX_SELECTION} transactions in one PDF.`,
        });
        return prev;
      }
      return [...prev, rowNumber];
    });
  };

  const selectedTransactions = useMemo(() => {
    if (!result) return [];
    return selected
      .map((rn) => result.transactions.find((t) => t.rowNumber === rn))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, [selected, result]);

  // Pre-fill the customer name from a remembered match.
  useEffect(() => {
    if (selectedTransactions.length === 1 && !customerName) {
      const known = selectedTransactions[0].knownCustomerName;
      if (known) setCustomerName(known);
    }
  }, [selectedTransactions, customerName]);

  const filteredTransactions = useMemo(() => {
    if (!result) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return result.transactions.slice(0, MAX_DISPLAY_ROWS);
    return result.transactions
      .filter((t) =>
        Object.values(t.cells).some((v) => v.toLowerCase().includes(q)) ||
        (t.knownCustomerName ?? "").toLowerCase().includes(q),
      )
      .slice(0, MAX_DISPLAY_ROWS);
  }, [result, filter]);

  const buildRequest = (): BuildPdfRequest | null => {
    if (!result || selectedTransactions.length === 0) return null;
    return {
      fileName: result.fileName,
      customerName: customerName.trim() || undefined,
      columns: result.columns,
      preamble: result.preamble,
      identifierColumn: result.identifierColumn,
      selected: selectedTransactions,
    };
  };

  const downloadPdf = async () => {
    const req = buildRequest();
    if (!req) return;
    setBusy("pdf");
    setNotice(null);
    try {
      const res = await fetch("/api/tasks/orange-cameroun/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not generate the PDF.");
      }
      const blob = await res.blob();
      const name =
        res.headers.get("Content-Disposition")?.match(/filename="(.+?)"/)?.[1] ??
        "orange-cameroun-transaction.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setNotice({ type: "success", text: "PDF generated and downloaded." });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Could not generate the PDF.",
      });
    } finally {
      setBusy(null);
    }
  };

  const sendEmail = async () => {
    const base = buildRequest();
    if (!base) return;
    if (!recipient.trim()) {
      setNotice({ type: "error", text: "Enter a recipient email address." });
      return;
    }
    setBusy("email");
    setNotice(null);
    try {
      const req: SendEmailRequest = {
        ...base,
        recipient: recipient.trim(),
        subject: subject.trim() || undefined,
        message: message.trim() || undefined,
      };
      const res = await fetch("/api/tasks/orange-cameroun/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (data.ok) {
        setNotice({ type: "success", text: `Email sent to ${req.recipient}.` });
      } else if (data.configured === false) {
        setNotice({
          type: "info",
          text:
            "Email isn't set up on the server yet — download the PDF and attach it manually, or ask an admin to configure SMTP.",
        });
      } else {
        throw new Error(data.error || "Could not send the email.");
      }
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Could not send the email.",
      });
    } finally {
      setBusy(null);
    }
  };

  const saveCustomer = async () => {
    const tx = selectedTransactions[0];
    if (!tx?.identifier) {
      setNotice({
        type: "error",
        text: "No identifier on this transaction. Pick the identifier column in Advanced options.",
      });
      return;
    }
    if (!customerName.trim()) {
      setNotice({ type: "error", text: "Enter a customer name to remember." });
      return;
    }
    setBusy("save");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: tx.identifier, name: customerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the customer.");
      // Reflect the saved name immediately in the loaded data.
      setResult((prev) =>
        prev
          ? {
              ...prev,
              transactions: prev.transactions.map((t) =>
                t.identifier === tx.identifier
                  ? { ...t, knownCustomerName: customerName.trim() }
                  : t,
              ),
            }
          : prev,
      );
      setNotice({
        type: "success",
        text: `Saved “${customerName.trim()}” for ${tx.identifier}. It will be recognised next time.`,
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Could not save the customer.",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-red-700">
          ← All tasks
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            {meta?.task.icon}
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {meta?.fn.name}
            </p>
            <h1 className="text-xl font-bold text-slate-900">
              {meta?.task.title}
            </h1>
          </div>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Upload an Orange Cameroun settlement file, choose a single transaction
          (or two), and produce a PDF with the file header and that line — ready
          to download or email. Customer names you add are remembered and
          recognised automatically next time.
        </p>
      </div>

      {notice && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : notice.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Step 1 — Upload */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">1. Upload the file</h2>
        <div
          ref={dropRef}
          className="mt-3 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition"
        >
          <p className="text-sm text-slate-600">
            Drag &amp; drop an Excel/CSV file here, or
          </p>
          <label className="mt-2 inline-block cursor-pointer rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800">
            Choose file
            <input
              type="file"
              accept=".xlsx,.xlsm,.csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          {file && (
            <p className="mt-3 text-xs text-slate-500">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
              {parsing && " · reading…"}
            </p>
          )}
          <p className="mt-3 text-xs text-slate-400">
            Accepted: .xlsx, .xlsm, .csv (legacy .xls must be re-saved as .xlsx).
          </p>
        </div>

        {result && (
          <div className="mt-4">
            <button
              onClick={() => setShowAdvanced((s) => !s)}
              className="text-xs font-medium text-slate-500 hover:text-red-700"
            >
              {showAdvanced ? "▾" : "▸"} Advanced parsing options
            </button>
            {showAdvanced && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3 rounded-lg bg-slate-50 p-3">
                <label className="text-xs text-slate-600">
                  Worksheet
                  <select
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  >
                    {result.sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-600">
                  Header row
                  <input
                    type="number"
                    min={1}
                    value={headerRow}
                    onChange={(e) => setHeaderRow(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs text-slate-600">
                  Customer identifier column
                  <select
                    value={identifierColumn}
                    onChange={(e) => setIdentifierColumn(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="">(auto-detect)</option>
                    {result.columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="sm:col-span-3">
                  <button
                    onClick={reReadWithOptions}
                    disabled={parsing}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Re-read file with these options
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Step 2 — Pick a transaction */}
      {result && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">
              2. Pick a transaction{" "}
              <span className="font-normal text-slate-400">
                ({selected.length}/{MAX_SELECTION} selected)
              </span>
            </h2>
            <input
              type="search"
              placeholder="Filter transactions…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Sheet “{result.sheetName}” · header row {result.headerRowIndex} ·{" "}
            {result.transactions.length} transactions
            {result.identifierColumn
              ? ` · identifier: ${result.identifierColumn}`
              : " · no identifier column detected"}
          </p>

          <div className="mt-3 max-h-[26rem] overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 text-left text-xs text-slate-600">
                <tr>
                  <th className="px-2 py-2 w-10"></th>
                  <th className="px-2 py-2">Row</th>
                  <th className="px-2 py-2">Customer</th>
                  {result.columns.map((c) => (
                    <th key={c} className="whitespace-nowrap px-2 py-2">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => {
                  const checked = selected.includes(t.rowNumber);
                  return (
                    <tr
                      key={t.rowNumber}
                      className={`border-t border-slate-100 ${
                        checked ? "bg-red-50" : "hover:bg-slate-50"
                      }`}
                      onClick={() => toggleRow(t.rowNumber)}
                    >
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          className="accent-red-700"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-slate-400">{t.rowNumber}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        {t.knownCustomerName ? (
                          <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700">
                            {t.knownCustomerName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      {result.columns.map((c) => (
                        <td
                          key={c}
                          className="max-w-[16rem] truncate whitespace-nowrap px-2 py-1.5 text-slate-700"
                          title={t.cells[c]}
                        >
                          {t.cells[c]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {result.transactions.length > filteredTransactions.length && (
            <p className="mt-2 text-xs text-slate-400">
              Showing {filteredTransactions.length} of{" "}
              {result.transactions.length}. Use the filter to narrow down.
            </p>
          )}
        </section>
      )}

      {/* Step 3 — Customer + output */}
      {selectedTransactions.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
          <h2 className="font-semibold text-slate-900">
            3. Customer &amp; output
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              Customer name
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Société ABC SARL"
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-xs text-slate-400">
                {selectedTransactions[0]?.identifier
                  ? `Identifier: ${selectedTransactions[0].identifier}`
                  : "No identifier on this row — set the identifier column to remember names."}
              </span>
            </label>
            <div className="flex items-end">
              <button
                onClick={saveCustomer}
                disabled={busy === "save" || !selectedTransactions[0]?.identifier}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {busy === "save" ? "Saving…" : "Remember this customer"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
            <button
              onClick={downloadPdf}
              disabled={busy === "pdf"}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {busy === "pdf" ? "Generating…" : "Generate PDF (download)"}
            </button>
          </div>

          {/* Email */}
          <div className="rounded-lg bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Email the PDF
            </h3>
            {!emailConfigured && (
              <p className="mt-1 text-xs text-amber-700">
                Server email isn’t configured yet. You can still fill this in —
                it will be enabled once SMTP credentials are set.
              </p>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-slate-600">
                Recipient
                <input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="finance@example.com"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-slate-600">
                Subject (optional)
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Orange Cameroun transaction"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-slate-600 sm:col-span-2">
                Message (optional)
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <button
              onClick={sendEmail}
              disabled={busy === "email"}
              className="mt-3 rounded-md border border-red-700 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {busy === "email" ? "Sending…" : "Send email"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
