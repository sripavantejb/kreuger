/** Demo material readiness — stock comes from ProductMaterial.demoAvailableQty (not SAP). */

export type MaterialRequirement = {
  materialName: string;
  unit: string;
  requiredQty: number;
  availableQty: number;
  shortage: number;
  status: "READY" | "SHORTAGE";
};

export function computeMaterialRequirements(
  materials: { materialName: string; unit: string; quantityPerUnit: number; demoAvailableQty: number }[],
  quantity: number
): MaterialRequirement[] {
  return materials.map((m) => {
    const requiredQty = m.quantityPerUnit * quantity;
    const availableQty = m.demoAvailableQty;
    const shortage = Math.max(0, requiredQty - availableQty);
    return {
      materialName: m.materialName,
      unit: m.unit,
      requiredQty,
      availableQty,
      shortage,
      status: shortage > 0 ? "SHORTAGE" : "READY",
    };
  });
}
