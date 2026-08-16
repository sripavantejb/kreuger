// Quantity-based pricing — Scenario 1 of BUILD_SPEC.md.
// Suggested rate uses pricing slabs (and optionally last quotation for the product).
// Managers may override; never silently force a suggested rate into a saved quotation.

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

export type PriceSuggestion = {
  suggestedUnitRate: number;
  baseRate: number;
  slabDiscountPercent: number;
  slabLabel: string;
  explanation: string;
  lastQuotationUnitRate: number | null;
  lastQuotationNumber: string | null;
};

export function suggestUnitRate(params: {
  baseRate: number;
  quantity: number;
  slabs: Slab[];
  lastQuotation?: { unitRate: number; quotationNumber: string; quantity: number } | null;
}): PriceSuggestion {
  const { baseRate, quantity, slabs, lastQuotation } = params;
  const slab = findSlab(quantity, slabs);
  const slabDiscountPercent = slab?.discountPercent ?? 0;
  const suggestedUnitRate = computeUnitRate(baseRate, quantity, slabs);
  const slabLabel = slab
    ? slab.maxQuantity == null
      ? `${slab.minQuantity}+ units @ ${slabDiscountPercent}% off`
      : `${slab.minQuantity}–${slab.maxQuantity} units @ ${slabDiscountPercent}% off`
    : "No matching slab — base rate";

  let explanation = `Base ₹${baseRate.toFixed(2)} × (1 − ${slabDiscountPercent}% slab) = ₹${suggestedUnitRate.toFixed(2)}.`;
  if (lastQuotation) {
    explanation += ` Last quote ${lastQuotation.quotationNumber} (${lastQuotation.quantity} units) was ₹${lastQuotation.unitRate.toFixed(2)}.`;
  }

  return {
    suggestedUnitRate,
    baseRate,
    slabDiscountPercent,
    slabLabel,
    explanation,
    lastQuotationUnitRate: lastQuotation?.unitRate ?? null,
    lastQuotationNumber: lastQuotation?.quotationNumber ?? null,
  };
}
