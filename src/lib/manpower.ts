// Manpower efficiency module — capacity/utilisation algorithm.
//
// Deliberately mirrors src/lib/planning.ts (Scenario 3's calculator): same
// department ceiling rule (maxUnitsPerDay is the independent, editable
// ceiling — see the comment on departmentCeiling there for why it isn't
// min'd with headcount * rate), same bottleneck/earliest-completion logic.
// This module is additive — it takes a *working-day* count (already
// converted from a date range by src/lib/working-days.ts) instead of a raw
// day count, and additionally reports working hours, man-hours and
// utilisation per department, none of which the original calculator needed.
//
// Overtime: extra hours beyond Settings.shiftHours scale both worker rate and
// the daily ceiling by (shift + OT) / shift, and split man-hours into regular
// vs overtime.

export type ManpowerDepartment = {
  id: string;
  name: string;
  sequence: number;
  headcount: number;
  unitsPerWorkerPerDay: number;
  maxUnitsPerDay: number;
};

export type ManpowerConstants = {
  procurementWorkingDays: number;
  rampDays: number;
  shiftHours: number;
};

export type ManpowerLine = {
  departmentId: string;
  departmentName: string;
  sequence: number;
  workers: number;
  workingDays: number;
  workingHours: number;
  manHours: number;
  regularManHours: number;
  overtimeManHours: number;
  utilisation: number; // requiredRate / effectiveCeiling — 0.70 = 70%
  ceiling: number;
  headcount: number;
};

export type MaterialLine = { materialName: string; unit: string; quantity: number };

export type ManpowerPlanningMode = "date" | "workers";

export type ManpowerResult =
  | {
      status: "achievable";
      productionWindow: number;
      requiredRate: number;
      lines: ManpowerLine[];
      materials: MaterialLine[];
      totalManHours: number;
      totalRegularManHours: number;
      totalOvertimeManHours: number;
      longestWorkingDays: number;
      overallUtilisation: number;
      overtimeHoursPerDay: number;
      hoursPerDay: number;
      /** Inclusive working days for the whole run (production + procurement + ramp). Worker mode only. */
      totalWorkingDays?: number;
    }
  | {
      status: "blocked";
      reason: "window_too_short" | "capacity_exceeded" | "insufficient_workers";
      bottlenecks: { departmentId: string; departmentName: string; ceiling: number }[];
      slowestCeiling: number | null;
      earliestWorkingDays: number | null;
      requiredRate: number | null;
      productionWindow: number;
      overtimeHoursPerDay: number;
    };

/** How much faster a day runs with overtime vs a standard shift. */
export function overtimeFactor(shiftHours: number, overtimeHoursPerDay: number): number {
  const ot = Math.max(0, overtimeHoursPerDay);
  if (shiftHours <= 0) return 1;
  return (shiftHours + ot) / shiftHours;
}

function clampOvertime(shiftHours: number, overtimeHoursPerDay: number): number {
  const maxOt = Math.max(shiftHours, 6);
  return Math.min(Math.max(0, overtimeHoursPerDay), maxOt);
}

function departmentCeiling(d: ManpowerDepartment): number {
  return d.maxUnitsPerDay;
}

function materialsFor(
  quantity: number,
  materialRates: { materialName: string; unit: string; quantityPerUnit: number }[]
): MaterialLine[] {
  return materialRates.map((m) => ({
    materialName: m.materialName,
    unit: m.unit,
    quantity: m.quantityPerUnit * quantity,
  }));
}

function lineHours(
  workingDays: number,
  workers: number,
  shiftHours: number,
  overtimeHoursPerDay: number
) {
  const hoursPerDay = shiftHours + overtimeHoursPerDay;
  const workingHours = workingDays * hoursPerDay;
  const regularManHours = workingDays * shiftHours * workers;
  const overtimeManHours = workingDays * overtimeHoursPerDay * workers;
  const manHours = regularManHours + overtimeManHours;
  return { hoursPerDay, workingHours, regularManHours, overtimeManHours, manHours };
}

export function planManpower(
  quantity: number,
  workingDays: number,
  departments: ManpowerDepartment[],
  constants: ManpowerConstants,
  materialRates: { materialName: string; unit: string; quantityPerUnit: number }[] = [],
  overtimeHoursPerDayInput = 0
): ManpowerResult {
  const overtimeHoursPerDay = clampOvertime(constants.shiftHours, overtimeHoursPerDayInput);
  const factor = overtimeFactor(constants.shiftHours, overtimeHoursPerDay);
  const productionWindow = workingDays - constants.procurementWorkingDays - constants.rampDays;

  const scaledCeilings = departments.map((d) => departmentCeiling(d) * factor);
  const globalSlowest = scaledCeilings.length > 0 ? Math.min(...scaledCeilings) : null;
  const earliestFromGlobal =
    globalSlowest && globalSlowest > 0
      ? Math.ceil(quantity / globalSlowest + constants.procurementWorkingDays + constants.rampDays)
      : null;

  if (productionWindow <= 0) {
    return {
      status: "blocked",
      reason: "window_too_short",
      bottlenecks: [],
      slowestCeiling: globalSlowest,
      earliestWorkingDays: earliestFromGlobal,
      productionWindow,
      requiredRate: null,
      overtimeHoursPerDay,
    };
  }

  const requiredRate = quantity / productionWindow;

  const bottlenecks = departments
    .map((d) => ({ d, ceiling: departmentCeiling(d) * factor }))
    .filter(({ ceiling }) => requiredRate > ceiling);

  if (bottlenecks.length > 0) {
    const slowestCeiling = Math.min(...bottlenecks.map((b) => b.ceiling));
    const earliestWorkingDays = Math.ceil(
      quantity / slowestCeiling + constants.procurementWorkingDays + constants.rampDays
    );
    return {
      status: "blocked",
      reason: "capacity_exceeded",
      bottlenecks: bottlenecks.map(({ d, ceiling }) => ({
        departmentId: d.id,
        departmentName: d.name,
        ceiling,
      })),
      slowestCeiling,
      earliestWorkingDays,
      productionWindow,
      requiredRate,
      overtimeHoursPerDay,
    };
  }

  const lines: ManpowerLine[] = departments
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((d) => {
      const baseCeiling = departmentCeiling(d);
      const ceiling = baseCeiling * factor;
      const effectiveRate = d.unitsPerWorkerPerDay * factor;
      const workers = Math.ceil(requiredRate / effectiveRate);
      const lineWorkingDays = quantity / (workers * effectiveRate);
      const hours = lineHours(lineWorkingDays, workers, constants.shiftHours, overtimeHoursPerDay);
      const utilisation = requiredRate / ceiling;
      return {
        departmentId: d.id,
        departmentName: d.name,
        sequence: d.sequence,
        workers,
        workingDays: lineWorkingDays,
        workingHours: hours.workingHours,
        manHours: hours.manHours,
        regularManHours: hours.regularManHours,
        overtimeManHours: hours.overtimeManHours,
        utilisation,
        ceiling,
        headcount: d.headcount,
      };
    });

  return {
    status: "achievable",
    productionWindow,
    requiredRate,
    lines,
    materials: materialsFor(quantity, materialRates),
    totalManHours: lines.reduce((sum, l) => sum + l.manHours, 0),
    totalRegularManHours: lines.reduce((sum, l) => sum + l.regularManHours, 0),
    totalOvertimeManHours: lines.reduce((sum, l) => sum + l.overtimeManHours, 0),
    longestWorkingDays: Math.max(...lines.map((l) => l.workingDays)),
    overallUtilisation: Math.max(...lines.map((l) => l.utilisation)),
    overtimeHoursPerDay,
    hoursPerDay: constants.shiftHours + overtimeHoursPerDay,
  };
}

/**
 * Invert of planManpower: given assigned workers per department, compute how
 * many production / total working days the quantity needs. Daily throughput is
 * capped by maxUnitsPerDay (same ceiling rule as the date-driven calculator),
 * both scaled by overtime.
 */
export function planManpowerFromWorkers(
  quantity: number,
  assignedWorkers: Record<string, number>,
  departments: ManpowerDepartment[],
  constants: ManpowerConstants,
  materialRates: { materialName: string; unit: string; quantityPerUnit: number }[] = [],
  overtimeHoursPerDayInput = 0
): ManpowerResult {
  const overtimeHoursPerDay = clampOvertime(constants.shiftHours, overtimeHoursPerDayInput);
  const factor = overtimeFactor(constants.shiftHours, overtimeHoursPerDay);
  const sorted = departments.slice().sort((a, b) => a.sequence - b.sequence);
  const missing = sorted.filter((d) => {
    const w = assignedWorkers[d.id] ?? 0;
    return !Number.isFinite(w) || w < 1;
  });

  if (missing.length > 0) {
    return {
      status: "blocked",
      reason: "insufficient_workers",
      bottlenecks: missing.map((d) => ({
        departmentId: d.id,
        departmentName: d.name,
        ceiling: departmentCeiling(d) * factor,
      })),
      slowestCeiling: null,
      earliestWorkingDays: null,
      productionWindow: 0,
      requiredRate: null,
      overtimeHoursPerDay,
    };
  }

  const lines: ManpowerLine[] = sorted.map((d) => {
    const ceiling = departmentCeiling(d) * factor;
    const workers = Math.max(1, Math.floor(assignedWorkers[d.id] ?? 0));
    const rawThroughput = workers * d.unitsPerWorkerPerDay * factor;
    const effectiveThroughput = Math.min(rawThroughput, ceiling);
    const lineWorkingDays = quantity / effectiveThroughput;
    const hours = lineHours(lineWorkingDays, workers, constants.shiftHours, overtimeHoursPerDay);
    const utilisation = effectiveThroughput / ceiling;
    return {
      departmentId: d.id,
      departmentName: d.name,
      sequence: d.sequence,
      workers,
      workingDays: lineWorkingDays,
      workingHours: hours.workingHours,
      manHours: hours.manHours,
      regularManHours: hours.regularManHours,
      overtimeManHours: hours.overtimeManHours,
      utilisation,
      ceiling,
      headcount: d.headcount,
    };
  });

  const longestWorkingDays = Math.max(...lines.map((l) => l.workingDays));
  const productionWindow = longestWorkingDays;
  const requiredRate = quantity / productionWindow;
  const totalWorkingDays =
    productionWindow + constants.procurementWorkingDays + constants.rampDays;

  return {
    status: "achievable",
    productionWindow,
    requiredRate,
    lines,
    materials: materialsFor(quantity, materialRates),
    totalManHours: lines.reduce((sum, l) => sum + l.manHours, 0),
    totalRegularManHours: lines.reduce((sum, l) => sum + l.regularManHours, 0),
    totalOvertimeManHours: lines.reduce((sum, l) => sum + l.overtimeManHours, 0),
    longestWorkingDays,
    overallUtilisation: Math.max(...lines.map((l) => l.utilisation)),
    overtimeHoursPerDay,
    hoursPerDay: constants.shiftHours + overtimeHoursPerDay,
    totalWorkingDays,
  };
}

/** Working days implied by an achievable result (includes procurement + ramp). */
export function totalWorkingDaysForResult(
  result: Extract<ManpowerResult, { status: "achievable" }>,
  constants: ManpowerConstants
): number {
  if (result.totalWorkingDays != null) return result.totalWorkingDays;
  return result.longestWorkingDays + constants.procurementWorkingDays + constants.rampDays;
}

export function bottleneckSummary(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
