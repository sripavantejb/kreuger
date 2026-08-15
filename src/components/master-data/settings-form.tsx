"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateSettings } from "@/lib/actions";

type Settings = { procurementDays: number; rampDays: number; shiftHours: number };

export function SettingsForm({ settings, readOnly = false }: { settings: Settings; readOnly?: boolean }) {
  const [procurementDays, setProcurementDays] = useState(settings.procurementDays);
  const [rampDays, setRampDays] = useState(settings.rampDays);
  const [shiftHours, setShiftHours] = useState(settings.shiftHours);
  const [pending, startTransition] = useTransition();

  const dirty =
    procurementDays !== settings.procurementDays ||
    rampDays !== settings.rampDays ||
    shiftHours !== settings.shiftHours;

  function save() {
    startTransition(async () => {
      await updateSettings({ procurementDays, rampDays, shiftHours });
      toast.success("Settings updated");
    });
  }

  return (
    <div className="max-w-sm space-y-4 border border-border p-5">
      <div className="space-y-1.5">
        <Label htmlFor="procurementDays">Procurement lead time (days)</Label>
        <Input
          id="procurementDays"
          type="number"
          min={0}
          step={0.5}
          value={procurementDays}
          disabled={readOnly}
          onChange={(e) => setProcurementDays(Number(e.target.value) || 0)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rampDays">Ramp days (fill + drain)</Label>
        <Input
          id="rampDays"
          type="number"
          min={0}
          step={0.5}
          value={rampDays}
          disabled={readOnly}
          onChange={(e) => setRampDays(Number(e.target.value) || 0)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="shiftHours">Shift hours</Label>
        <Input
          id="shiftHours"
          type="number"
          min={1}
          step={0.5}
          value={shiftHours}
          disabled={readOnly}
          onChange={(e) => setShiftHours(Number(e.target.value) || 0)}
        />
      </div>
      {!readOnly && (
        <Button onClick={save} disabled={!dirty || pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      )}
    </div>
  );
}
