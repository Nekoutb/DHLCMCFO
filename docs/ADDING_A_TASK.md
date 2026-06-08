# Adding a new task

The toolkit is built so each task you design drops in cleanly. A task is made of
up to three pieces:

1. A **registry entry** (always)
2. A **page** for its UI (always)
3. One or more **API route handlers** (only if it processes files server-side)

This guide walks through all three using a fictional task,
`vat-reconciliation`.

---

## 1. Register the task

Edit `src/lib/tasks.ts` and add a `TaskDef` to the relevant function (or add a
new `FinanceFunction`):

```ts
{
  id: "vat-reconciliation",            // URL slug + folder name
  title: "VAT Reconciliation",
  description: "Reconcile VAT input/output from a ledger export.",
  inputs: "Ledger export (Excel/CSV).",
  status: "coming-soon",               // flip to "available" when ready
  icon: "🧾",
}
```

The dashboard updates automatically — no other change needed to list it.

---

## 2. Create the page

Create `src/app/tasks/vat-reconciliation/page.tsx`.

- While you're still designing it, just render the placeholder:

  ```tsx
  import { ComingSoon } from "@/components/ComingSoon";

  export default function Page() {
    return <ComingSoon taskId="vat-reconciliation" />;
  }
  ```

- When building the real UI, use the Orange Cameroun task
  (`src/app/tasks/orange-cameroun/page.tsx`) as a reference. It shows the full
  pattern: upload → parse → select → produce output.

---

## 3. (Optional) Add API route handlers

If the task processes files, add route handlers under
`src/app/api/tasks/vat-reconciliation/`:

```
src/app/api/tasks/vat-reconciliation/
  parse/route.ts     # accepts the upload, returns structured JSON
  pdf/route.ts       # (or xlsx/csv) returns the generated output
```

Each handler must opt into the Node runtime so the file libraries work:

```ts
export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  // ...parse with helpers from src/lib/excel.ts, return Response.json(...)
}
```

Reusable building blocks already available in `src/lib/`:

- `parseWorkbook()` — read an Excel/CSV upload into rows + detected header.
- `buildTransactionPdf()` — render selected rows to a PDF (or copy the pattern).
- `lookupCustomer()` / `saveCustomer()` — the remembered-customer registry.
- `sendTransactionEmail()` / `isEmailConfigured()` — SMTP delivery.

---

## Checklist

- [ ] Registry entry added in `src/lib/tasks.ts`
- [ ] `src/app/tasks/<id>/page.tsx` exists
- [ ] API handlers added if the task processes files
- [ ] `status` set to `"available"` when ready
- [ ] `npm run build` passes
