import Link from "next/link";
import { getTask } from "@/lib/tasks";

/** Shared placeholder for tasks that are registered but not yet built. */
export function ComingSoon({ taskId }: { taskId: string }) {
  const found = getTask(taskId);
  if (!found) return null;
  const { task, fn } = found;

  return (
    <div className="max-w-2xl">
      <Link href="/" className="text-sm text-slate-500 hover:text-red-700">
        ← All tasks
      </Link>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          {task.icon}
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {fn.name}
          </p>
          <h1 className="text-xl font-bold text-slate-900">{task.title}</h1>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-6">
        <span className="inline-block text-[11px] font-medium uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          Coming soon
        </span>
        <p className="mt-3 text-slate-700">{task.description}</p>
        <p className="mt-2 text-sm text-slate-500">
          <span className="font-medium text-slate-600">Expected input:</span>{" "}
          {task.inputs}
        </p>
        <p className="mt-4 text-sm text-slate-500">
          This task is reserved in the toolkit. Share the detailed rules and a
          sample file, and it will be built to your agreed procedure.
        </p>
      </div>
    </div>
  );
}
