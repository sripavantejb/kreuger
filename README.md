# Kreuger — Manufacturing operations dashboard

Internal plant-manager tool alongside Zoho CRM and SAP Business One. Stage-1 MVP covers customer quotations, sales-order verification, OC release, manpower/materials planning, stage tracking, follow-up, and alerts.

## Quick start

```bash
npm install
npm run seed
npm run dev
```

Seeded users (password `ChangeMe123!`): `admin@kreuger.local`, `manager@kreuger.local`, `viewer@kreuger.local`.

## Demo workflow

1. **Quotations** → New → Mastro × 100 × colour → review **Suggested price** (editable) → Save → Export PDF  
2. **Confirm sales order** on the quotation (or Sales orders → New)  
3. **Sales coordinator verification** — check item code / drawing / BOM / details → Approve & release  
4. OC created at **Procuring raw material** with priority, capacity plan, and material readiness  
5. Advance stages → Injection moulding → Fabrication → Powder coating → Finished goods  
6. Breaches create plant-head alerts; **Follow-up** supports remind / escalate  
7. OC delay history + **Reports** answer “why was this OC delayed?”

## Modules

| Route | Purpose |
|-------|---------|
| `/` | Dashboard — active / at-risk / delayed / due soon / completed + bottlenecks |
| `/quotations` | Customer quotations + PDF |
| `/sales-orders` | Confirmation → coordinator verification → OC release |
| `/orders` | Order confirmations, capacity, stages |
| `/follow-up` | Stage-wise follow-up queue |
| `/manpower` | Date-range manpower efficiency |
| `/reports` | On-time, stage duration, bottlenecks |
| `/alerts` | Internal notifications (+ optional SMTP) |
| `/master-data` | Products, departments, materials (demo stock), recipients, settings |

## Terminology

- **Quotation** — customer commercial document (`/quotations`, model `Quotation`)  
- **Sales order** — verification gate before production (`/sales-orders`)  
- **OC** — production tracking id (`OrderConfirmation`)  
- Demo material **available qty** is master-data only — **not** live SAP inventory  

## Email

Alerts are always written to the database. Real SMTP only when `ENABLE_EMAIL=true` and SMTP env vars are set.

## Out of scope

SAP/Zoho sync, HRMS, full MRP/GRN/quality, procurement ticketing, ML pricing, production optimizer.
