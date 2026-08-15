"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateMaterial } from "@/lib/actions";
import { addMaterialRow, deleteMaterialRow, updateMaterialName } from "@/lib/actions-master-data";
import { Plus, Trash2 } from "lucide-react";

type Material = { id: string; materialName: string; unit: string; quantityPerUnit: number };

function Row({ material, readOnly }: { material: Material; readOnly: boolean }) {
  const [name, setName] = useState(material.materialName);
  const [unit, setUnit] = useState(material.unit);
  const [qty, setQty] = useState(material.quantityPerUnit);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const dirty = qty !== material.quantityPerUnit || name !== material.materialName || unit !== material.unit;

  function save() {
    startTransition(async () => {
      await Promise.all([
        updateMaterial({ id: material.id, quantityPerUnit: qty }),
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
      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Quantity per unit</TableHead>
              {!readOnly && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((m) => (
              <Row key={m.id} material={m} readOnly={readOnly} />
            ))}
            {materials.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  No materials.
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
          <Plus /> Add material
        </Button>
      )}
    </div>
  );
}
