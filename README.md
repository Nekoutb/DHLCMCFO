# Finance Operations Toolkit

An internal SaaS workbench for the finance team. Team members upload files and
run **approved, per-function tasks** — each one designed to follow agreed
policy and procedure.

This repository is the **draft foundation**. It ships with one fully working
task and a structure designed so new tasks can be added quickly as you design
them.

---

## What's in this draft

| Function                | Task                                   | Status         |
| ----------------------- | -------------------------------------- | -------------- |
| Mobile Money Operations | **Orange Cameroun — Transaction to PDF** | ✅ Working     |
| Bank & Recoverability   | Bank Statement Recoverability Analysis | 🕓 Coming soon |
| Customer Accounts       | Customer Account Analysis              | 🕓 Coming soon |

### Orange Cameroun — Transaction to PDF (the first task)

1. **Upload** an Orange Cameroun settlement file (Excel/CSV — one row per
   mobile-money payment). The header row and customer-identifier column are
   auto-detected, with manual overrides under _Advanced options_.
2. **Pick** a single transaction (or two). Known customers are highlighted.
3. **Generate a PDF** containing the file header plus the selected line(s) —
   download it, or **email** it to a recipient.
4. **Remember a customer**: type a name and save it against the transaction's
   identifier (e.g. phone number). Next time that customer appears, the name is
   recognised automatically.

---

## Running locally

```bash
npm install
cp .env.example .env.local   # optional — only needed for email
npm run dev                  # http://localhost:3000
```

Build for production:

```bash
npm run build && npm start
```

### Email configuration (optional)

PDF generation and download work with no configuration. To enable the **email**
button, set the SMTP variables in `.env.local` (see `.env.example`). For Gmail,
use an [App Password](https://support.google.com/accounts/answer/185833).

### Where data is stored

Remembered customer names are saved to `./data/customers.json` (override with
`DATA_DIR`). This folder is git-ignored. For multi-user production use, swap
this for a shared database — only `src/lib/customerStore.ts` needs to change.

---

## Architecture

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- File parsing: `exceljs` · PDF generation: `pdf-lib` · Email: `nodemailer`
- **Task registry** (`src/lib/tasks.ts`) is the single source of truth for what
  the team can do. The dashboard renders straight from it.

```
src/
  lib/
    tasks.ts          # registry of functions -> tasks (the plugin point)
    types.ts          # shared types
    excel.ts          # workbook parsing + header/identifier detection
    pdf.ts            # transaction PDF rendering
    customerStore.ts  # remembered customer names (file-backed)
    email.ts          # SMTP delivery
    site.ts           # branding
  components/         # SiteHeader, TaskCard, ComingSoon
  app/
    page.tsx                       # dashboard
    tasks/<task-id>/page.tsx       # one folder per task
    api/tasks/<task-id>/...        # that task's route handlers
    api/customers/                 # customer registry API
```

## Adding a new task

See **[docs/ADDING_A_TASK.md](docs/ADDING_A_TASK.md)**. In short: add an entry to
the registry, create a page folder, and (if it processes files) add a route
handler. Nothing else needs to change.

---

> **Internal use.** All uploaded files contain sensitive financial data and must
> be handled per finance policy and agreed procedures.
