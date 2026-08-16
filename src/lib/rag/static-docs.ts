import type { PreparedChunk } from "./types";

/** Static workflow knowledge for the plant ops assistant (from BUILD_SPEC / README). */
export function buildStaticDocChunks(): PreparedChunk[] {
  return [
    {
      source: "docs",
      sourceId: "overview",
      title: "Kreuger ops console overview",
      content: `Kreuger is a manufacturing operations dashboard for an Indian furniture plant.
It sits alongside SAP Business One (accounting) and Zoho CRM (sales) — it does not replace them.
Core workflows: customer quotations with quantity pricing and PDF export; sales-order verification gate;
order confirmations (OCs) with stage tracking; manpower efficiency planning; alerts and escalations;
master data for products, departments, materials, and settings.
Out of scope: SAP/Zoho sync, HRMS, full MRP/GRN/quality, procurement ticketing.`,
    },
    {
      source: "docs",
      sourceId: "quotation-workflow",
      title: "Quotation workflow",
      content: `Quotations are commercial documents (numbers like PO-YYYY-####).
Create via Quotations → New: pick product, quantity, colour; review suggested price from pricing slabs; save; export PDF.
Party fields (customer/vendor name, GSTIN, ship-to, payment terms) live on the quotation.
Pricing uses product baseRate plus quantity PricingSlab discount percents.
GST percent from Settings is applied on the quotation PDF total.
Revise creates a new quotation linked via revisesQuotationNumber.`,
    },
    {
      source: "docs",
      sourceId: "sales-order-workflow",
      title: "Sales order verification workflow",
      content: `Sales orders sit between customer acceptance and OC release.
Statuses: confirmed, pending_verification, approved, sent_back, rejected, released.
Sales coordinator verifies item code, drawing, BOM, and order details before approval.
After approval, OC is released into production at Procuring raw material stage.
Priority: LOW | NORMAL | HIGH | URGENT.`,
    },
    {
      source: "docs",
      sourceId: "oc-stages",
      title: "Order confirmation stages",
      content: `Order confirmations (OCs) track production. Typical stage flow:
Procuring raw material → shop-floor departments by sequence (e.g. Injection moulding, Fabrication, Powder coating) → Finished goods.
Statuses: planning | in_progress | closed | cancelled.
Each stage has deadlineDays; breaches create plant-head alerts.
Capacity is planned at OC creation (workersRequired, stageHours, stageDays per department).`,
    },
    {
      source: "docs",
      sourceId: "manpower",
      title: "Manpower efficiency module",
      content: `Manpower plans are per OC over a date range using working days (weeklyOff + holidays).
Settings: procurementDays, rampDays, shiftHours, weeklyOff.
Department capacity: headcount, unitsPerWorkerPerDay, maxUnitsPerDay (machine ceiling, not derived).
Plan status: achievable or blocked. Lines show workersRequired, manHours, utilisation.`,
    },
    {
      source: "docs",
      sourceId: "alerts",
      title: "Alerts and escalations",
      content: `Alerts log internal notifications: stage_entry, deadline_breach, deadline_at_risk, sales_order_confirmed,
follow_up_reminder, escalation, material_shortage, urgent_order, oc_completed, and related types.
Recipients come from Settings (primary/secondary heads, plant/procurement/dispatch, sales coordinator) and department heads.
Email delivery is optional via SMTP; alerts always appear in /alerts with status sent/failed/disabled.`,
    },
    {
      source: "docs",
      sourceId: "routes",
      title: "Dashboard routes",
      content: `Routes: / dashboard; /quotations; /sales-orders; /orders (OCs); /follow-up; /manpower; /reports; /alerts; /master-data.
Roles: ADMIN, MANAGER, VIEWER. Seeded demo users: admin@kreuger.local, manager@kreuger.local, viewer@kreuger.local.`,
    },
  ];
}
