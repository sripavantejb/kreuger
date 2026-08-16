import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { syncBreaches } from "@/lib/breach";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users2 } from "lucide-react";
import { StageTracker } from "@/components/orders/stage-tracker";
import { StageBreakdown } from "@/components/orders/stage-breakdown";
import { AdvanceStageButton } from "@/components/orders/advance-stage-button";
import { CancelOrderButton } from "@/components/orders/cancel-order-button";
import { StageCountdown } from "@/components/orders/stage-countdown";
import { buildStageList, nextStage, isTerminalStage } from "@/lib/stages";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await syncBreaches();

  const [oc, departments, session] = await Promise.all([
    prisma.orderConfirmation.findUnique({
      where: { id },
      include: {
        product: true,
        colour: true,
        events: { orderBy: { enteredAt: "asc" } },
        plan: { include: { department: true } },
      },
    }),
    prisma.department.findMany({ orderBy: { sequence: "asc" } }),
    getSession(),
  ]);
  if (!oc) notFound();
  const canWrite = session ? roleAtLeast(session.role, "MANAGER") : false;

  const stageList = buildStageList(departments.map((d) => d.name));
  const next = nextStage(stageList, oc.currentStage);
  const breachedStages = new Set(oc.events.filter((e) => e.breached).map((e) => e.stageName));
  const openEvent = oc.events.find((e) => !e.exitedAt);
  const active = oc.status !== "closed" && oc.status !== "cancelled";

  return (
    <div>
      <PageHeader
        title={oc.ocNumber}
        description={`${oc.product.name} · ${oc.colour.name} · ${formatNumber(oc.quantity)} units · target ${oc.targetDays} days`}
        help={{
          content: (
            <>
              <p>This is the full record for one order confirmation, from release to Finished Goods.</p>
              <ul>
                <li><strong>Capacity plan</strong> — the department-by-department worker count computed at release time from the target timeline.</li>
                <li><strong>Stage tracker</strong> — advance the order to the next department as production progresses; each move is timestamped and can fire a stage-entry alert.</li>
                <li><strong>Delay breakdown</strong> — if the order is running late, shows which stage is behind and by how much.</li>
              </ul>
              <p>Edit or cancel an order from the actions above if it needs correcting.</p>
            </>
          ),
        }}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`border-transparent capitalize ${
                oc.status === "cancelled"
                  ? "bg-[var(--status-breach-bg)] text-[var(--status-breach)]"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {oc.status.replace("_", " ")}
            </Badge>
            <Button variant="outline" nativeButton={false} render={<Link href={`/manpower/${oc.id}`} />}>
              <Users2 /> Manpower plan
            </Button>
            {active && canWrite && <CancelOrderButton ocId={oc.id} ocNumber={oc.ocNumber} />}
          </div>
        }
      />

      <div className="space-y-8 px-4 sm:px-6 md:px-8 py-6">
        <Card>
          <CardContent className="space-y-6">
            <StageTracker stageList={stageList} currentStage={oc.currentStage} breachedStages={breachedStages} />

            {active && next && (
              <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  {openEvent && !isTerminalStage(oc.currentStage) && (
                    <>
                      <span className="text-muted-foreground">Current stage — </span>
                      <StageCountdown
                        enteredAt={openEvent.enteredAt.toISOString()}
                        deadlineDays={openEvent.deadlineDays}
                      />
                    </>
                  )}
                </div>
                {canWrite && <AdvanceStageButton ocId={oc.id} nextStage={next} />}
              </div>
            )}
          </CardContent>
        </Card>

        {oc.plan.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold">Capacity plan</h2>
            <div className="flex flex-wrap gap-6 text-sm">
              {oc.plan
                .slice()
                .sort((a, b) => a.department.sequence - b.department.sequence)
                .map((p) => (
                  <div key={p.id} className="text-muted-foreground">
                    {p.department.name}:{" "}
                    <span className="font-medium text-foreground">{p.workersRequired} workers</span>
                    <span className="mx-1">·</span>
                    {p.stageDays.toFixed(2)} days
                  </div>
                ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-sm font-semibold">Delay history</h2>
          <StageBreakdown events={oc.events} />
        </div>
      </div>
    </div>
  );
}
