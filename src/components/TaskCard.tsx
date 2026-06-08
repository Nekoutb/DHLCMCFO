import Link from "next/link";
import type { TaskDef } from "@/lib/tasks";

export function TaskCard({ task }: { task: TaskDef }) {
  const available = task.status === "available";
  const inner = (
    <div
      className={`h-full rounded-xl border bg-white p-5 transition-shadow ${
        available
          ? "border-slate-200 hover:shadow-md hover:border-red-200"
          : "border-dashed border-slate-200 opacity-80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-2xl" aria-hidden>
          {task.icon}
        </span>
        {available ? (
          <span className="text-[11px] font-medium uppercase tracking-wide text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
            Available
          </span>
        ) : (
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            Coming soon
          </span>
        )}
      </div>
      <h3 className="mt-3 font-semibold text-slate-900">{task.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{task.description}</p>
      <p className="mt-3 text-xs text-slate-400">{task.inputs}</p>
      {available && (
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-red-700">
          Open task →
        </span>
      )}
    </div>
  );

  if (!available) return inner;
  return (
    <Link href={`/tasks/${task.id}`} className="block h-full">
      {inner}
    </Link>
  );
}
