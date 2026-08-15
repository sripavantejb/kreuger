"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

type Product = { id: string; name: string; code: string; baseRate: number };

export function ProductBasicForm({ product, readOnly = false }: { product: Product; readOnly?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(product.name);
  const [code, setCode] = useState(product.code);
  const [baseRate, setBaseRate] = useState(product.baseRate);
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const dirty = name !== product.name || code !== product.code || baseRate !== product.baseRate;

  function save() {
    startTransition(async () => {
      await updateProduct({ id: product.id, name, code, baseRate });
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
