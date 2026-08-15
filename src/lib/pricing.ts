// Quantity-based pricing — Scenario 1 of BUILD_SPEC.md.

export type Slab = {
  minQuantity: number;
  maxQuantity: number | null;
  discountPercent: number;
};

export function findSlab(quantity: number, slabs: Slab[]): Slab | null {
  return (
    slabs.find(
      (s) => quantity >= s.minQuantity && (s.maxQuantity === null || quantity <= s.maxQuantity)
    ) ?? null
  );
}

export function computeUnitRate(baseRate: number, quantity: number, slabs: Slab[]): number {
  const slab = findSlab(quantity, slabs);
  const discount = slab?.discountPercent ?? 0;
  return baseRate * (1 - discount / 100);
}
