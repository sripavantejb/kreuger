// Manpower efficiency calculator — Scenario 3 of BUILD_SPEC.md.
//
// Pure function: takes quantity/target plus master data (departments,
// constants) and returns either an achievable plan or a blocked result
// naming the bottleneck and the earliest achievable completion. No
// constant in here is hardcoded business data — headcount, rates and
// ceilings all come from the caller (which reads them from the DB).

export type PlanningDepartment = {
  id: string;
  name: string;
  sequence: number;
  headcount: number;
  unitsPerWorkerPerDay: number;
  maxUnitsPerDay: number;
};

export type PlanningConstants = {
  procurementDays: number;
  rampDays: number;
  shiftHours: number;
};

export type DepartmentPlanLine = {
  departmentId: string;
  departmentName: string;
  sequence: number;
  workers: number;
  stageDays: number;
  stageHours: number;
  ceiling: number;
};

export type MaterialLine = {
  materialName: string;
  unit: string;
  quantity: number;
};

export type PlanResult =
  | {
      status: "ok";
      productionWindow: number;
      requiredRate: number;
      departmentPlans: DepartmentPlanLine[];
      materials: MaterialLine[];
      totalDays: number;
    }
  | {
      status: "blocked";
      reason: "window_too_short" | "capacity_exceeded";
      bottlenecks: { departmentId: string; departmentName: string; ceiling: number }[];
      slowestCeiling: number | null;
      earliestDays: number | null;
      productionWindow: number;
      requiredRate: number | null;
    };

// maxUnitsPerDay is the independent, editable ceiling (see BUILD_SPEC.md —
// "NOT derived" from headcount). Well-formed master data keeps it at or
// below headcount * unitsPerWorkerPerDay (machine-constrained departments
// cap below full headcount output), so it is the operative limit on its
// own; headcount/rate instead drive how many workers a plan assigns.
function departmentCeiling(d: PlanningDepartment): number {
  return d.maxUnitsPerDay;
}

export function planCapacity(
  quantity: number,
  targetDays: number,
  departments: PlanningDepartment[],
  constants: PlanningConstants
): PlanResult {
  const productionWindow = targetDays - constants.procurementDays - constants.rampDays;

  // Earliest-possible completion using the single slowest ceiling across all
  // departments — used to give a concrete date in every blocked branch.
  const allCeilings = departments.map(departmentCeiling);
  const globalSlowest = allCeilings.length > 0 ? Math.min(...allCeilings) : null;
  const earliestFromGlobal =
    globalSlowest && globalSlowest > 0
      ? Math.ceil(quantity / globalSlowest + constants.procurementDays + constants.rampDays)
      : null;

  if (productionWindow <= 0) {
    return {
      status: "blocked",
      reason: "window_too_short",
      bottlenecks: [],
      slowestCeiling: globalSlowest,
      earliestDays: earliestFromGlobal,
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
    const earliestDays = Math.ceil(
      quantity / slowestCeiling + constants.procurementDays + constants.rampDays
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
      earliestDays,
      productionWindow,
      requiredRate,
    };
  }

  const departmentPlans: DepartmentPlanLine[] = departments
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((d) => {
      const workers = Math.ceil(requiredRate / d.unitsPerWorkerPerDay);
      const stageDays = quantity / (workers * d.unitsPerWorkerPerDay);
      const stageHours = stageDays * constants.shiftHours;
      return {
        departmentId: d.id,
        departmentName: d.name,
        sequence: d.sequence,
        workers,
        stageDays,
        stageHours,
        ceiling: departmentCeiling(d),
      };
    });

  return {
    status: "ok",
    productionWindow,
    requiredRate,
    departmentPlans,
    materials: [],
    totalDays: targetDays,
  };
}

export function bottleneckSummary(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
