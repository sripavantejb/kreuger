import path from "node:path";
import { Document, Page, View, Text, StyleSheet, Svg, Rect, Line, Image } from "@react-pdf/renderer";
import { BRAND_LOGO_URL } from "@/lib/brand";

// react-pdf's Image renders server-side with no browser/DOM: it can only take a
// data: URI, an absolute http(s) URL, or a filesystem path — and only raster
// formats (no SVG). Resolve or reject whatever ProductColourImage.imagePath holds
// so a legacy site-relative .svg placeholder falls back to the schematic glyph
// instead of failing the whole PDF render.
function resolvePdfImageSrc(imagePath: string): string | null {
  if (!imagePath) return null;
  const lower = imagePath.toLowerCase();
  if (lower.endsWith(".svg")) return null;
  if (imagePath.startsWith("data:image/")) return imagePath;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return imagePath;
  if (imagePath.startsWith("/")) return path.join(process.cwd(), "public", imagePath);
  return null;
}

// Column widths for the BOQ-style table — sums to 100%.
const COL = {
  sr: 4,
  particular: 12,
  image: 13,
  description: 23,
  location: 10,
  unit: 6,
  qty: 8,
  rate: 12,
  amount: 12,
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, color: "#1c1917", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 28, height: 28 },
  companyName: { fontSize: 11, fontWeight: 700 },
  headerRight: { textAlign: "right", color: "#57534e", fontSize: 8 },
  quotationNumber: { fontSize: 10, fontWeight: 700, color: "#1c1917" },

  titleBar: { backgroundColor: "#dedcd3", borderWidth: 1, borderColor: "#8a8578", paddingVertical: 6, alignItems: "center" },
  titleText: { fontSize: 11, fontWeight: 700 },

  table: { borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#8a8578" },
  headRow: { flexDirection: "row", backgroundColor: "#dedcd3", borderBottomWidth: 1, borderColor: "#8a8578" },
  headCell: { fontSize: 8, fontWeight: 700, textAlign: "center", paddingVertical: 5, paddingHorizontal: 3, borderRightWidth: 1, borderColor: "#c2beb0" },

  dataRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#c2beb0" },
  cell: { fontSize: 8.5, paddingVertical: 6, paddingHorizontal: 4, borderRightWidth: 1, borderColor: "#c2beb0", justifyContent: "flex-start" },

  imageBox: { width: 64, height: 64, borderWidth: 1, borderColor: "#e7e5e4", backgroundColor: "#fafaf9", alignItems: "center", justifyContent: "center", alignSelf: "center" },
  bullet: { flexDirection: "row", gap: 3, marginBottom: 2 },
  bulletDot: { color: "#78716c" },

  footRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#c2beb0" },
  footLabelCell: { fontSize: 9, fontWeight: 700, textAlign: "right", paddingVertical: 6, paddingHorizontal: 8 },
  footAmountCell: { fontSize: 9, fontWeight: 700, textAlign: "right", paddingVertical: 6, paddingHorizontal: 8, borderLeftWidth: 1, borderColor: "#c2beb0" },
  grandTotalRow: { backgroundColor: "#efece3" },

  footer: { marginTop: 20, paddingTop: 10, borderTop: 1, borderColor: "#e7e5e4", color: "#78716c", fontSize: 8 },
});

function formatINR(n: number) {
  return `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n)}`;
}
function formatNumber(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}
function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function ChairGlyph({ hex, outline }: { hex: string; outline: string }) {
  return (
    <Svg width={56} height={56} viewBox="0 0 400 400">
      <Rect x={0} y={0} width={400} height={400} fill="#fafaf9" />
      <Rect x={120} y={70} width={160} height={140} rx={14} fill={hex} stroke={outline} strokeWidth={4} />
      <Rect x={120} y={220} width={160} height={24} rx={6} fill={hex} stroke={outline} strokeWidth={4} />
      <Line x1={140} y1={244} x2={130} y2={330} stroke={outline} strokeWidth={4} />
      <Line x1={260} y1={244} x2={270} y2={330} stroke={outline} strokeWidth={4} />
      <Line x1={150} y1={244} x2={145} y2={300} stroke={outline} strokeWidth={4} />
      <Line x1={250} y1={244} x2={255} y2={300} stroke={outline} strokeWidth={4} />
      <Line x1={130} y1={330} x2={270} y2={330} stroke={outline} strokeWidth={4} />
    </Svg>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

function SwatchGlyph({ hex, name }: { hex: string; name: string }) {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: hex,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: 700 }}>{initials(name)}</Text>
    </View>
  );
}

export type QuotationPdfData = {
  quotationNumber: string;
  date: Date;
  productName: string;
  productCode: string;
  description: string;
  imagePath: string;
  colourName: string;
  colourHex: string;
  colourOutlineHex: string;
  location: string;
  quantity: number;
  unitRate: number;
  lineTotal: number;
  gstPercent: number;
};

export function QuotationDocument({ data }: { data: QuotationPdfData }) {
  const specs = data.description
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const gstAmount = (data.lineTotal * data.gstPercent) / 100;
  const grandTotal = data.lineTotal + gstAmount;
  const pdfImageSrc = resolvePdfImageSrc(data.imagePath);

  return (
    <Document title={data.quotationNumber}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop */}
            <Image src={BRAND_LOGO_URL} style={styles.logo} />
            <Text style={styles.companyName}>Kreuger Furniture Works</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.quotationNumber}>{data.quotationNumber}</Text>
            <Text>{formatDate(data.date)}</Text>
          </View>
        </View>

        <View style={styles.titleBar}>
          <Text style={styles.titleText}>Bill Of Quantities - {data.productName}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.headRow}>
            <Text style={[styles.headCell, { width: `${COL.sr}%` }]}>Sr</Text>
            <Text style={[styles.headCell, { width: `${COL.particular}%` }]}>Particular</Text>
            <Text style={[styles.headCell, { width: `${COL.image}%` }]}>Image</Text>
            <Text style={[styles.headCell, { width: `${COL.description}%` }]}>Description</Text>
            <Text style={[styles.headCell, { width: `${COL.location}%` }]}>Location</Text>
            <Text style={[styles.headCell, { width: `${COL.unit}%` }]}>Unit</Text>
            <Text style={[styles.headCell, { width: `${COL.qty}%` }]}>Qty</Text>
            <Text style={[styles.headCell, { width: `${COL.rate}%` }]}>Rate</Text>
            <Text style={[styles.headCell, { width: `${COL.amount}%`, borderRightWidth: 0 }]}>Amount</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={[styles.cell, { width: `${COL.sr}%` }]}>1</Text>
            <Text style={[styles.cell, { width: `${COL.particular}%`, fontWeight: 700 }]}>{data.productName}</Text>
            <View style={[styles.cell, { width: `${COL.image}%`, alignItems: "center" }]}>
              <View style={styles.imageBox}>
                {pdfImageSrc ? (
                  // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop
                  <Image src={pdfImageSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : data.productCode === "MASTRO" ? (
                  <ChairGlyph hex={data.colourHex} outline={data.colourOutlineHex} />
                ) : (
                  <SwatchGlyph hex={data.colourHex} name={data.productName} />
                )}
              </View>
            </View>
            <View style={[styles.cell, { width: `${COL.description}%` }]}>
              {specs.length > 0 ? (
                specs.map((s, i) => (
                  <View key={i} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text>{s}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: "#a8a29e" }}>—</Text>
              )}
              <View style={[styles.bullet, { marginTop: 3 }]}>
                <Text style={styles.bulletDot}>•</Text>
                <Text>Colour: {data.colourName}</Text>
              </View>
            </View>
            <Text style={[styles.cell, { width: `${COL.location}%` }]}>{data.location || "—"}</Text>
            <Text style={[styles.cell, { width: `${COL.unit}%`, textAlign: "center" }]}>Nos</Text>
            <Text style={[styles.cell, { width: `${COL.qty}%`, textAlign: "right" }]}>{formatNumber(data.quantity)}</Text>
            <Text style={[styles.cell, { width: `${COL.rate}%`, textAlign: "right" }]}>{formatINR(data.unitRate)}</Text>
            <Text style={[styles.cell, { width: `${COL.amount}%`, textAlign: "right", borderRightWidth: 0 }]}>
              {formatINR(data.lineTotal)}
            </Text>
          </View>

          <View style={styles.footRow}>
            <Text style={[styles.footLabelCell, { width: `${100 - COL.amount}%` }]}>Total</Text>
            <Text style={[styles.footAmountCell, { width: `${COL.amount}%` }]}>{formatINR(data.lineTotal)}</Text>
          </View>
          <View style={styles.footRow}>
            <Text style={[styles.footLabelCell, { width: `${100 - COL.amount}%` }]}>GST ({data.gstPercent}%)</Text>
            <Text style={[styles.footAmountCell, { width: `${COL.amount}%` }]}>{formatINR(gstAmount)}</Text>
          </View>
          <View style={[styles.footRow, styles.grandTotalRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.footLabelCell, { width: `${100 - COL.amount}%` }]}>Grand Total</Text>
            <Text style={[styles.footAmountCell, { width: `${COL.amount}%` }]}>{formatINR(grandTotal)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Prices in INR. Valid for 30 days from the date of issue.</Text>
        </View>
      </Page>
    </Document>
  );
}
