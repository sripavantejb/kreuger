"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { PayrollLine } from "@/lib/hrms/types";
import { formatINR } from "@/lib/format";

export function PayslipDownloadButton({
  company,
  month,
  line,
  designation,
}: {
  company: string;
  month: string;
  line: PayrollLine;
  designation: string;
}) {
  function download() {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Payslip ${line.employeeCode} ${month}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:32px auto;color:#222}
  h1{font-size:20px;margin:0} h2{font-size:14px;color:#717171;font-weight:500;margin:4px 0 20px}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th,td{text-align:left;padding:8px;border-bottom:1px solid #eee;font-size:13px}
  th{color:#717171;font-weight:500} .r{text-align:right} .tot{font-weight:700}
</style></head><body>
  <h1>${company}</h1>
  <h2>Payslip · ${month}</h2>
  <p><strong>${line.employeeName}</strong> (${line.employeeCode})<br/>
  ${line.department} · ${designation}<br/>Pay Period: ${month}</p>
  <table>
    <tr><th>Earnings</th><th class="r">Amount</th></tr>
    <tr><td>Basic</td><td class="r">${formatINR(line.basic)}</td></tr>
    <tr><td>HRA</td><td class="r">${formatINR(line.hra)}</td></tr>
    <tr><td>Allowances</td><td class="r">${formatINR(line.allowances)}</td></tr>
    <tr><td>Overtime</td><td class="r">${formatINR(line.overtimePay)}</td></tr>
    <tr><td>Bonus</td><td class="r">${formatINR(line.bonus)}</td></tr>
    <tr class="tot"><td>Gross Salary</td><td class="r">${formatINR(line.gross)}</td></tr>
  </table>
  <table>
    <tr><th>Deductions</th><th class="r">Amount</th></tr>
    <tr><td>PF</td><td class="r">${formatINR(line.pf)}</td></tr>
    <tr><td>Professional Tax</td><td class="r">${formatINR(line.professionalTax)}</td></tr>
    <tr><td>TDS</td><td class="r">${formatINR(line.tds)}</td></tr>
    <tr><td>LOP</td><td class="r">${formatINR(line.lopDeduction)}</td></tr>
    <tr><td>Other Deductions</td><td class="r">${formatINR(line.otherDeductions)}</td></tr>
    <tr class="tot"><td>Total Deductions</td><td class="r">${formatINR(line.totalDeductions)}</td></tr>
  </table>
  <p style="margin-top:24px;font-size:18px"><strong>Net Salary: ${formatINR(line.net)}</strong></p>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payslip-${line.employeeCode}-${month}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button size="sm" variant="outline" onClick={download}>
      <Download className="size-3.5" />
      Download Payslip
    </Button>
  );
}
