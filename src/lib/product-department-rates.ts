// Overlays a product's optional per-department overrides onto the global
// department list before it's handed to planCapacity/planManpower, so a
// product with a custom rate/ceiling for a stage actually plans against it.

export type BaseDepartment = {
  id: string;
  name: string;
  sequence: number;
  headcount: number;
  unitsPerWorkerPerDay: number;
  maxUnitsPerDay: number;
};

export type DepartmentRateOverride = {
  departmentId: string;
  unitsPerWorkerPerDay: number;
  maxUnitsPerDay: number;
};

export function applyProductDepartmentRates<T extends BaseDepartment>(
  departments: T[],
  overrides: DepartmentRateOverride[]
): T[] {
  if (overrides.length === 0) return departments;
  const overrideByDept = new Map(overrides.map((o) => [o.departmentId, o]));
  return departments.map((d) => {
    const override = overrideByDept.get(d.id);
    if (!override) return d;
    return {
      ...d,
      unitsPerWorkerPerDay: override.unitsPerWorkerPerDay,
      maxUnitsPerDay: override.maxUnitsPerDay,
    };
  });
}
