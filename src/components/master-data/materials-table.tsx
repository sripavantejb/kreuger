"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateMaterial } from "@/lib/actions";
import { addMaterialRow, deleteMaterialRow, updateMaterialName } from "@/lib/actions-master-data";
import { Plus, Trash2 } from "lucide-react";

type Material = {
  id: string;
  materialName: string;
  unit: string;
  quantityPerUnit: number;
  demoAvailableQty: number;
};

function Row({ material, readOnly }: { material: Material; readOnly: boolean }) {
  const [name, setName] = useState(material.materialName);
  const [unit, setUnit] = useState(material.unit);
  const [qty, setQty] = useState(material.quantityPerUnit);
  const [available, setAvailable] = useState(material.demoAvailableQty);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const dirty =
    qty !== material.quantityPerUnit ||
    name !== material.materialName ||
    unit !== material.unit ||
    available !== material.demoAvailableQty;

  function save() {
    startTransition(async () => {
      await Promise.all([
        updateMaterial({ id: material.id, quantityPerUnit: qty, demoAvailableQty: available }),
        updateMaterialName({ id: material.id, materialName: name, unit }),
      ]);
      toast.success(`${name} updated`);
    });
  }

  return (
    <TableRow className="h-14">
      <TableCell>
        <Input value={name} disabled={readOnly} onChange={(e) => setName(e.target.value)} className="w-36" />
      </TableCell>
      <TableCell>
        <Input value={unit} disabled={readOnly} onChange={(e) => setUnit(e.target.value)} className="w-20" />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          step={0.1}
          value={qty}
          disabled={readOnly}
          onChange={(e) => setQty(Number(e.target.value) || 0)}
          className="w-28"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          step={0.1}
          value={available}
          disabled={readOnly}
          onChange={(e) => setAvailable(Number(e.target.value) || 0)}
          className="w-28"
          title="Demo stock — not live SAP inventory"
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
              onClick={() => startDelete(() => deleteMaterialRow(material.id))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

export function MaterialsTable({
  productId,
  materials,
  readOnly = false,
}: {
  productId: string;
  materials: Material[];
  readOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Demo available qty is sample on-hand stock for readiness checks — not live SAP inventory.
      </p>
      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Qty per unit</TableHead>
              <TableHead>Demo available</TableHead>
              {!readOnly && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((m) => (
              <Row key={m.id} material={m} readOnly={readOnly} />
            ))}
            {materials.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  No materials yet.
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
          onClick={() => startTransition(() => addMaterialRow(productId))}
        >
          <Plus className="size-3.5" /> Add material
        </Button>
      )}
    </div>
  );
}
