# Build spec — Manufacturing operations dashboard (Stage 1 MVP)
## Context
An interior-design furniture manufacturer in India runs SAP Business One
(accounting) and Zoho CRM (sales). Neither is being replaced. This is a
standalone dashboard that sits alongside them and covers four workflows the
plant currently handles by phone, email and memory.
This build is a **demo for the Managing Director**. It runs on seeded sample
data for a single product. If he approves the approach, real plant data
replaces the seed values — so the model must be driven by editable master
data, never by hardcoded outputs.
One user. Manager level. Desktop. No multi-tenancy, no role hierarchy.
---
## Scope
### Build these
1. Quotation generator with quantity-based pricing and PDF export
2. Manpower efficiency calculator with capacity-aware timeline planning
3. Stage-wise order tracking with deadlines and escalation
4. Supporting screens: dashboard, alerts log, master data editor
### Do NOT build these
Explicitly out of scope. Do not add them even if they seem like obvious
completions:
- Zoho CRM integration or any CRM sync
- SAP Business One integration
- HRMS or employee management
- Purchase team ticketing
- BOM management or item master
- Full MRP, procurement, GRN, or quality modules
- Multi-user auth, roles, permissions
- Real email sending (see Email section)
---
## Tech stack
- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + SQLite (single file, committed seed script)
- PDF via `@react-pdf/renderer`, plus a print-optimised HTML route as fallback
Keep it to one repo, one command to run (`npm run dev`), one command to reset
(`npm run seed`). No Docker, no external services.
---
## Data model
```
Product
  id, name, code
  materialsPerUnit  -> ProductMaterial[]
  departmentRates   -> ProductDepartmentRate[]
  baseRate          (decimal, currency INR)
  imageByColour     (map of colour -> image path)
Colour
  id, name, hexCode
Department
  id, name, sequence
  headcount           (int)
  unitsPerWorkerPerDay (decimal)
  maxUnitsPerDay      (int)   <- independent ceiling, NOT derived
ProductDepartmentRate
  productId, departmentId, unitsPerWorkerPerDay, maxUnitsPerDay
  (per-product override of the department defaults)
ProductMaterial
  productId, materialName, unit, quantityPerUnit
PricingSlab
  productId, minQuantity, maxQuantity, discountPercent
Quotation
  id, quotationNumber, productId, quantity, colourId
  unitRate, lineTotal, createdAt
OrderConfirmation
  id, ocNumber, productId, quantity, colourId
  targetDays, plannedAt
  currentStage, status (planning | in_progress | closed)
  plan -> OcDepartmentPlan[]
OcDepartmentPlan
  ocId, departmentId, workersRequired, stageHours, stageDays
OcStageEvent
  ocId, stageName, enteredAt, exitedAt, durationHours
  deadlineDays, breached (bool)
Alert
  id, ocId, type (stage_entry | deadline_breach)
  recipient, subject, body, createdAt
```
`maxUnitsPerDay` must be a stored, editable field — not computed from
`headcount * unitsPerWorkerPerDay`. Some departments are machine-constrained
and cap below full headcount output. Seed them equal for now; the field exists
so real data can differ.
---
## Scenario 1 — Quotation automation
### Flow
Quotations list → New quotation → select product → enter quantity → select
colour → live preview → Export PDF
### Behaviour
- Product is a dropdown. Only Mastro exists at seed time.
- Colour selection swaps the preview image via `Product.imageByColour`.
- Unit rate is `baseRate` reduced by the matching `PricingSlab` discount for
  the entered quantity. Recompute live on every quantity change.
- Preview shows: product image, description, quantity, unit rate, line total.
- PDF matches the on-screen preview layout.
### Pricing slabs (seed — replace when the real Mastro quotation arrives)
| Quantity | Discount |
|---|---|
| 1–24 | 0% |
| 25–99 | 5% |
| 100–249 | 10% |
| 250–499 | 15% |
| 500+ | 20% |
Slabs are editable in Master Data.
---
## Scenario 3 — Manpower efficiency calculator
**This is the core of the demo. Get the arithmetic exactly right.**
### Flow
Orders list → New OC → enter OC number, product, quantity, colour, target
timeline in days → result panel → confirm and release
### Constants
```
PROCUREMENT_DAYS = 3      // stage 1 deadline, editable in master data
RAMP_DAYS        = 1.5    // pipeline fill and drain
SHIFT_HOURS      = 8      // single shift; make this configurable
```
Stages run **overlapped** (pipelined), not one after another. The three
production departments work concurrently once material starts flowing.
### Algorithm
```
function plan(quantity Q, targetDays T):
  productionWindow = T - PROCUREMENT_DAYS - RAMP_DAYS
  if productionWindow <= 0:
      return BLOCKED(reason: "timeline shorter than procurement lead time")
  requiredRate = Q / productionWindow          // units per day
  bottlenecks = []
  for each department d:
      ceiling = min(d.maxUnitsPerDay, d.headcount * d.unitsPerWorkerPerDay)
      if requiredRate > ceiling:
          bottlenecks.push(d)
  if bottlenecks is not empty:
      slowestCeiling = min(ceiling) across all departments
      earliestDays   = ceil(Q / slowestCeiling + PROCUREMENT_DAYS + RAMP_DAYS)
      return BLOCKED(bottlenecks, slowestCeiling, earliestDays)
  plan = []
  for each department d:
      workers   = ceil(requiredRate / d.unitsPerWorkerPerDay)
      stageDays = Q / (workers * d.unitsPerWorkerPerDay)
      plan.push({ d, workers, stageDays, stageHours: stageDays * SHIFT_HOURS })
  materials = product.materialsPerUnit.map(m => m.quantityPerUnit * Q)
  return PLAN(plan, materials, totalDays: T)
```
### Worked examples — use these as tests
Seed data: Mastro, 100 units.
Injection moulding 15 workers @ 2.0/worker/day, ceiling 30/day.
Fabrication 20 workers @ 0.75/worker/day, ceiling 15/day.
Powder coating 30 workers @ 0.5/worker/day, ceiling 15/day.
**T = 14 days** → productionWindow 9.5, requiredRate 10.53/day → achievable
| Department | Workers | Stage days | Stage hours |
|---|---|---|---|
| Injection moulding | 6 | 8.33 | 66.7 |
| Fabrication | 15 | 8.89 | 71.1 |
| Powder coating | 22 | 9.09 | 72.7 |
Materials: Plastics 100 kg, Chrome 150 kg.
**T = 15 days** → productionWindow 10.5, requiredRate 9.52/day → achievable
Injection moulding 5 workers, Fabrication 13, Powder coating 20.
**T = 8 days** → productionWindow 3.5, requiredRate 28.57/day → **BLOCKED**
Fabrication and Powder coating both cap at 15/day.
Earliest achievable: **12 days**.
**T = 11 days** → requiredRate 15.38/day → **BLOCKED** (fabrication caps at 15).
Confirms 12 is the true floor.
### Result panel — the blocked state matters
When blocked, the plan is **replaced in place** by the warning. Not a toast,
not a modal. It must read:
> Not achievable in 8 days.
> Fabrication and Powder coating both cap at 15 units per day.
> Earliest completion: 12 days.
The target timeline control stays live so the user can adjust and watch the
plan reappear. This loop — impossible date, refusal with a named bottleneck,
adjust, plan — is the single most important interaction in the build.
---
## Scenario 4 — Stage-wise follow up
### Stages
| # | Stage | Deadline |
|---|---|---|
| 1 | Procuring raw material | 3 days (fixed, from master data) |
| 2 | Injection moulding | from the plan's stageDays |
| 3 | Fabrication | from the plan's stageDays |
| 4 | Powder coating | from the plan's stageDays |
| 5 | Finished goods | terminal |
### Behaviour
- OC detail shows a horizontal stage tracker with the current stage
  highlighted.
- Completed stages display entry timestamp and actual duration.
- Current stage displays elapsed time against its deadline, with a countdown.
- A single "Advance to next stage" action. On advance:
  - write `exitedAt` and `durationHours` on the current `OcStageEvent`
  - create the next `OcStageEvent` with `enteredAt`
  - queue an Alert of type `stage_entry` addressed to the next department head
  - if the completed stage exceeded its deadline, mark `breached` and queue an
    Alert of type `deadline_breach` addressed to the plant head
- A background check (or on-load check) marks the current stage breached if
  elapsed time already exceeds the deadline, without waiting for advance.
### Delay history
On any closed or in-progress OC, show a simple breakdown: each stage, planned
duration, actual duration, variance. This answers "why was this order late" —
which is the question the MD asked in his own meeting.
---
## Email
**Do not send real email in the demo.** Write every notification to the `Alert`
table and render it in the Alerts and escalations screen, formatted as it would
appear in an inbox (recipient, subject, body, timestamp).
Put real SMTP behind an environment flag `ENABLE_EMAIL=false` by default. If
enabled, use nodemailer. Never enable it in seed or test.
---
## Screens
| Screen | Contents |
|---|---|
| Dashboard | Active OCs, OCs at risk, quotations this month. Table of live OCs: OC number, product, quantity, current stage, days in stage, deadline status. |
| Quotations | List + new quotation form with live preview and PDF export. |
| Orders | List + new OC form with the capacity result panel. |
| OC detail | Stage pipeline, timestamps, durations, advance action, delay breakdown. |
| Alerts | Chronological log of stage entries and deadline breaches. |
| Master data | Editable tables: departments (headcount, rate, ceiling), pricing slabs, materials per unit, procurement deadline, shift hours. |
---
## Seed data
- One product: **Mastro** (chair)
- Colours: Black, White, Red, Blue — with a placeholder image per colour
- Departments as specified above
- Materials: Plastics 1.0 kg/unit, Chrome 1.5 kg/unit
- Pricing slabs as specified above
- Three sample OCs so the demo has state on first load:
  - `OC10001` — Mastro, 100 units, black, in Injection moulding, on track
  - `OC10002` — Mastro, 250 units, white, in Procuring raw material,
    **already breached** (entered 5 days ago against a 3-day deadline) so the
    escalation is visible without waiting
  - `OC10003` — Mastro, 50 units, red, closed, with one stage that ran over so
    the delay breakdown has something to show
- Two sample quotations
---
## UI direction
Light theme. Industrial and calm, not consumer-playful. This is an internal
tool a plant manager opens forty times a day.
- Dense tables with tabular figures. Generous row height so they stay scannable.
- One accent colour, used only for primary actions.
- Status colour is meaningful, never decorative: green on track, amber
  approaching deadline, red breached.
- Sans-serif throughout.
- No gradient heroes, no spot illustrations, no icon-card grids, no
  marketing-style empty states.
---
## Acceptance checks
1. Entering 100 units with a 14-day target returns 6 / 15 / 22 workers.
2. Changing the target to 15 days returns 5 / 13 / 20 without a page reload.
3. Entering 8 days returns the blocked state naming Fabrication and Powder
   coating, with an earliest completion of 12 days.
4. Editing Fabrication's ceiling in Master Data to 25/day changes the earliest
   achievable completion — proving the model reads master data, not constants.
5. Advancing `OC10002` past its breached stage writes a deadline_breach alert
   addressed to the plant head.
6. A quotation for 300 units applies the 15% slab and exports a PDF whose
   layout matches the on-screen preview.
7. `npm run seed` restores every sample OC to its documented state.
Check 4 is the one that matters most. If the numbers are hardcoded anywhere,
that check fails.
