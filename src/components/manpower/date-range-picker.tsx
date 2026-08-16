"use client";

import { useEffect, useState } from "react";
import { addDays, addMonths, addWeeks, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { calendarDaysBetween, workingDaysBetween, type WorkingDayConfig } from "@/lib/working-days";

export type DateRange = { from: Date; to: Date };

export function DateRangePicker({
  value,
  onChange,
  workingDayConfig,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  workingDayConfig: WorkingDayConfig;
}) {
  const calendarDays = calendarDaysBetween(value.from, value.to);
  const workingDays = workingDaysBetween(value.from, value.to, workingDayConfig);
  const [months, setMonths] = useState(1);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setMonths(mq.matches ? 2 : 1);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function applyPreset(preset: "1w" | "2w" | "1m") {
    const to =
      preset === "1w" ? addWeeks(value.from, 1) : preset === "2w" ? addWeeks(value.from, 2) : addMonths(value.from, 1);
    onChange({ from: value.from, to: addDays(to, -1) });
  }

  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" className="w-full justify-start font-normal" />
          }
        >
          <CalendarIcon className="size-4" />
          {format(value.from, "d MMM yyyy")} – {format(value.to, "d MMM yyyy")}
        </PopoverTrigger>
        <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0">
          <Calendar
            mode="range"
            selected={{ from: value.from, to: value.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) onChange({ from: range.from, to: range.to });
              else if (range?.from) onChange({ from: range.from, to: range.from });
            }}
            numberOfMonths={months}
          />
        </PopoverContent>
      </Popover>

      <div className="text-xs text-muted-foreground">
        {calendarDays} calendar days · {workingDays} working days ·{" "}
        {workingDayConfig.weeklyOff.join(", ") || "no"} excluded
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" onClick={() => applyPreset("1w")}>
          +1 week
        </Button>
        <Button size="sm" variant="outline" onClick={() => applyPreset("2w")}>
          +2 weeks
        </Button>
        <Button size="sm" variant="outline" onClick={() => applyPreset("1m")}>
          +1 month
        </Button>
      </div>
    </div>
  );
}
