import { financeFunctions, getAllTasks } from "@/lib/tasks";
import { TaskCard } from "@/components/TaskCard";
import { siteConfig } from "@/lib/site";

export default function DashboardPage() {
  const total = getAllTasks().length;
  const available = getAllTasks().filter((t) => t.status === "available").length;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold text-slate-900">{siteConfig.name}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">{siteConfig.tagline}</p>
        <p className="mt-3 text-sm text-slate-400">
          {available} of {total} tasks ready · grouped by finance function
        </p>
      </section>

      {financeFunctions.map((fn) => (
        <section key={fn.id}>
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-slate-900">{fn.name}</h2>
            <p className="text-sm text-slate-500">{fn.description}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fn.tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
