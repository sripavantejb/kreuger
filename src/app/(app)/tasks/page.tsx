import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody, EmptyState } from "@/components/layout/page-body";
import { StatCard } from "@/components/layout/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AssignTaskButton } from "@/components/tasks/assign-task-button";
import { TaskStatusActions } from "@/components/tasks/task-status-actions";
import { priorityBadgeClass } from "@/lib/priority";
import { ClipboardList, CircleDot, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtWhen(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ mine?: string }>;
}) {
  const session = await getSession();
  const canAssign = session ? roleAtLeast(session.role, "HEAD") : false;
  const sp = await searchParams;
  const mineOnly = sp.mine === "1" && session;

  const tasks = await prisma.plantTask.findMany({
    where: mineOnly && session ? { assigneeEmail: session.email } : undefined,
    include: { oc: { include: { product: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const open = tasks.filter((t) => t.status === "open" || t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div>
      <PageHeader
        title="Plant tasks"
        description="Assign work to plant and department heads — track open items through to done."
        actions={canAssign ? <AssignTaskButton /> : undefined}
      />
      <PageBody className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Open / in progress" value={String(open.length)} icon={<CircleDot className="size-4" />} />
          <StatCard label="Done" value={String(done.length)} icon={<CheckCircle2 className="size-4" />} />
          <StatCard label="Total shown" value={String(tasks.length)} icon={<ClipboardList className="size-4" />} />
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <a
            href="/tasks"
            className={`rounded-md border px-3 py-1.5 ${!mineOnly ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}
          >
            All tasks
          </a>
          <a
            href="/tasks?mine=1"
            className={`rounded-md border px-3 py-1.5 ${mineOnly ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}
          >
            Assigned to me
          </a>
        </div>

        <Card className="py-0">
          <CardContent className="p-0">
            {tasks.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="size-5" />}
                title="No tasks yet"
                description="Assign a task from Follow-up or here to a plant / department head."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>OC</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((t) => (
                    <TableRow key={t.id} className="h-14">
                      <TableCell>
                        <div className="font-medium">{t.title}</div>
                        {t.description && (
                          <div className="max-w-xs truncate text-xs text-muted-foreground">{t.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{t.oc?.ocNumber ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        <div>{t.assigneeName}</div>
                        <div className="text-xs text-muted-foreground">{t.assigneeEmail}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(t.priority)}`}>
                          {t.priority}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{fmtWhen(t.dueAt)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {t.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canAssign && <TaskStatusActions taskId={t.id} status={t.status} />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageBody>
    </div>
  );
}
