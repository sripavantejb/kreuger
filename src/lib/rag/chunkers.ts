import { prisma } from "@/lib/prisma";
import { buildStaticDocChunks } from "./static-docs";
import type { PreparedChunk } from "./types";
import { deadlineStatus } from "@/lib/format";
import { computeMaterialRequirements } from "@/lib/materials";

function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "n/a";
  return d.toISOString().slice(0, 10);
}

export async function buildLiveChunks(): Promise<PreparedChunk[]> {
  const chunks: PreparedChunk[] = [...buildStaticDocChunks()];

  const [
    settings,
    departments,
    colours,
    holidays,
    products,
    quotations,
    salesOrders,
    orders,
    alerts,
    manpowerPlans,
  ] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.department.findMany({ orderBy: { sequence: "asc" } }),
    prisma.colour.findMany({ orderBy: { name: "asc" } }),
    prisma.holiday.findMany({ orderBy: { date: "asc" } }),
    prisma.product.findMany({
      include: {
        pricingSlabs: { orderBy: { minQuantity: "asc" } },
        materials: true,
        departmentRates: { include: { department: true } },
      },
    }),
    prisma.quotation.findMany({
      include: {
        product: true,
        colour: true,
        lines: { include: { product: true, colour: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.salesOrder.findMany({
      include: { product: true, colour: true, quotation: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.orderConfirmation.findMany({
      include: {
        product: { include: { materials: true } },
        colour: true,
        plan: { include: { department: true } },
        events: { orderBy: { enteredAt: "asc" } },
      },
      orderBy: { plannedAt: "desc" },
    }),
    prisma.alert.findMany({
      include: { oc: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.manpowerPlan.findMany({
      include: {
        oc: { include: { product: true } },
        lines: { include: { department: true } },
      },
    }),
  ]);

  // --- Rollup summaries so list-style questions retrieve a full overview ---
  {
    const active = orders.filter((o) => o.status === "in_progress");
    const closed = orders.filter((o) => o.status === "closed");
    const delayed: string[] = [];
    for (const oc of orders) {
      const open = oc.events.find((e) => !e.exitedAt);
      if (!open || oc.status !== "in_progress") continue;
      const days = (Date.now() - open.enteredAt.getTime()) / 86_400_000;
      const st = deadlineStatus(days, open.deadlineDays, open.breached);
      if (st === "breach") delayed.push(`${oc.ocNumber} (${open.stageName}, ${days.toFixed(1)}d)`);
    }
    const pendingSo = salesOrders.filter((s) => s.status === "pending_verification").length;
    chunks.push({
      source: "docs",
      sourceId: "dashboard-snapshot",
      title: "Dashboard snapshot (all live counts)",
      content: `Dashboard totals: ${orders.length} OCs (${active.length} active, ${closed.length} closed), ${delayed.length} delayed/breached: ${delayed.join("; ") || "none"}. ${quotations.length} quotations, ${salesOrders.length} sales orders (${pendingSo} pending verification), ${products.length} products, ${alerts.length} alerts, ${manpowerPlans.length} manpower plans, ${departments.length} departments.`,
    });
  }

  if (alerts.length > 0) {
    const alertLines = alerts
      .slice(0, 40)
      .map(
        (a) =>
          `${fmtDate(a.createdAt)} [${a.type}] ${a.subject} → ${a.recipient} (OC ${a.oc?.ocNumber ?? "n/a"}, email ${a.emailStatus})`
      )
      .join("\n");
    chunks.push({
      source: "docs",
      sourceId: "alerts-directory",
      title: "Alerts directory (recent)",
      content: `There are ${alerts.length} alerts total. Recent:\n${alertLines}`,
    });
  }

  if (settings) {
    chunks.push({
      source: "settings",
      sourceId: "1",
      title: "Planning settings & escalation contacts",
      content: `Planning settings: procurementDays=${settings.procurementDays}, rampDays=${settings.rampDays}, shiftHours=${settings.shiftHours}, weeklyOff=${settings.weeklyOff.join(", ")}, gstPercent=${settings.gstPercent}%.
Contacts: Primary ${settings.primaryHeadName} <${settings.primaryHeadEmail}>; Secondary ${settings.secondaryHeadName} <${settings.secondaryHeadEmail}>; Plant ${settings.plantHeadName} <${settings.plantHeadEmail}>; Procurement ${settings.procurementHeadName} <${settings.procurementHeadEmail}>; Dispatch ${settings.dispatchHeadName} <${settings.dispatchHeadEmail}>; Sales coordinator ${settings.salesCoordinatorName} <${settings.salesCoordinatorEmail}>.`,
    });
  }

  if (colours.length > 0) {
    chunks.push({
      source: "docs",
      sourceId: "colours",
      title: "Colour palette",
      content: `Colours: ${colours.map((c) => `${c.name} (${c.hexCode})`).join("; ")}`,
    });
  }

  if (holidays.length > 0) {
    chunks.push({
      source: "docs",
      sourceId: "holidays",
      title: "Holidays calendar",
      content: `Holidays: ${holidays.map((h) => `${fmtDate(h.date)} ${h.name}`).join("; ")}`,
    });
  }

  for (const d of departments) {
    chunks.push({
      source: "department",
      sourceId: d.id,
      title: `Department: ${d.name}`,
      content: `Department "${d.name}" sequence=${d.sequence}, headcount=${d.headcount}, unitsPerWorkerPerDay=${d.unitsPerWorkerPerDay}, maxUnitsPerDay=${d.maxUnitsPerDay}, head=${d.headName || "n/a"} <${d.headEmail || "n/a"}>.`,
    });
  }

  for (const p of products) {
    const slabs = p.pricingSlabs
      .map(
        (s) =>
          `${s.minQuantity}${s.maxQuantity != null ? `–${s.maxQuantity}` : "+"} units → ${s.discountPercent}% discount`
      )
      .join("; ");
    const materials = p.materials
      .map((m) => `${m.materialName}: ${m.quantityPerUnit} ${m.unit}/unit (demo stock ${m.demoAvailableQty})`)
      .join("; ");
    const rates = p.departmentRates
      .map(
        (r) =>
          `${r.department.name}: ${r.unitsPerWorkerPerDay} units/worker/day, max ${r.maxUnitsPerDay}/day`
      )
      .join("; ");
    chunks.push({
      source: "product",
      sourceId: p.id,
      title: `Product ${p.code} — ${p.name}`,
      content: `Product ${p.name} (code ${p.code}). Base rate ${inr(p.baseRate)}. Default lead days ${p.defaultLeadDays}. HSN ${p.hsnCode || "n/a"}.
Description: ${p.description || "n/a"}
Pricing slabs: ${slabs || "none"}
Materials: ${materials || "none"}
Department rate overrides: ${rates || "none (use department defaults)"}`,
    });
  }

  for (const q of quotations) {
    const lines =
      q.lines.length > 0
        ? q.lines
            .map(
              (l) =>
                `${l.product.name} / ${l.colour.name} × ${l.quantity} @ ${inr(l.unitRate)} = ${inr(l.lineTotal)}${l.location ? ` (${l.location})` : ""}`
            )
            .join("; ")
        : `${q.product.name} / ${q.colour.name} × ${q.quantity} @ ${inr(q.unitRate)} = ${inr(q.lineTotal)}`;
    chunks.push({
      source: "quotation",
      sourceId: q.id,
      title: `Quotation ${q.quotationNumber}`,
      content: `Quotation ${q.quotationNumber} created ${fmtDate(q.createdAt)}. Customer/bill-to: ${q.vendorName || "n/a"} (GSTIN ${q.vendorGstin || "n/a"}). Ship-to: ${q.shipToName || "n/a"}. Contact: ${q.contactPerson || "n/a"} ${q.contactPhone || ""} ${q.contactEmail || ""}. Payment terms: ${q.paymentTerms}. Discount ${q.discountPercent}%. Delivery ${fmtDate(q.deliveryDate)}. Location: ${q.location || "n/a"}. Revises: ${q.revisesQuotationNumber || "none"}. Lines: ${lines}. Remarks: ${q.remarks || "n/a"}.`,
    });
  }

  for (const so of salesOrders) {
    chunks.push({
      source: "sales_order",
      sourceId: so.id,
      title: `Sales order ${so.soNumber}`,
      content: `Sales order ${so.soNumber}: ${so.product.name} / ${so.colour.name} × ${so.quantity}. Status ${so.status}. Priority ${so.priority}. Customer ${so.customerName || "n/a"}. Quotation ${so.quotation?.quotationNumber || "n/a"}. Verification: itemCode=${so.itemCodeVerified}, drawing=${so.drawingVerified}, bom=${so.bomVerified}, details=${so.orderDetailsVerified}. Notes: ${so.notes || "n/a"}. Send-back: ${so.sendBackReason || "n/a"}. Reject: ${so.rejectReason || "n/a"}. Created ${fmtDate(so.createdAt)}, verified ${fmtDate(so.verifiedAt)}, released ${fmtDate(so.releasedAt)}.`,
    });
  }

  for (const oc of orders) {
    const plan = oc.plan
      .map((p) => `${p.department.name}: ${p.workersRequired} workers, ${p.stageDays} days, ${p.stageHours} hours`)
      .join("; ");
    const events = oc.events
      .map(
        (e) =>
          `${e.stageName} entered ${fmtDate(e.enteredAt)}${e.exitedAt ? ` exited ${fmtDate(e.exitedAt)}` : " (open)"}${e.breached ? " BREACHED" : ""} deadlineDays=${e.deadlineDays}`
      )
      .join("; ");
    const mats = computeMaterialRequirements(oc.product.materials, oc.quantity)
      .map((m) => `${m.materialName}: need ${m.requiredQty} ${m.unit}, avail ${m.availableQty}, ${m.status}`)
      .join("; ");
    chunks.push({
      source: "order",
      sourceId: oc.id,
      title: `Order confirmation ${oc.ocNumber}`,
      content: `OC ${oc.ocNumber}: ${oc.product.name} / ${oc.colour.name} × ${oc.quantity}. Status ${oc.status}. Current stage: ${oc.currentStage}. Priority ${oc.priority}. Target days ${oc.targetDays}. Planned ${fmtDate(oc.plannedAt)}. Capacity plan: ${plan || "n/a"}. Stage events: ${events || "n/a"}. Materials: ${mats || "n/a"}.`,
    });
  }

  for (const a of alerts) {
    chunks.push({
      source: "alert",
      sourceId: a.id,
      title: `Alert: ${a.subject}`,
      content: `Alert type=${a.type} created ${fmtDate(a.createdAt)}. To ${a.recipient} <${a.recipientEmail}>. Subject: ${a.subject}. Body: ${a.body}. Email status: ${a.emailStatus}. OC: ${a.oc?.ocNumber || "n/a"}. Sales order id: ${a.salesOrderId || "n/a"}.`,
    });
  }

  for (const mp of manpowerPlans) {
    const lines = mp.lines
      .map(
        (l) =>
          `${l.department.name}: ${l.workersRequired} workers, ${l.workingDays} days, utilisation ${(l.utilisation * 100).toFixed(0)}%`
      )
      .join("; ");
    chunks.push({
      source: "manpower",
      sourceId: mp.id,
      title: `Manpower plan for ${mp.oc.ocNumber}`,
      content: `Manpower plan for OC ${mp.oc.ocNumber} (${mp.oc.product.name}): ${fmtDate(mp.startDate)} → ${fmtDate(mp.endDate)}, workingDays=${mp.workingDays}, requiredRate=${mp.requiredRate ?? "n/a"}, status=${mp.status}. Lines: ${lines || "n/a"}.`,
    });
  }

  return chunks;
}
