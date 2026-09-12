# Kreuger Ops Console

Manufacturing operations dashboard for an Indian furniture plant. It sits **alongside** Zoho CRM (sales) and SAP Business One (accounting) — it does not replace them.

Kreuger covers the plant workflows that today run on phone, email, and memory: commercial quotations, sales-order verification, order confirmation (OC) release, capacity & materials readiness, stage tracking with escalations, follow-up / scheduling, plant-head tasks & stage approvals, manpower planning, reports, and a RAG ops assistant.

---

## Quick start

```bash
npm install
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seeded users

Password for all: `ChangeMe123!`

| Email | Role | What they can do |
|-------|------|------------------|
| `admin@kreuger.local` | **ADMIN** | Everything + Master Data + force-advance stages |
| `manager@kreuger.local` | **MANAGER** | Quotations, SOs, OCs, follow-up, request stage changes, assign tasks |
| `sripavantejb@gmail.com` | **HEAD** | Approve stage changes, own tasks, follow-up / remind (matches Primary head) |
| `viewer@kreuger.local` | **VIEWER** | Read-only |

---

## End-to-end production flow

```text
Quotation (commercial)
    │  customer accepts / confirm SO
    ▼
Sales order (verification gate)
    │  item code · drawing · BOM · details
    │  Approve & release
    ▼
Order confirmation (OC) — Procuring raw material
    │
    ├─ Capacity plan snapshot + material readiness
    ├─ Stage tracking with deadlines
    ├─ Follow-up: remind / schedule / escalate / assign task
    ├─ Stage change → plant-head approval (or Admin force)
    │
    ▼
Injection moulding → Fabrication → Powder coating → Finished goods
    │
    ▼
Alerts · Reports · Manpower what-if · RAG assistant
```

### Demo walkthrough

1. **Quotations** → New → pick product(s), qty, colour → review suggested price (slab discount) → Save → Export PDF / Print  
2. **Confirm sales order** from the quotation (or Sales orders → New)  
3. **Sales coordinator verification** — tick item code / drawing / BOM / order details → Approve & release  
4. **OC** created at **Procuring raw material** with priority, capacity plan, and demo material readiness  
5. On the OC, **Request → next stage** (Manager/Head). Plant head opens **Approvals** → Approve (Admin can Force advance)  
6. Continue through shop-floor stages; breaches create plant-head alerts  
7. Use **Follow-up** to Remind now, Schedule, Escalate, Mark done, or Assign task  
8. **Tasks** for assignee inbox; **Reports** for “why was this OC delayed?”  
9. Ask the floating **Ops assistant** anything about live plant data  

---

## Roles & permissions

| Capability | VIEWER | HEAD | MANAGER | ADMIN |
|------------|:------:|:----:|:-------:|:-----:|
| View dashboard / lists / reports | ✓ | ✓ | ✓ | ✓ |
| Follow-up remind / schedule / escalate | | ✓ | ✓ | ✓ |
| Assign & complete plant tasks | | ✓ | ✓ | ✓ |
| Request stage change | | ✓ | ✓ | ✓ |
| Approve / reject stage change | | ✓ | | ✓ |
| Force-advance stage (bypass) | | | | ✓ |
| Create quotations / SOs / OCs | | | ✓ | ✓ |
| Master data & users | | | | ✓ |

Heads are also configured as **contacts** in Master Data → Recipients (Primary, Secondary, Procurement, Dispatch) and on each **Department** (`headName` / `headEmail`). Those emails drive notification routing.

---

## Modules (detailed)

### Dashboard `/`
Live plant pulse: active / at-risk / delayed / due-soon / completed OCs, stage bottlenecks, demo material shortages, pending SO verification count, quotations this month.

### Quotations `/quotations`
- Multi-line quotations with product, colour, qty, location  
- Quantity **pricing slabs** → suggested unit rate (editable)  
- Customer / ship-to / GSTIN / payment terms / delivery  
- Revise & duplicate  
- PDF export (`@react-pdf/renderer`) + print HTML fallback  
- GST % from Settings applied on PDF totals  

### Sales orders `/sales-orders`
Gate between commercial acceptance and production:

| Status | Meaning |
|--------|---------|
| `confirmed` | Created from quotation / manual |
| `pending_verification` | Awaiting coordinator checks |
| `approved` / `sent_back` / `rejected` | Verification outcomes |
| `released` | OC created and linked |

Checklist: item code, drawing, BOM, order details. Priority: LOW · NORMAL · HIGH · URGENT.

### Orders (OCs) `/orders`
- Production tracking id (`OC#####`)  
- Stages: **Procuring raw material** → departments (by sequence) → **Finished goods**  
- Capacity plan snapshot at release (`OcDepartmentPlan`)  
- Open stage event with deadline days, elapsed, breach flag  
- Materials: required vs **demo available qty** (not live SAP)  
- **Request stage change** → pending until head approval  
- Admin **Force advance**  

### Follow-up `/follow-up`
Ops queue for in-progress OCs:

- Tabs: **Active** · **Scheduled** · **Done this stage**  
- Stats: active, delayed, due in 24h, scheduled count  
- **Remind now** — email stage owner immediately  
- **Schedule** — datetime + presets (1h / 4h / tomorrow 9:00 / 2 days) + note; auto-sends when due (on page load); cancelled if stage advances first  
- **Escalate** — primary / plant head  
- **Mark done** — hide from active queue for current stage; **Reopen** or returns on stage advance  
- **Assign task** — create a plant-head task linked to the OC  
- Recent reminder / escalation activity log  

### Tasks `/tasks`
- Assign work to Primary / Procurement / Dispatch / department heads  
- Priority, due date, optional OC link  
- Status: open → in progress → done / cancelled  
- Filters: All · Assigned to me  
- Assignee notified via alert / email  

### Approvals `/approvals`
- Pending **stage-change requests** (from → to, requester note)  
- Plant head / Admin: **Approve** (advances OC) or **Reject** (with reason)  
- Recent decision history  

### Manpower `/manpower`
Date-range efficiency vs capacity (working days, weekly off, holidays). Achievable / blocked utilisation by department. Distinct from the immutable plan stored at OC creation.

### Reports `/reports`
Aggregates over stage events: on-time vs breached, average stage duration, bottleneck frequency — answers delay root-cause questions.

### Alerts `/alerts`
Internal notification log for:

- Stage entry, deadline at-risk / breach  
- Sales order confirmed / coordinator approval  
- Follow-up reminder, escalation, scheduled reminder  
- Material shortage, urgent order, OC completed  
- Stage-change and task assignment notices  

Each alert has email status: `pending` · `sent` · `failed` · `disabled`, plus `EmailLog` audit rows.

### Master data `/master-data` (Admin)
Products (rate, HSN, specs, colour images), pricing slabs, materials + demo stock, departments (headcount, rates, ceilings, heads), colours, holidays, weekly off, planning constants (procurement / ramp / shift hours, GST %), escalation recipients, users & roles.

### RAG Ops assistant (global)
Floating chat on every authenticated page.

- **Retrieval:** OpenAI embeddings over `KnowledgeChunk` (products, quotations, SOs, OCs, alerts, manpower, settings, docs)  
- **Live tools:** dashboard snapshot, list products / quotations / SOs / OCs / alerts / manpower / master data / reports, lookup by number  
- Config:

```bash
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

```bash
npm run index-knowledge   # also runs after seed when LLM_API_KEY is set
```

---

## Terminology

| Term | Meaning |
|------|---------|
| **Quotation** | Customer commercial document (`Q-YYYY-####` / PO-style PDF fields) |
| **Sales order** | Verification gate before production (`SO#####`) |
| **OC** | Order confirmation — production tracking (`OC#####`) |
| **Stage** | Procuring → department sequence → Finished goods |
| **HEAD** | Plant / department head role — approvals & tasks |
| **Demo stock** | Master-data available qty — **not** live SAP inventory |

---

## Tech stack

| Layer | Choice |
|-------|--------|
| App | Next.js 16 (App Router) · React 19 · TypeScript |
| UI | Tailwind CSS 4 · shadcn/ui (Base UI) |
| Data | Prisma 6 · MongoDB |
| Auth | JWT cookie (`jose`) · bcrypt passwords |
| PDF | `@react-pdf/renderer` |
| Email | nodemailer (optional SMTP / Gmail) |
| AI | Vercel AI SDK · OpenAI-compatible chat + embeddings |

Mutations are mostly **server actions**; chat uses `POST /api/chat`.

---

## Environment

Copy `.env.example` → `.env`. Important keys:

```bash
DATABASE_URL="mongodb://..."
AUTH_SECRET="change-me"
APP_BASE_URL="http://localhost:3000"

# Optional — real email
ENABLE_EMAIL=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.name@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="Kreuger Ops <your.name@gmail.com>"

# Optional — RAG assistant
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

Seeded alert recipients (edit in Master Data → Recipients):

- Primary: `sripavantejb@gmail.com`  
- Secondary: `harshapolinax@gmail.com`  

Emails fire only on business events (SO confirm, stage entry/breach, reminder, escalation, task assign, stage-request, etc.) with idempotent `dedupeKey`s — not on page refresh. Alerts are always written to `/alerts` even when SMTP is off.

---

## Scripts

```bash
npm run dev              # local server
npm run build            # prisma generate + next build
npm run seed             # reset demo data (+ reindex if LLM key set)
npm run index-knowledge  # rebuild RAG chunks
npm run lint
```

---

## Data model (high level)

```text
Settings / Holiday / User
Product ── PricingSlab, ProductMaterial, ProductDepartmentRate, Colour images
Quotation ── QuotationLine ──► SalesOrder ──► OrderConfirmation
OrderConfirmation
  ├── OcDepartmentPlan, OcStageEvent
  ├── ManpowerPlan / ManpowerPlanLine
  ├── Alert / EmailLog
  ├── FollowUpReminder
  ├── PlantTask
  └── StageChangeRequest
KnowledgeChunk (RAG embeddings)
```

---

## Out of scope

SAP / Zoho sync, HRMS, full MRP / GRN / quality, procurement ticketing, ML pricing, production optimizer, multi-tenant SaaS.
