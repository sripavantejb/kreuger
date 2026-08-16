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
import { MaterialsRequirementsTable } from "@/components/orders/materials-requirements-table";
import { buildStageList, nextStage, isTerminalStage } from "@/lib/stages";
import { formatNumber } from "@/lib/format";
import { priorityBadgeClass } from "@/lib/priority";
import { computeMaterialRequirements } from "@/lib/materials";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await syncBreaches();

  const [oc, departments, session] = await Promise.all([
    prisma.orderConfirmation.findUnique({
      where: { id },
      include: {
        product: { include: { materials: true } },
        colour: true,
        salesOrder: true,
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
  const materialLines = computeMaterialRequirements(oc.product.materials, oc.quantity);

  return (
    <div>
      <PageHeader
        title={oc.ocNumber}
        description={`${oc.product.name} · ${oc.colour.name} · ${formatNumber(oc.quantity)} units · target ${oc.targetDays} days`}
        help={{
          content: (
            <>
              <p>Full record for one order confirmation — capacity, materials, stages and delay history.</p>
              <ul>
                <li><strong>Capacity plan</strong> — workers and stage days from release-time planning.</li>
                <li><strong>Materials</strong> — required vs demo available stock (not SAP).</li>
                <li><strong>Stage tracker</strong> — advance production; breaches create escalation alerts.</li>
                <li><strong>Delay history</strong> — planned vs actual to answer why an OC was late.</li>
              </ul>
            </>
          ),
        }}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(oc.priority)}`}>
              {oc.priority}
            </span>
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
            {oc.salesOrder && (
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/sales-orders/${oc.salesOrder.id}`} />}>
                {oc.salesOrder.soNumber}
              </Button>
            )}
            <Button variant="outline" nativeButton={false} render={<Link href={`/manpower/${oc.id}`} />}>
              <Users2 /> Manpower plan
            </Button>
            {active && canWrite && <CancelOrderButton ocId={oc.id} ocNumber={oc.ocNumber} />}
          </div>
        }
      />

      <div className="space-y-8 px-4 py-6 sm:px-6 md:px-8">
        <Card>
          <CardContent className="space-y-6">
            <StageTracker stageList={stageList} currentStage={oc.currentStage} breachedStages={breachedStages} />

            {active && next && (
              <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  {openEvent && !isTerminalStage(oc.currentStage) && (
                    <>
                      <div className="mb-1 font-medium">{oc.currentStage}</div>
                      <StageCountdown
                        enteredAt={openEvent.enteredAt.toISOString()}
                        deadlineDays={openEvent.deadlineDays}
                      />
                      {openEvent.updatedBy && (
                        <div className="mt-1 text-xs text-muted-foreground">Updated by {openEvent.updatedBy}</div>
                      )}
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
            <h2 className="mb-3 text-sm font-semibold">Capacity plan at release</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Workers and stage days computed from target {oc.targetDays} days using department rates from Master Data.
              Adjust timelines on Manpower for what-if scenarios.
            </p>
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
                    <span className="mx-1">·</span>
                    {p.stageHours.toFixed(1)} hours
                  </div>
                ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-sm font-semibold">Material requirements</h2>
          <MaterialsRequirementsTable lines={materialLines} />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Delay history — why was this OC late?</h2>
          <StageBreakdown events={oc.events} />
        </div>
      </div>
    </div>
  );
}
