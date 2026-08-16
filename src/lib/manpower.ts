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
  utilisation: number; // requiredRate / ceiling — 0.70 = 70%
  ceiling: number;
};

export type MaterialLine = { materialName: string; unit: string; quantity: number };

export type ManpowerResult =
  | {
      status: "achievable";
      productionWindow: number;
      requiredRate: number;
      lines: ManpowerLine[];
      materials: MaterialLine[];
      totalManHours: number;
      longestWorkingDays: number;
      overallUtilisation: number;
    }
  | {
      status: "blocked";
      reason: "window_too_short" | "capacity_exceeded";
      bottlenecks: { departmentId: string; departmentName: string; ceiling: number }[];
      slowestCeiling: number | null;
      earliestWorkingDays: number | null;
      requiredRate: number | null;
      productionWindow: number;
    };

function departmentCeiling(d: ManpowerDepartment): number {
  return d.maxUnitsPerDay;
}

export function planManpower(
  quantity: number,
  workingDays: number,
  departments: ManpowerDepartment[],
  constants: ManpowerConstants,
  materialRates: { materialName: string; unit: string; quantityPerUnit: number }[] = []
): ManpowerResult {
  const productionWindow = workingDays - constants.procurementWorkingDays - constants.rampDays;

  const allCeilings = departments.map(departmentCeiling);
  const globalSlowest = allCeilings.length > 0 ? Math.min(...allCeilings) : null;
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
    };
  }

  const requiredRate = quantity / productionWindow;

  const bottlenecks = departments
    .map((d) => ({ d, ceiling: departmentCeiling(d) }))
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
    };
  }

  const lines: ManpowerLine[] = departments
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((d) => {
      const ceiling = departmentCeiling(d);
      const workers = Math.ceil(requiredRate / d.unitsPerWorkerPerDay);
      const lineWorkingDays = quantity / (workers * d.unitsPerWorkerPerDay);
      const workingHours = lineWorkingDays * constants.shiftHours;
      const manHours = workingHours * workers;
      const utilisation = requiredRate / ceiling;
      return {
        departmentId: d.id,
        departmentName: d.name,
        sequence: d.sequence,
        workers,
        workingDays: lineWorkingDays,
        workingHours,
        manHours,
        utilisation,
        ceiling,
      };
    });

  const materials = materialRates.map((m) => ({
    materialName: m.materialName,
    unit: m.unit,
    quantity: m.quantityPerUnit * quantity,
  }));

  return {
    status: "achievable",
    productionWindow,
    requiredRate,
    lines,
    materials,
    totalManHours: lines.reduce((sum, l) => sum + l.manHours, 0),
    longestWorkingDays: Math.max(...lines.map((l) => l.workingDays)),
    overallUtilisation: Math.max(...lines.map((l) => l.utilisation)),
  };
}

export function bottleneckSummary(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
