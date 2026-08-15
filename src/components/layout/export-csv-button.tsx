"use client";

import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import { Download } from "lucide-react";

export function ExportCsvButton({
  filename,
  rows,
}: {
  filename: string;
  rows: Record<string, string | number>[];
}) {
  return (
    <Button variant="outline" onClick={() => downloadCsv(filename, rows)} disabled={rows.length === 0}>
      <Download /> Export CSV
    </Button>
  );
}
