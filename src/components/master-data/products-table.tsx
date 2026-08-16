"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createProduct } from "@/lib/actions-master-data";
import { formatINR } from "@/lib/format";
import { Plus, ChevronRight } from "lucide-react";

type Product = { id: string; name: string; code: string; baseRate: number; defaultLeadDays: number };

export function ProductsTable({ products, readOnly = false }: { products: Product[]; readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [baseRate, setBaseRate] = useState(1000);
  const [defaultLeadDays, setDefaultLeadDays] = useState(14);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      try {
        await createProduct({ name, code, baseRate, defaultLeadDays });
        toast.success(`${name} added`);
        setOpen(false);
        setName("");
        setCode("");
        setBaseRate(1000);
        setDefaultLeadDays(14);
      } catch {
        setError("Could not create the product. Check the code is unique.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Base rate</TableHead>
              <TableHead className="text-right">Default lead days</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id} className="h-14">
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.code}</TableCell>
                <TableCell className="text-right tabular-nums">{formatINR(p.baseRate)}</TableCell>
                <TableCell className="text-right tabular-nums">{p.defaultLeadDays} days</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/master-data/products/${p.id}`} />}
                  >
                    {readOnly ? "View" : "Edit"} <ChevronRight className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!readOnly && (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus /> Add product
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-code">Code</Label>
              <Input id="p-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-rate">Base rate (INR)</Label>
              <Input
                id="p-rate"
                type="number"
                min={0}
                value={baseRate}
                onChange={(e) => setBaseRate(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-lead">Default lead days</Label>
              <Input
                id="p-lead"
                type="number"
                min={1}
                value={defaultLeadDays}
                onChange={(e) => setDefaultLeadDays(Math.max(1, Number(e.target.value) || 1))}
              />
              <p className="text-xs text-muted-foreground">
                Pre-fills the target timeline when someone creates a new order for this product.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={pending || !name.trim() || !code.trim()}>
              {pending ? "Adding…" : "Add product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
