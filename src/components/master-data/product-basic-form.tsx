"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateProduct, deleteProduct } from "@/lib/actions-master-data";
import { Trash2 } from "lucide-react";

type Product = {
  id: string;
  name: string;
  code: string;
  baseRate: number;
  defaultLeadDays: number;
  description: string;
  hsnCode: string;
};

export function ProductBasicForm({ product, readOnly = false }: { product: Product; readOnly?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(product.name);
  const [code, setCode] = useState(product.code);
  const [baseRate, setBaseRate] = useState(product.baseRate);
  const [defaultLeadDays, setDefaultLeadDays] = useState(product.defaultLeadDays);
  const [description, setDescription] = useState(product.description);
  const [hsnCode, setHsnCode] = useState(product.hsnCode);
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const dirty =
    name !== product.name ||
    code !== product.code ||
    baseRate !== product.baseRate ||
    defaultLeadDays !== product.defaultLeadDays ||
    description !== product.description ||
    hsnCode !== product.hsnCode;

  function save() {
    startTransition(async () => {
      await updateProduct({ id: product.id, name, code, baseRate, defaultLeadDays, description, hsnCode });
      toast.success("Product updated");
    });
  }

  return (
    <div className="max-w-sm space-y-4 border border-border p-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} disabled={readOnly} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          value={code}
          disabled={readOnly}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="baseRate">Base rate (INR)</Label>
        <Input
          id="baseRate"
          type="number"
          min={0}
          value={baseRate}
          disabled={readOnly}
          onChange={(e) => setBaseRate(Number(e.target.value) || 0)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="defaultLeadDays">Default lead days</Label>
        <Input
          id="defaultLeadDays"
          type="number"
          min={1}
          value={defaultLeadDays}
          disabled={readOnly}
          onChange={(e) => setDefaultLeadDays(Math.max(1, Number(e.target.value) || 1))}
        />
        <p className="text-xs text-muted-foreground">
          Pre-fills the target timeline on a new order for this product.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hsnCode">HSN / SAC code</Label>
        <Input
          id="hsnCode"
          value={hsnCode}
          disabled={readOnly}
          placeholder="e.g. 9401"
          onChange={(e) => setHsnCode(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Shown on Quotation PDFs.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Specifications</Label>
        <Textarea
          id="description"
          rows={6}
          value={description}
          disabled={readOnly}
          placeholder={"One spec per line, e.g.\nMedium back mesh chair\nAdjustable lumbar support\nNylon base with 60mm castors"}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          One spec per line — rendered on the purchase order description.
        </p>
      </div>
      {!readOnly && (
        <div className="flex items-center justify-between pt-1">
          <Button onClick={save} disabled={!dirty || pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-3.5" /> Delete product
          </Button>
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {product.name}?</DialogTitle>
            <DialogDescription>
              Only possible if no quotations or orders reference this product. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() =>
                startDelete(async () => {
                  try {
                    await deleteProduct(product.id);
                    router.push("/master-data");
                  } catch {
                    setDeleteError("Could not delete — this product has quotations or orders against it.");
                  }
                })
              }
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
