import { PageHeader } from "@/components/layout/page-header";
import { PageBody, SectionTitle } from "@/components/layout/page-body";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BiometricActions } from "@/components/hrms/biometric-actions";
import { biometricService } from "@/lib/hrms/biometric";
import { BIOMETRIC_PUNCHES, EMPLOYEES, getEmployee } from "@/lib/hrms";
import { formatDateTime } from "@/lib/format";

export default async function BiometricPage() {
  const device = await biometricService.getDevice();
  const logs = await biometricService.getSyncLogs();
  const recentPunches = [...BIOMETRIC_PUNCHES]
    .sort((a, b) => b.punchedAt.localeCompare(a.punchedAt))
    .slice(0, 20);

  return (
    <div>
      <PageHeader
        title="Biometric / eSSL"
        description="Device status and mock punch feed. Swap MockBiometricService for a live eSSL client later."
      />
      <PageBody className="space-y-6">
        <div className="rounded-xl border border-[var(--status-warn)]/30 bg-[var(--status-warn-bg)] px-4 py-3 text-sm text-foreground">
          Demo Mode — Attendance is being generated from mock biometric data.
        </div>

        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Device Name" value={device.name} />
            <Field label="Device ID" value={device.deviceId} />
            <Field label="Location" value={device.location} />
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</div>
              <div className="mt-1">
                <Badge variant="secondary">{device.status}</Badge>
              </div>
            </div>
            <Field label="Last Sync" value={device.lastSync} />
            <Field label="Mode" value={device.mode} />
          </CardContent>
        </Card>

        <BiometricActions initialLogs={logs} />

        <div>
          <SectionTitle>Recent Biometric Punches</SectionTitle>
          <Card className="py-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Punched At</TableHead>
                    <TableHead>Device</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPunches.map((p) => {
                    const emp = getEmployee(p.employeeId);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{emp?.name ?? p.employeeId}</div>
                          <div className="text-xs text-muted-foreground">{emp?.employeeId}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.type}</Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(p.punchedAt)}</TableCell>
                        <TableCell className="tabular-nums">{p.deviceId}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing 20 of {BIOMETRIC_PUNCHES.length} punches across {EMPLOYEES.length} employees.
          </p>
        </div>
      </PageBody>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
