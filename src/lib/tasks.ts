// =============================================================================
// TASK REGISTRY
// -----------------------------------------------------------------------------
// This is the single place that defines what the finance team can do.
//
// The app is organised as FUNCTIONS (areas of the finance department) that each
// contain TASKS (the individual tools the team runs).
//
// To ADD A NEW TASK that you have designed:
//   1. Add a TaskDef entry to the relevant function below (or add a new
//      FinanceFunction).
//   2. Create a page at  src/app/tasks/<your-task-id>/page.tsx
//   3. (Optional) Add API route handlers under
//      src/app/api/tasks/<your-task-id>/...
//
// Nothing else needs to change — the dashboard and navigation read from here.
// See docs/ADDING_A_TASK.md for a step-by-step guide.
// =============================================================================

export type TaskStatus = "available" | "coming-soon";

export interface TaskDef {
  /** URL slug and folder name under src/app/tasks/. */
  id: string;
  title: string;
  /** One-line summary shown on the dashboard card. */
  description: string;
  /** Short note on what the user should upload / expect. */
  inputs: string;
  status: TaskStatus;
  /** Emoji used as a lightweight icon (kept dependency-free). */
  icon: string;
}

export interface FinanceFunction {
  id: string;
  name: string;
  description: string;
  tasks: TaskDef[];
}

export const financeFunctions: FinanceFunction[] = [
  {
    id: "mobile-money",
    name: "Mobile Money Operations",
    description:
      "Process mobile-money settlement files and produce per-transaction documents.",
    tasks: [
      {
        id: "orange-cameroun",
        title: "Orange Cameroun — Transaction to PDF",
        description:
          "Upload an Orange Cameroun settlement file, pick a single transaction, and produce a PDF (header + line) ready to email.",
        inputs: "Excel/CSV export with one row per mobile-money payment.",
        status: "available",
        icon: "📱",
      },
    ],
  },
  {
    id: "recoverability",
    name: "Bank & Recoverability",
    description:
      "Analyse bank statements to assess what is recoverable, per policy.",
    tasks: [
      {
        id: "bank-recoverability",
        title: "Bank Statement Recoverability Analysis",
        description:
          "Upload a bank statement and flag amounts by recoverability status following agreed procedures.",
        inputs: "Bank statement export (Excel/CSV/PDF).",
        status: "coming-soon",
        icon: "🏦",
      },
    ],
  },
  {
    id: "customer-accounts",
    name: "Customer Accounts",
    description: "Review and analyse customer account activity and balances.",
    tasks: [
      {
        id: "customer-account-analysis",
        title: "Customer Account Analysis",
        description:
          "Upload a customer ledger to summarise balances, ageing, and exceptions.",
        inputs: "Customer ledger / statement export (Excel/CSV).",
        status: "coming-soon",
        icon: "📊",
      },
    ],
  },
];

/** Flat list of every task across all functions. */
export function getAllTasks(): TaskDef[] {
  return financeFunctions.flatMap((fn) => fn.tasks);
}

/** Look up a task and the function it belongs to. */
export function getTask(
  id: string,
): { task: TaskDef; fn: FinanceFunction } | null {
  for (const fn of financeFunctions) {
    const task = fn.tasks.find((t) => t.id === id);
    if (task) return { task, fn };
  }
  return null;
}
