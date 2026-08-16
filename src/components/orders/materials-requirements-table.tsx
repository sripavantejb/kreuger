import { formatNumber } from "@/lib/format";
import type { MaterialRequirement } from "@/lib/materials";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function MaterialsRequirementsTable({
  lines,
  demoLabel = true,
}: {
  lines: MaterialRequirement[];
  demoLabel?: boolean;
}) {
  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">No materials defined for this product.</p>;
  }
  return (
    <div className="space-y-2">
      {demoLabel && (
        <p className="text-xs text-muted-foreground">
          Available quantities are demo master-data values — not live SAP inventory.
        </p>
      )}
      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Required</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Shortage</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.materialName}>
                <TableCell className="font-medium">{line.materialName}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(line.requiredQty)} {line.unit}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(line.availableQty)} {line.unit}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {line.shortage > 0 ? `${formatNumber(line.shortage)} ${line.unit}` : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      line.status === "SHORTAGE"
                        ? "bg-[var(--status-breach-bg)] text-[var(--status-breach)]"
                        : "bg-[var(--status-ok-bg)] text-[var(--status-ok)]"
                    }
                  >
                    {line.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
