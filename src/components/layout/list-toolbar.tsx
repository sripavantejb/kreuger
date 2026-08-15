"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export type SortOption = { value: string; label: string };

export function ListToolbar({
  searchPlaceholder,
  filterOptions,
  filterLabel,
  sortOptions,
  children,
}: {
  searchPlaceholder: string;
  filterOptions?: SortOption[];
  filterLabel?: string;
  sortOptions?: SortOption[];
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const current = searchParams.get("q") ?? "";
      if (q !== current) updateParam("q", q);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-wrap items-center gap-2 pb-4">
      <div className="relative w-64">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-7"
        />
      </div>

      {filterOptions && (
        <Select
          value={searchParams.get("filter") ?? "all"}
          onValueChange={(v) => v && updateParam("filter", v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue>
              {(value: string) =>
                value === "all" ? filterLabel ?? "All" : filterOptions.find((o) => o.value === value)?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{filterLabel ?? "All"}</SelectItem>
            {filterOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {sortOptions && (
        <Select
          value={searchParams.get("sort") ?? sortOptions[0].value}
          onValueChange={(v) => v && updateParam("sort", v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue>
              {(value: string) => sortOptions.find((o) => o.value === value)?.label ?? sortOptions[0].label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}
