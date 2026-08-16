import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody, EmptyState } from "@/components/layout/page-body";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ApprovalActions } from "@/components/approvals/approval-actions";
import { ShieldCheck } from "lucide-react";
import { isHeadRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

function fmtWhen(d: Date) {
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ApprovalsPage() {
  const session = await getSession();
  const canReview = session ? isHeadRole(session.role) : false;
  const canSee = session ? roleAtLeast(session.role, "HEAD") : false;

  const [pending, recent] = await Promise.all([
    prisma.stageChangeRequest.findMany({
      where: { status: "pending" },
      include: { oc: { include: { product: true, colour: true } } },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.stageChangeRequest.findMany({
      where: { status: { in: ["approved", "rejected", "cancelled"] } },
      include: { oc: { include: { product: true } } },
      orderBy: { requestedAt: "desc" },
      take: 20,
    }),
  ]);

  if (!canSee) {
    return (
      <div>
        <PageHeader title="Stage approvals" description="Plant head access required." />
        <PageBody>
          <EmptyState
            icon={<ShieldCheck className="size-5" />}
            title="No access"
            description="Sign in as a plant head (HEAD), manager, or admin to view stage approvals."
          />
        </PageBody>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Stage approvals"
        description="Plant and department heads approve stage changes before production moves forward."
      />
      <PageBody className="space-y-8">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Pending ({pending.length})</h2>
          <Card className="py-0">
            <CardContent className="p-0">
              {pending.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck className="size-5" />}
                  title="No pending approvals"
                  description="When a manager requests a stage advance, it appears here for head sign-off."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requested</TableHead>
                      <TableHead>OC</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((r) => (
                      <TableRow key={r.id} className="h-14">
                        <TableCell className="text-sm tabular-nums">{fmtWhen(r.requestedAt)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{r.oc.ocNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.oc.product.name} · {r.oc.colour.name} × {r.oc.quantity}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.fromStage} → <strong>{r.toStage}</strong>
                        </TableCell>
                        <TableCell className="text-sm">{r.requestedBy}</TableCell>
                        <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                          {r.note || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {canReview ? (
                            <ApprovalActions requestId={r.id} ocNumber={r.oc.ocNumber} />
                          ) : (
                            <span className="text-xs text-muted-foreground">Awaiting head</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Recent decisions</h2>
          <Card className="py-0">
            <CardContent className="p-0">
              {recent.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck className="size-5" />}
                  title="No history yet"
                  description="Approved and rejected requests show up here."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>OC</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((r) => (
                      <TableRow key={r.id} className="h-12">
                        <TableCell className="text-sm tabular-nums">
                          {fmtWhen(r.reviewedAt ?? r.requestedAt)}
                        </TableCell>
                        <TableCell className="font-medium">{r.oc.ocNumber}</TableCell>
                        <TableCell className="text-sm">
                          {r.fromStage} → {r.toStage}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.reviewedBy || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </div>
  );
}
