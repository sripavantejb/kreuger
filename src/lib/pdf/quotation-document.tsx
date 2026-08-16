import path from "node:path";
import { Document, Page, View, Text, StyleSheet, Svg, Rect, Line, Image } from "@react-pdf/renderer";

const LOGO_SRC = path.join(process.cwd(), "public/logo.png");

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#1c1917", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", borderBottom: 1, borderColor: "#e7e5e4", paddingBottom: 16, marginBottom: 24 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 40, height: 40 },
  eyebrow: { fontSize: 8, color: "#78716c", textTransform: "uppercase", letterSpacing: 1 },
  quotationNumber: { fontSize: 18, fontWeight: 700, marginTop: 4 },
  headerRight: { textAlign: "right", color: "#78716c" },
  companyName: { color: "#1c1917", fontWeight: 700 },
  body: { flexDirection: "row", gap: 24 },
  imageBox: { width: 180, height: 180, borderWidth: 1, borderColor: "#e7e5e4", backgroundColor: "#fafaf9", alignItems: "center", justifyContent: "center" },
  details: { flex: 1, justifyContent: "space-between" },
  productName: { fontSize: 14, fontWeight: 700 },
  productCode: { color: "#78716c", marginTop: 2 },
  description: { marginTop: 8, color: "#44403c", maxWidth: 320 },
  colourRow: { flexDirection: "row", marginTop: 10, gap: 4 },
  colourLabel: { color: "#78716c" },
  table: { marginTop: 24, borderTop: 1, borderColor: "#e7e5e4" },
  tableHeaderRow: { flexDirection: "row", borderBottom: 1, borderColor: "#e7e5e4", paddingVertical: 6, color: "#78716c" },
  tableRow: { flexDirection: "row", paddingVertical: 10 },
  colQty: { flex: 1 },
  colRate: { flex: 1 },
  colTotal: { flex: 1, textAlign: "right" },
  footer: { marginTop: 32, paddingTop: 12, borderTop: 1, borderColor: "#e7e5e4", color: "#78716c", fontSize: 8 },
});

function formatINR(n: number) {
  return `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
}
function formatNumber(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}
function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function ChairGlyph({ hex, outline }: { hex: string; outline: string }) {
  return (
    <Svg width={120} height={120} viewBox="0 0 400 400">
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
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: hex,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: 700 }}>{initials(name)}</Text>
    </View>
  );
}

export type QuotationPdfData = {
  quotationNumber: string;
  date: Date;
  productName: string;
  productCode: string;
  description: string;
  colourName: string;
  colourHex: string;
  colourOutlineHex: string;
  quantity: number;
  unitRate: number;
  lineTotal: number;
};

export function QuotationDocument({ data }: { data: QuotationPdfData }) {
  return (
    <Document title={data.quotationNumber}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Image src={LOGO_SRC} style={styles.logo} />
            <View>
              <Text style={styles.eyebrow}>Quotation</Text>
              <Text style={styles.quotationNumber}>{data.quotationNumber}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>Kreuger Furniture Works</Text>
            <Text>{formatDate(data.date)}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.imageBox}>
            {data.productCode === "MASTRO" ? (
              <ChairGlyph hex={data.colourHex} outline={data.colourOutlineHex} />
            ) : (
              <SwatchGlyph hex={data.colourHex} name={data.productName} />
            )}
          </View>
          <View style={styles.details}>
            <View>
              <Text style={styles.productName}>{data.productName}</Text>
              <Text style={styles.productCode}>Code: {data.productCode}</Text>
              <Text style={styles.description}>{data.description}</Text>
              <View style={styles.colourRow}>
                <Text style={styles.colourLabel}>Colour:</Text>
                <Text>{data.colourName}</Text>
              </View>
            </View>

            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={styles.colQty}>Quantity</Text>
                <Text style={styles.colRate}>Unit rate</Text>
                <Text style={styles.colTotal}>Line total</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.colQty}>{formatNumber(data.quantity)} units</Text>
                <Text style={styles.colRate}>{formatINR(data.unitRate)}</Text>
                <Text style={[styles.colTotal, { fontWeight: 700 }]}>{formatINR(data.lineTotal)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Prices in INR, exclusive of taxes. Valid for 30 days from the date of issue.</Text>
        </View>
      </Page>
    </Document>
  );
}
