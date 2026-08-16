import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { deadlineStatus } from "@/lib/format";
import { computeMaterialRequirements } from "@/lib/materials";
import {
  onTimeSummary,
  stageDurationAggregates,
  bottleneckFrequency,
} from "@/lib/reports";

function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "n/a";
  return d.toISOString().slice(0, 10);
}

/** Live Prisma tools — full dashboard read access for the ops assistant. */
export const dashboardTools = {
  getDashboardSnapshot: tool({
    description:
      "Full dashboard snapshot: OC counts (active/closed/delayed/at-risk), pending sales orders, quotations this month, stage bottlenecks, material shortages.",
    inputSchema: z.object({}),
    execute: async () => {
      const [ocs, quotationsThisMonth, products, pendingSos, alertCount] = await Promise.all([
        prisma.orderConfirmation.findMany({
          include: {
            product: { include: { materials: true } },
            colour: true,
            events: { orderBy: { enteredAt: "desc" } },
          },
          orderBy: { plannedAt: "desc" },
        }),
        (async () => {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          return prisma.quotation.count({ where: { createdAt: { gte: start } } });
        })(),
        prisma.product.findMany({ include: { materials: true } }),
        prisma.salesOrder.count({ where: { status: "pending_verification" } }),
        prisma.alert.count(),
      ]);

      const active = ocs.filter((o) => o.status === "in_progress");
      const closed = ocs.filter((o) => o.status === "closed");
      const rows = ocs.map((oc) => {
        const openEvent = oc.events.find((e) => !e.exitedAt);
        let daysInStage = 0;
        let status: "ok" | "warn" | "breach" | null = null;
        if (openEvent) {
          daysInStage = (Date.now() - openEvent.enteredAt.getTime()) / 86_400_000;
          status = deadlineStatus(daysInStage, openEvent.deadlineDays, openEvent.breached);
        }
        return {
          ocNumber: oc.ocNumber,
          product: oc.product.name,
          stage: oc.currentStage,
          status: oc.status,
          deadlineStatus: status,
          daysInStage: Number(daysInStage.toFixed(1)),
        };
      });

      const delayed = rows.filter((r) => r.deadlineStatus === "breach" && r.status === "in_progress");
      const atRisk = rows.filter((r) => r.deadlineStatus === "warn" && r.status === "in_progress");

      const stageCounts = new Map<string, number>();
      for (const oc of active) {
        stageCounts.set(oc.currentStage, (stageCounts.get(oc.currentStage) ?? 0) + 1);
      }
      const bottlenecks = [...stageCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([stage, count]) => ({ stage, count }));

      const shortageMap = new Map<string, { unit: string; shortage: number }>();
      for (const oc of active) {
        for (const line of computeMaterialRequirements(oc.product.materials, oc.quantity)) {
          if (line.status !== "SHORTAGE") continue;
          const prev = shortageMap.get(line.materialName);
          shortageMap.set(line.materialName, {
            unit: line.unit,
            shortage: (prev?.shortage ?? 0) + line.shortage,
          });
        }
      }
      const shortages = [...shortageMap.entries()].map(([name, v]) => ({
        material: name,
        shortage: v.shortage,
        unit: v.unit,
      }));

      return {
        totals: {
          ocs: ocs.length,
          active: active.length,
          closed: closed.length,
          delayed: delayed.length,
          atRisk: atRisk.length,
          pendingSalesOrders: pendingSos,
          quotationsThisMonth,
          products: products.length,
          alerts: alertCount,
        },
        delayed,
        atRisk,
        bottlenecks,
        shortages,
      };
    },
  }),

  listProducts: tool({
    description: "List all products with pricing slabs, materials, and rates.",
    inputSchema: z.object({}),
    execute: async () => {
      const products = await prisma.product.findMany({
        include: {
          pricingSlabs: { orderBy: { minQuantity: "asc" } },
          materials: true,
          departmentRates: { include: { department: true } },
        },
        orderBy: { name: "asc" },
      });
      return products.map((p) => ({
        code: p.code,
        name: p.name,
        baseRate: inr(p.baseRate),
        defaultLeadDays: p.defaultLeadDays,
        hsnCode: p.hsnCode,
        description: p.description,
        slabs: p.pricingSlabs.map(
          (s) =>
            `${s.minQuantity}${s.maxQuantity != null ? `–${s.maxQuantity}` : "+"} → ${s.discountPercent}%`
        ),
        materials: p.materials.map(
          (m) => `${m.materialName}: ${m.quantityPerUnit} ${m.unit}/unit (demo stock ${m.demoAvailableQty})`
        ),
      }));
    },
  }),

  listQuotations: tool({
    description: "List all quotations (customer commercial documents) with totals and party fields.",
    inputSchema: z.object({
      search: z.string().optional().describe("Optional filter on quotation number or customer name"),
    }),
    execute: async ({ search }) => {
      const quotations = await prisma.quotation.findMany({
        include: {
          product: true,
          colour: true,
          lines: { include: { product: true, colour: true }, orderBy: { sortOrder: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      });
      const q = search?.trim().toLowerCase();
      const filtered = q
        ? quotations.filter(
            (row) =>
              row.quotationNumber.toLowerCase().includes(q) ||
              row.vendorName.toLowerCase().includes(q) ||
              row.product.name.toLowerCase().includes(q)
          )
        : quotations;
      return filtered.map((row) => ({
        number: row.quotationNumber,
        createdAt: fmtDate(row.createdAt),
        customer: row.vendorName,
        product: row.product.name,
        colour: row.colour.name,
        quantity: row.quantity,
        unitRate: inr(row.unitRate),
        lineTotal: inr(row.lineTotal),
        paymentTerms: row.paymentTerms,
        deliveryDate: fmtDate(row.deliveryDate),
        lines: row.lines.map(
          (l) => `${l.product.name}/${l.colour.name}×${l.quantity}=${inr(l.lineTotal)}`
        ),
      }));
    },
  }),

  listSalesOrders: tool({
    description: "List all sales orders with verification status and priority.",
    inputSchema: z.object({
      status: z
        .string()
        .optional()
        .describe(
          "Optional status filter: confirmed | pending_verification | approved | sent_back | rejected | released"
        ),
    }),
    execute: async ({ status }) => {
      const rows = await prisma.salesOrder.findMany({
        where: status ? { status } : undefined,
        include: { product: true, colour: true, quotation: true },
        orderBy: { createdAt: "desc" },
      });
      return rows.map((so) => ({
        number: so.soNumber,
        status: so.status,
        priority: so.priority,
        product: so.product.name,
        colour: so.colour.name,
        quantity: so.quantity,
        customer: so.customerName,
        quotation: so.quotation?.quotationNumber ?? null,
        verified: {
          itemCode: so.itemCodeVerified,
          drawing: so.drawingVerified,
          bom: so.bomVerified,
          details: so.orderDetailsVerified,
        },
        createdAt: fmtDate(so.createdAt),
        releasedAt: fmtDate(so.releasedAt),
      }));
    },
  }),

  listOrders: tool({
    description:
      "List all order confirmations (OCs) with stage, deadline status, and breaches. Use for production tracking questions.",
    inputSchema: z.object({
      status: z.string().optional().describe("planning | in_progress | closed | cancelled"),
      breachedOnly: z.boolean().optional().describe("If true, only OCs with an open breached stage"),
    }),
    execute: async ({ status, breachedOnly }) => {
      const rows = await prisma.orderConfirmation.findMany({
        where: status ? { status } : undefined,
        include: {
          product: true,
          colour: true,
          events: { orderBy: { enteredAt: "desc" } },
          plan: { include: { department: true } },
        },
        orderBy: { plannedAt: "desc" },
      });

      const mapped = rows.map((oc) => {
        const openEvent = oc.events.find((e) => !e.exitedAt);
        let daysInStage = 0;
        let dl: "ok" | "warn" | "breach" | null = null;
        if (openEvent) {
          daysInStage = (Date.now() - openEvent.enteredAt.getTime()) / 86_400_000;
          dl = deadlineStatus(daysInStage, openEvent.deadlineDays, openEvent.breached);
        }
        return {
          ocNumber: oc.ocNumber,
          product: oc.product.name,
          colour: oc.colour.name,
          quantity: oc.quantity,
          status: oc.status,
          currentStage: oc.currentStage,
          priority: oc.priority,
          targetDays: oc.targetDays,
          plannedAt: fmtDate(oc.plannedAt),
          openStage: openEvent?.stageName ?? null,
          deadlineStatus: dl,
          daysInStage: Number(daysInStage.toFixed(1)),
          breachedOpen: Boolean(openEvent?.breached),
          events: oc.events.map((e) => ({
            stage: e.stageName,
            enteredAt: fmtDate(e.enteredAt),
            exitedAt: fmtDate(e.exitedAt),
            breached: e.breached,
            deadlineDays: e.deadlineDays,
          })),
        };
      });

      return breachedOnly ? mapped.filter((r) => r.breachedOpen || r.deadlineStatus === "breach") : mapped;
    },
  }),

  listAlerts: tool({
    description:
      "List alert/notification log entries (newest first). Alerts are a history log — they are not open/closed tickets. When the user asks for alerts or open alerts, return these rows with subject, type, recipient, and OC.",
    inputSchema: z.object({
      type: z.string().optional().describe("Optional alert type filter"),
      limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)"),
    }),
    execute: async ({ type, limit }) => {
      const rows = await prisma.alert.findMany({
        where: type ? { type } : undefined,
        include: { oc: true },
        orderBy: { createdAt: "desc" },
        take: limit ?? 50,
      });
      return {
        note: "This is the full alerts notification log from /alerts. There is no separate open/closed state — list these entries when users ask about alerts.",
        count: rows.length,
        alerts: rows.map((a) => ({
          type: a.type,
          subject: a.subject,
          body: a.body,
          recipient: a.recipient,
          recipientEmail: a.recipientEmail,
          emailStatus: a.emailStatus,
          ocNumber: a.oc?.ocNumber ?? null,
          createdAt: fmtDate(a.createdAt),
        })),
      };
    },
  }),

  listManpowerPlans: tool({
    description: "List all manpower efficiency plans with utilisation by department.",
    inputSchema: z.object({}),
    execute: async () => {
      const plans = await prisma.manpowerPlan.findMany({
        include: {
          oc: { include: { product: true } },
          lines: { include: { department: true } },
        },
        orderBy: { computedAt: "desc" },
      });
      return plans.map((p) => ({
        ocNumber: p.oc.ocNumber,
        product: p.oc.product.name,
        startDate: fmtDate(p.startDate),
        endDate: fmtDate(p.endDate),
        workingDays: p.workingDays,
        requiredRate: p.requiredRate,
        status: p.status,
        lines: p.lines.map((l) => ({
          department: l.department.name,
          workersRequired: l.workersRequired,
          utilisationPct: Math.round(l.utilisation * 100),
          manHours: l.manHours,
        })),
      }));
    },
  }),

  listMasterData: tool({
    description:
      "Master data: departments, colours, holidays, settings/contacts, and GST/planning constants.",
    inputSchema: z.object({}),
    execute: async () => {
      const [settings, departments, colours, holidays] = await Promise.all([
        prisma.settings.findUnique({ where: { id: 1 } }),
        prisma.department.findMany({ orderBy: { sequence: "asc" } }),
        prisma.colour.findMany({ orderBy: { name: "asc" } }),
        prisma.holiday.findMany({ orderBy: { date: "asc" } }),
      ]);
      return {
        settings: settings
          ? {
              procurementDays: settings.procurementDays,
              rampDays: settings.rampDays,
              shiftHours: settings.shiftHours,
              weeklyOff: settings.weeklyOff,
              gstPercent: settings.gstPercent,
              contacts: {
                primary: `${settings.primaryHeadName} <${settings.primaryHeadEmail}>`,
                secondary: `${settings.secondaryHeadName} <${settings.secondaryHeadEmail}>`,
                plant: `${settings.plantHeadName} <${settings.plantHeadEmail}>`,
                procurement: `${settings.procurementHeadName} <${settings.procurementHeadEmail}>`,
                dispatch: `${settings.dispatchHeadName} <${settings.dispatchHeadEmail}>`,
                salesCoordinator: `${settings.salesCoordinatorName} <${settings.salesCoordinatorEmail}>`,
              },
            }
          : null,
        departments: departments.map((d) => ({
          name: d.name,
          sequence: d.sequence,
          headcount: d.headcount,
          unitsPerWorkerPerDay: d.unitsPerWorkerPerDay,
          maxUnitsPerDay: d.maxUnitsPerDay,
          head: d.headName,
          email: d.headEmail,
        })),
        colours: colours.map((c) => ({ name: c.name, hex: c.hexCode })),
        holidays: holidays.map((h) => ({ date: fmtDate(h.date), name: h.name })),
      };
    },
  }),

  getReportsSummary: tool({
    description: "Reports aggregates: on-time vs breached stages, avg stage duration, bottlenecks.",
    inputSchema: z.object({}),
    execute: async () => {
      const events = await prisma.ocStageEvent.findMany();
      return {
        onTime: onTimeSummary(events),
        stageDurations: stageDurationAggregates(events),
        bottlenecks: bottleneckFrequency(events),
      };
    },
  }),

  lookupRecord: tool({
    description:
      "Look up a specific quotation (PO-…), sales order (SO-…), or OC (OC…) by its number and return full detail.",
    inputSchema: z.object({
      number: z.string().describe("Document number e.g. PO-2026-0001, SO-…, OC10001"),
    }),
    execute: async ({ number }) => {
      const n = number.trim();
      const [quotation, salesOrder, oc] = await Promise.all([
        prisma.quotation.findFirst({
          where: { quotationNumber: { equals: n, mode: "insensitive" } },
          include: {
            product: true,
            colour: true,
            lines: { include: { product: true, colour: true } },
          },
        }),
        prisma.salesOrder.findFirst({
          where: { soNumber: { equals: n, mode: "insensitive" } },
          include: { product: true, colour: true, quotation: true },
        }),
        prisma.orderConfirmation.findFirst({
          where: { ocNumber: { equals: n, mode: "insensitive" } },
          include: {
            product: true,
            colour: true,
            events: true,
            plan: { include: { department: true } },
            manpowerPlan: { include: { lines: { include: { department: true } } } },
            alerts: { orderBy: { createdAt: "desc" }, take: 20 },
          },
        }),
      ]);

      if (quotation) {
        return {
          kind: "quotation",
          number: quotation.quotationNumber,
          customer: quotation.vendorName,
          product: quotation.product.name,
          quantity: quotation.quantity,
          unitRate: inr(quotation.unitRate),
          lineTotal: inr(quotation.lineTotal),
          details: quotation,
        };
      }
      if (salesOrder) {
        return {
          kind: "sales_order",
          number: salesOrder.soNumber,
          status: salesOrder.status,
          product: salesOrder.product.name,
          quantity: salesOrder.quantity,
          details: salesOrder,
        };
      }
      if (oc) {
        return {
          kind: "order",
          number: oc.ocNumber,
          status: oc.status,
          stage: oc.currentStage,
          product: oc.product.name,
          quantity: oc.quantity,
          details: oc,
        };
      }
      return { kind: "not_found", number: n };
    },
  }),
};
