"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { biometricService } from "@/lib/hrms/biometric";
import type { SyncLog } from "@/lib/hrms/types";
import { formatDateTime } from "@/lib/format";
import { RefreshCw, PlugZap, ScrollText } from "lucide-react";

export function BiometricActions({ initialLogs }: { initialLogs: SyncLog[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [busy, setBusy] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  async function syncNow() {
    setBusy(true);
    try {
      const res = await biometricService.syncNow();
      toast.success(res.message);
      const next = await biometricService.getSyncLogs();
      setLogs([
        {
          id: `SL-${Date.now()}`,
          at: new Date().toISOString(),
          message: res.message,
          level: "success",
        },
        ...next,
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setBusy(true);
    try {
      const res = await biometricService.testConnection();
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={syncNow} disabled={busy}>
          <RefreshCw className="size-4" />
          Sync Now
        </Button>
        <Button variant="outline" onClick={testConnection} disabled={busy}>
          <PlugZap className="size-4" />
          Test Connection
        </Button>
        <Button variant="outline" onClick={() => setShowLogs((v) => !v)}>
          <ScrollText className="size-4" />
          View Sync Logs
        </Button>
      </div>

      {showLogs && (
        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(log.at)}
                    </TableCell>
                    <TableCell className="text-xs uppercase">{log.level}</TableCell>
                    <TableCell className="text-sm">{log.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
