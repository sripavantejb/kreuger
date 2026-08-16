import type { QuotationPreviewData } from "@/components/quotations/quotation-preview";
import type { QuotationPdfData } from "@/lib/pdf/quotation-document";

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
};

export function toQuotationPreviewData(
  quotation: QuotationParty,
  imagePath: string,
  gstPercent: number
): QuotationPreviewData {
  return {
    quotationNumber: quotation.quotationNumber,
    date: quotation.createdAt,
    productName: quotation.product.name,
    productCode: quotation.product.code,
    description: quotation.product.description,
    hsnCode: quotation.product.hsnCode ?? "",
    imagePath,
    colourName: quotation.colour.name,
    colourHex: quotation.colour.hexCode,
    location: quotation.location ?? "",
    quantity: quotation.quantity,
    unitRate: quotation.unitRate,
    lineTotal: quotation.lineTotal,
    gstPercent,
    discountPercent: quotation.discountPercent ?? 0,
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

export function toQuotationPdfData(
  quotation: QuotationParty,
  imagePath: string,
  gstPercent: number
): QuotationPdfData {
  const preview = toQuotationPreviewData(quotation, imagePath, gstPercent);
  return {
    quotationNumber: preview.quotationNumber,
    date: quotation.createdAt,
    productName: preview.productName,
    productCode: preview.productCode,
    description: preview.description,
    hsnCode: preview.hsnCode ?? "",
    imagePath,
    colourName: preview.colourName,
    location: preview.location ?? "",
    quantity: preview.quantity,
    unitRate: preview.unitRate,
    lineTotal: preview.lineTotal,
    gstPercent,
    discountPercent: preview.discountPercent ?? 0,
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
