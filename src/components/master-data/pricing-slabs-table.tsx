"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updatePricingSlab } from "@/lib/actions";
import { addPricingSlabRow, deletePricingSlabRow } from "@/lib/actions-master-data";
import { Plus, Trash2 } from "lucide-react";

type Slab = {
  id: string;
  minQuantity: number;
  maxQuantity: number | null;
  discountPercent: number;
};

function Row({ slab, readOnly }: { slab: Slab; readOnly: boolean }) {
  const [min, setMin] = useState(slab.minQuantity);
  const [max, setMax] = useState<number | null>(slab.maxQuantity);
  const [discount, setDiscount] = useState(slab.discountPercent);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const dirty = min !== slab.minQuantity || max !== slab.maxQuantity || discount !== slab.discountPercent;

  function save() {
    startTransition(async () => {
      await updatePricingSlab({ id: slab.id, minQuantity: min, maxQuantity: max, discountPercent: discount });
      toast.success("Pricing slab updated");
    });
  }

  return (
    <TableRow className="h-14">
      <TableCell>
        <Input
          type="number"
          min={0}
          value={min}
          disabled={readOnly}
          onChange={(e) => setMin(Number(e.target.value) || 0)}
          className="w-24"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          placeholder="No limit"
          value={max ?? ""}
          disabled={readOnly}
          onChange={(e) => setMax(e.target.value === "" ? null : Number(e.target.value))}
          className="w-28"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          max={100}
          value={discount}
          disabled={readOnly}
          onChange={(e) => setDiscount(Number(e.target.value) || 0)}
          className="w-24"
        />
      </TableCell>
      {!readOnly && (
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" onClick={save} disabled={!dirty || pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={deleting}
              onClick={() => startDelete(() => deletePricingSlabRow(slab.id))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

export function PricingSlabsTable({
  productId,
  slabs,
  readOnly = false,
}: {
  productId: string;
  slabs: Slab[];
  readOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Min quantity</TableHead>
              <TableHead>Max quantity</TableHead>
              <TableHead>Discount %</TableHead>
              {!readOnly && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {slabs
              .slice()
              .sort((a, b) => a.minQuantity - b.minQuantity)
              .map((s) => (
                <Row key={s.id} slab={s} readOnly={readOnly} />
              ))}
            {slabs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  No pricing slabs.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!readOnly && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => startTransition(() => addPricingSlabRow(productId))}
        >
          <Plus /> Add slab
        </Button>
      )}
    </div>
  );
}
