"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateWeeklyOff, addHoliday, deleteHoliday } from "@/lib/actions-manpower";
import { formatDate } from "@/lib/format";
import { Trash2 } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Holiday = { id: string; date: Date; name: string };

export function WeeklyOffForm({
  weeklyOff,
  holidays,
  readOnly = false,
}: {
  weeklyOff: string[];
  holidays: Holiday[];
  readOnly?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(weeklyOff);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify([...selected].sort()) !== JSON.stringify([...weeklyOff].sort());

  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [addingHoliday, startAddingHoliday] = useTransition();

  function toggleDay(day: string) {
    setSelected((s) => (s.includes(day) ? s.filter((d) => d !== day) : [...s, day]));
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Weekly off (excluded from working-day counts)
        </h3>
        <Card className="max-w-xl">
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  disabled={readOnly}
                  onClick={() => toggleDay(day)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    selected.includes(day)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-secondary"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            {!readOnly && (
              <Button
                size="sm"
                disabled={!dirty || pending}
                onClick={() =>
                  startTransition(async () => {
                    await updateWeeklyOff(selected);
                    toast.success("Weekly off updated");
                  })
                }
              >
                {pending ? "Saving…" : "Save"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Holidays</h3>
        <Card className="max-w-xl">
          <CardContent className="space-y-3">
            {holidays.length === 0 && <p className="text-sm text-muted-foreground">No holidays recorded.</p>}
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
                <div>
                  <span className="font-medium">{formatDate(h.date)}</span>
                  <span className="ml-2 text-muted-foreground">{h.name}</span>
                </div>
                {!readOnly && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() =>
                      startTransition(async () => {
                        await deleteHoliday(h.id);
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
            {!readOnly && (
              <div className="flex items-end gap-2 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="holiday-date">Date</Label>
                  <Input id="holiday-date" type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="holiday-name">Name</Label>
                  <Input id="holiday-name" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} />
                </div>
                <Button
                  disabled={!holidayDate || !holidayName.trim() || addingHoliday}
                  onClick={() =>
                    startAddingHoliday(async () => {
                      await addHoliday({ date: new Date(holidayDate), name: holidayName });
                      setHolidayDate("");
                      setHolidayName("");
                      toast.success("Holiday added");
                    })
                  }
                >
                  Add
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
