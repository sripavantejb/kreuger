import type { QuotationPreviewData, QuotationPreviewLine } from "@/components/quotations/quotation-preview";
import type { QuotationPdfData, QuotationPdfLine } from "@/lib/pdf/quotation-document";

type LineSource = {
  location: string;
  quantity: number;
  unitRate: number;
  lineTotal: number;
  product: { name: string; code: string; description: string; hsnCode: string };
  colour: { name: string; hexCode: string };
  imagePath?: string;
};

type QuotationParty = {
  quotationNumber: string;
  createdAt: Date;
  location: string;
  quantity: number;
  unitRate: number;
  lineTotal: number;
  discountPercent: number;
  vendorName: string;
  vendorAddress: string;
  vendorState: string;
  vendorStateCode: string;
  vendorGstin: string;
  shipToName: string;
  shipToAddress: string;
  shipToState: string;
  shipToStateCode: string;
  shipToGstin: string;
  deliveryDate: Date | null;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  buyerName: string;
  vendorRefNo: string;
  remarks: string;
  paymentTerms: string;
  product: { name: string; code: string; description: string; hsnCode: string };
  colour: { name: string; hexCode: string };
  lines?: LineSource[];
};

function toPreviewLines(quotation: QuotationParty, fallbackImage: string): QuotationPreviewLine[] {
  if (quotation.lines && quotation.lines.length > 0) {
    return quotation.lines.map((l) => ({
      productName: l.product.name,
      productCode: l.product.code,
      description: l.product.description,
      hsnCode: l.product.hsnCode ?? "",
      imagePath: l.imagePath ?? "",
      colourName: l.colour.name,
      colourHex: l.colour.hexCode,
      location: l.location ?? "",
      quantity: l.quantity,
      unitRate: l.unitRate,
      lineTotal: l.lineTotal,
    }));
  }
  return [
    {
      productName: quotation.product.name,
      productCode: quotation.product.code,
      description: quotation.product.description,
      hsnCode: quotation.product.hsnCode ?? "",
      imagePath: fallbackImage,
      colourName: quotation.colour.name,
      colourHex: quotation.colour.hexCode,
      location: quotation.location ?? "",
      quantity: quotation.quantity,
      unitRate: quotation.unitRate,
      lineTotal: quotation.lineTotal,
    },
  ];
}

function partyFields(quotation: QuotationParty) {
  return {
    vendorName: quotation.vendorName ?? "",
    vendorAddress: quotation.vendorAddress ?? "",
    vendorState: quotation.vendorState ?? "",
    vendorStateCode: quotation.vendorStateCode ?? "",
    vendorGstin: quotation.vendorGstin ?? "",
    shipToName: quotation.shipToName ?? "",
    shipToAddress: quotation.shipToAddress ?? "",
    shipToState: quotation.shipToState ?? "",
    shipToStateCode: quotation.shipToStateCode ?? "",
    shipToGstin: quotation.shipToGstin ?? "",
    deliveryDate: quotation.deliveryDate ?? null,
    contactPerson: quotation.contactPerson ?? "",
    contactPhone: quotation.contactPhone ?? "",
    contactEmail: quotation.contactEmail ?? "",
    buyerName: quotation.buyerName ?? "",
    vendorRefNo: quotation.vendorRefNo ?? "",
    remarks: quotation.remarks ?? "",
    paymentTerms: quotation.paymentTerms ?? "Advance 100%",
  };
}

export function toQuotationPreviewData(
  quotation: QuotationParty,
  imagePath: string,
  gstPercent: number
): QuotationPreviewData {
  const lines = toPreviewLines(quotation, imagePath);
  const first = lines[0];
  return {
    quotationNumber: quotation.quotationNumber,
    date: quotation.createdAt,
    productName: first.productName,
    productCode: first.productCode,
    description: first.description,
    hsnCode: first.hsnCode,
    imagePath: first.imagePath,
    colourName: first.colourName,
    colourHex: first.colourHex,
    location: first.location,
    quantity: lines.reduce((s, l) => s + l.quantity, 0),
    unitRate: first.unitRate,
    lineTotal: lines.reduce((s, l) => s + l.lineTotal, 0),
    gstPercent,
    discountPercent: quotation.discountPercent ?? 0,
    lines,
    ...partyFields(quotation),
  };
}

export function toQuotationPdfData(
  quotation: QuotationParty,
  imagePath: string,
  gstPercent: number
): QuotationPdfData {
  const preview = toQuotationPreviewData(quotation, imagePath, gstPercent);
  const lines: QuotationPdfLine[] = (preview.lines ?? []).map((l) => ({
    productName: l.productName,
    productCode: l.productCode,
    description: l.description,
    hsnCode: l.hsnCode ?? "",
    imagePath: l.imagePath,
    colourName: l.colourName,
    location: l.location ?? "",
    quantity: l.quantity,
    unitRate: l.unitRate,
    lineTotal: l.lineTotal,
  }));
  return {
    quotationNumber: preview.quotationNumber,
    date: quotation.createdAt,
    productName: preview.productName,
    productCode: preview.productCode,
    description: preview.description,
    hsnCode: preview.hsnCode ?? "",
    imagePath: preview.imagePath,
    colourName: preview.colourName,
    location: preview.location ?? "",
    quantity: preview.quantity,
    unitRate: preview.unitRate,
    lineTotal: preview.lineTotal,
    gstPercent,
    discountPercent: preview.discountPercent ?? 0,
    lines,
    vendorName: preview.vendorName ?? "",
    vendorAddress: preview.vendorAddress ?? "",
    vendorState: preview.vendorState ?? "",
    vendorStateCode: preview.vendorStateCode ?? "",
    vendorGstin: preview.vendorGstin ?? "",
    shipToName: preview.shipToName ?? "",
    shipToAddress: preview.shipToAddress ?? "",
    shipToState: preview.shipToState ?? "",
    shipToStateCode: preview.shipToStateCode ?? "",
    shipToGstin: preview.shipToGstin ?? "",
    deliveryDate: quotation.deliveryDate,
    contactPerson: preview.contactPerson ?? "",
    contactPhone: preview.contactPhone ?? "",
    contactEmail: preview.contactEmail ?? "",
    buyerName: preview.buyerName ?? "",
    vendorRefNo: preview.vendorRefNo ?? "",
    remarks: preview.remarks ?? "",
    paymentTerms: preview.paymentTerms ?? "",
  };
}
