import path from "node:path";
import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { BRAND_LOGO_URL, COMPANY } from "@/lib/brand";
import { amountInWordsINR } from "@/lib/amount-in-words";

function resolvePdfImageSrc(imagePath: string): string | null {
  if (!imagePath) return null;
  const lower = imagePath.toLowerCase();
  if (lower.endsWith(".svg")) return null;
  if (imagePath.startsWith("data:image/")) return imagePath;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return imagePath;
  if (imagePath.startsWith("/")) return path.join(process.cwd(), "public", imagePath);
  return null;
}

const BORDER = "#222222";
const MUTED = "#44403c";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8, color: "#1c1917", fontFamily: "Helvetica" },
  letterhead: { alignItems: "center", marginBottom: 8 },
  logoRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 },
  logo: { width: 28, height: 28 },
  companyName: { fontSize: 12, fontWeight: 700, textAlign: "center" },
  companyLine: { fontSize: 7.5, color: MUTED, textAlign: "center", marginTop: 1 },
  titleBar: {
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 5,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 6,
  },
  titleText: { fontSize: 11, fontWeight: 700, letterSpacing: 1 },

  metaGrid: { flexDirection: "row", borderWidth: 1, borderColor: BORDER, marginBottom: 6 },
  metaCol: { width: "50%", padding: 6 },
  metaColRight: { width: "50%", padding: 6, borderLeftWidth: 1, borderLeftColor: BORDER },
  metaRow: { flexDirection: "row", marginBottom: 2 },
  metaLabel: { width: "42%", color: MUTED },
  metaValue: { width: "58%", fontWeight: 700 },

  partyRow: { flexDirection: "row", gap: 0, marginBottom: 6 },
  partyBox: { width: "50%", borderWidth: 1, borderColor: BORDER },
  partyBoxRight: { width: "50%", borderWidth: 1, borderColor: BORDER, borderLeftWidth: 0 },
  partyHead: { backgroundColor: "#f2f2f2", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: BORDER },
  partyHeadText: { fontSize: 8, fontWeight: 700 },
  partyBody: { padding: 6, minHeight: 56 },
  partyLine: { marginBottom: 2 },

  table: { borderWidth: 1, borderColor: BORDER },
  headRow: { flexDirection: "row", backgroundColor: "#f2f2f2", borderBottomWidth: 1, borderBottomColor: BORDER },
  headCell: {
    fontSize: 6.5,
    fontWeight: 700,
    textAlign: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  dataRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 48 },
  cell: {
    fontSize: 7.5,
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
  },
  totalRow: { flexDirection: "row", backgroundColor: "#f7f7f7" },

  bottomRow: { flexDirection: "row", marginTop: 6, gap: 6 },
  bottomLeft: { width: "58%" },
  bottomRight: { width: "42%", borderWidth: 1, borderColor: BORDER },
  blockLabel: { fontWeight: 700, marginBottom: 2 },
  blockText: { color: MUTED, marginBottom: 6 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#dddddd" },
  summaryLabel: { color: MUTED },
  summaryValue: { fontWeight: 700 },
  summaryStrong: { backgroundColor: "#f2f2f2" },

  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 24 },
  signLeft: { width: "45%" },
  signRight: { width: "45%", alignItems: "flex-end" },
  signLine: { marginTop: 28, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 4, width: 140, textAlign: "center" },
  footer: { marginTop: 16, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#dddddd", fontSize: 6.5, color: MUTED },
});

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
}
function formatNumber(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}
function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>: {value || "—"}</Text>
    </View>
  );
}

export type QuotationPdfData = {
  quotationNumber: string;
  date: Date;
  productName: string;
  productCode: string;
  description: string;
  hsnCode: string;
  imagePath: string;
  colourName: string;
  location: string;
  quantity: number;
  unitRate: number;
  lineTotal: number;
  gstPercent: number;
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
};

export function QuotationDocument({ data }: { data: QuotationPdfData }) {
  const specs = data.description
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const discountPct = data.discountPercent || 0;
  const taxable = data.lineTotal * (1 - discountPct / 100);
  const cgstRate = data.gstPercent / 2;
  const sgstRate = data.gstPercent / 2;
  const cgstAmt = (taxable * cgstRate) / 100;
  const sgstAmt = (taxable * sgstRate) / 100;
  const totalGst = cgstAmt + sgstAmt;
  const grandTotalRaw = taxable + totalGst;
  const grandTotal = Math.round(grandTotalRaw);
  const rounding = grandTotal - grandTotalRaw;
  const pdfImageSrc = resolvePdfImageSrc(data.imagePath);

  const descLines = [
    data.productName,
    data.location ? `Location: ${data.location}` : null,
    `Colour: ${data.colourName}`,
    ...specs.slice(0, 4),
  ].filter(Boolean) as string[];

  // Column widths % — must sum to 100
  const W = {
    sr: 4,
    desc: 22,
    hsn: 8,
    qty: 7,
    uom: 5,
    rate: 8,
    disc: 5,
    taxable: 9,
    cgstR: 5,
    cgstA: 7,
    sgstR: 5,
    sgstA: 7,
    total: 8,
  };

  return (
    <Document title={data.quotationNumber}>
      <Page size="A4" style={styles.page}>
        <View style={styles.letterhead}>
          <View style={styles.logoRow}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
            <Image src={BRAND_LOGO_URL} style={styles.logo} />
            <Text style={styles.companyName}>{COMPANY.legalName}</Text>
          </View>
          {COMPANY.addressLines.map((line) => (
            <Text key={line} style={styles.companyLine}>
              {line}
            </Text>
          ))}
          <Text style={styles.companyLine}>
            Email: {COMPANY.email} | Phone: {COMPANY.phone}
          </Text>
          <Text style={styles.companyLine}>
            PAN: {COMPANY.pan} | GSTIN: {COMPANY.gstin} | CIN: {COMPANY.cin}
          </Text>
        </View>

        <View style={styles.titleBar}>
          <Text style={styles.titleText}>PURCHASE ORDER</Text>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <MetaLine label="PO No." value={data.quotationNumber} />
            <MetaLine label="PO Date" value={formatDate(data.date)} />
            <MetaLine label="State" value={COMPANY.state} />
            <MetaLine label="State Code" value={COMPANY.stateCode} />
            <MetaLine label="Place of Supply" value={data.shipToState || COMPANY.state} />
          </View>
          <View style={styles.metaColRight}>
            <MetaLine label="Document Date" value={formatDate(data.date)} />
            <MetaLine label="Delivery Date" value={formatDate(data.deliveryDate)} />
            <MetaLine label="Contact Person" value={data.contactPerson} />
            <MetaLine label="Phone No." value={data.contactPhone} />
            <MetaLine label="Email" value={data.contactEmail} />
            <MetaLine label="Buyer" value={data.buyerName} />
            <MetaLine label="Vendor Ref No." value={data.vendorRefNo} />
          </View>
        </View>

        <View style={styles.partyRow}>
          <View style={styles.partyBox}>
            <View style={styles.partyHead}>
              <Text style={styles.partyHeadText}>Details of Vendor</Text>
            </View>
            <View style={styles.partyBody}>
              <Text style={[styles.partyLine, { fontWeight: 700 }]}>{data.vendorName || "—"}</Text>
              <Text style={styles.partyLine}>{data.vendorAddress || "—"}</Text>
              <Text style={styles.partyLine}>
                State: {data.vendorState || "—"} | Code: {data.vendorStateCode || "—"}
              </Text>
              <Text style={styles.partyLine}>GST No.: {data.vendorGstin || "—"}</Text>
            </View>
          </View>
          <View style={styles.partyBoxRight}>
            <View style={styles.partyHead}>
              <Text style={styles.partyHeadText}>Ship To Details</Text>
            </View>
            <View style={styles.partyBody}>
              <Text style={[styles.partyLine, { fontWeight: 700 }]}>{data.shipToName || "—"}</Text>
              <Text style={styles.partyLine}>{data.shipToAddress || "—"}</Text>
              <Text style={styles.partyLine}>
                State: {data.shipToState || "—"} | Code: {data.shipToStateCode || "—"}
              </Text>
              <Text style={styles.partyLine}>GST No.: {data.shipToGstin || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.headRow}>
            <Text style={[styles.headCell, { width: `${W.sr}%` }]}>Sr.</Text>
            <Text style={[styles.headCell, { width: `${W.desc}%` }]}>Description of Goods/Services</Text>
            <Text style={[styles.headCell, { width: `${W.hsn}%` }]}>HSN/SAC</Text>
            <Text style={[styles.headCell, { width: `${W.qty}%` }]}>Qty</Text>
            <Text style={[styles.headCell, { width: `${W.uom}%` }]}>UOM</Text>
            <Text style={[styles.headCell, { width: `${W.rate}%` }]}>Rate [INR]</Text>
            <Text style={[styles.headCell, { width: `${W.disc}%` }]}>Disc %</Text>
            <Text style={[styles.headCell, { width: `${W.taxable}%` }]}>Taxable Value</Text>
            <Text style={[styles.headCell, { width: `${W.cgstR}%` }]}>CGST %</Text>
            <Text style={[styles.headCell, { width: `${W.cgstA}%` }]}>CGST Amt</Text>
            <Text style={[styles.headCell, { width: `${W.sgstR}%` }]}>SGST %</Text>
            <Text style={[styles.headCell, { width: `${W.sgstA}%` }]}>SGST Amt</Text>
            <Text style={[styles.headCell, { width: `${W.total}%`, borderRightWidth: 0 }]}>Total</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={[styles.cell, { width: `${W.sr}%`, textAlign: "center" }]}>1</Text>
            <View style={[styles.cell, { width: `${W.desc}%` }]}>
              {descLines.map((line, i) => (
                <Text key={i} style={{ marginBottom: 1, fontWeight: i === 0 ? 700 : 400 }}>
                  {line}
                </Text>
              ))}
              {pdfImageSrc ? (
                // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
                <Image src={pdfImageSrc} style={{ width: 40, height: 40, marginTop: 4 }} />
              ) : null}
            </View>
            <Text style={[styles.cell, { width: `${W.hsn}%`, textAlign: "center" }]}>{data.hsnCode || "—"}</Text>
            <Text style={[styles.cell, { width: `${W.qty}%`, textAlign: "right" }]}>{formatNumber(data.quantity)}</Text>
            <Text style={[styles.cell, { width: `${W.uom}%`, textAlign: "center" }]}>Nos</Text>
            <Text style={[styles.cell, { width: `${W.rate}%`, textAlign: "right" }]}>{formatINR(data.unitRate)}</Text>
            <Text style={[styles.cell, { width: `${W.disc}%`, textAlign: "right" }]}>{formatINR(discountPct)}</Text>
            <Text style={[styles.cell, { width: `${W.taxable}%`, textAlign: "right" }]}>{formatINR(taxable)}</Text>
            <Text style={[styles.cell, { width: `${W.cgstR}%`, textAlign: "right" }]}>{formatINR(cgstRate)}</Text>
            <Text style={[styles.cell, { width: `${W.cgstA}%`, textAlign: "right" }]}>{formatINR(cgstAmt)}</Text>
            <Text style={[styles.cell, { width: `${W.sgstR}%`, textAlign: "right" }]}>{formatINR(sgstRate)}</Text>
            <Text style={[styles.cell, { width: `${W.sgstA}%`, textAlign: "right" }]}>{formatINR(sgstAmt)}</Text>
            <Text style={[styles.cell, { width: `${W.total}%`, textAlign: "right", borderRightWidth: 0, fontWeight: 700 }]}>
              {formatINR(taxable + totalGst)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={[styles.cell, { width: `${W.sr + W.desc + W.hsn}%`, fontWeight: 700 }]}>Total</Text>
            <Text style={[styles.cell, { width: `${W.qty}%`, textAlign: "right", fontWeight: 700 }]}>
              {formatNumber(data.quantity)}
            </Text>
            <Text style={[styles.cell, { width: `${W.uom + W.rate + W.disc}%` }]} />
            <Text style={[styles.cell, { width: `${W.taxable}%`, textAlign: "right", fontWeight: 700 }]}>
              {formatINR(taxable)}
            </Text>
            <Text style={[styles.cell, { width: `${W.cgstR}%` }]} />
            <Text style={[styles.cell, { width: `${W.cgstA}%`, textAlign: "right", fontWeight: 700 }]}>
              {formatINR(cgstAmt)}
            </Text>
            <Text style={[styles.cell, { width: `${W.sgstR}%` }]} />
            <Text style={[styles.cell, { width: `${W.sgstA}%`, textAlign: "right", fontWeight: 700 }]}>
              {formatINR(sgstAmt)}
            </Text>
            <Text style={[styles.cell, { width: `${W.total}%`, textAlign: "right", borderRightWidth: 0, fontWeight: 700 }]}>
              {formatINR(taxable + totalGst)}
            </Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.bottomLeft}>
            <Text style={styles.blockLabel}>Remarks</Text>
            <Text style={styles.blockText}>{data.remarks || "—"}</Text>
            <Text style={styles.blockLabel}>Amount In Words</Text>
            <Text style={styles.blockText}>{amountInWordsINR(grandTotal)}</Text>
            <Text style={styles.blockLabel}>Payment Terms</Text>
            <Text style={styles.blockText}>{data.paymentTerms || "—"}</Text>
          </View>
          <View style={styles.bottomRight}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount Before Tax</Text>
              <Text style={styles.summaryValue}>{formatINR(taxable)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Add: CGST ({formatINR(cgstRate)}%)</Text>
              <Text style={styles.summaryValue}>{formatINR(cgstAmt)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Add: SGST ({formatINR(sgstRate)}%)</Text>
              <Text style={styles.summaryValue}>{formatINR(sgstAmt)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryStrong]}>
              <Text style={[styles.summaryLabel, { fontWeight: 700 }]}>Total GST</Text>
              <Text style={styles.summaryValue}>{formatINR(totalGst)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rounding</Text>
              <Text style={styles.summaryValue}>{formatINR(rounding)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryStrong, { borderBottomWidth: 0 }]}>
              <Text style={[styles.summaryLabel, { fontWeight: 700 }]}>Total Amount</Text>
              <Text style={styles.summaryValue}>{formatINR(grandTotal)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.signRow}>
          <View style={styles.signLeft}>
            <Text>Prepared by: ________________</Text>
            <Text style={{ marginTop: 10 }}>Checked By & Date: ________________</Text>
          </View>
          <View style={styles.signRight}>
            <Text style={{ textAlign: "right" }}>For, {COMPANY.legalName}</Text>
            <Text style={styles.signLine}>Authorised Signatory</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>{COMPANY.registeredOffice}</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}
