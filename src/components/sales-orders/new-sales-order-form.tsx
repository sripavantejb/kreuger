"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { createSalesOrderManual } from "@/lib/actions-sales-orders";
import { PRIORITIES, type Priority } from "@/lib/priority";

export function NewSalesOrderForm({
  products,
  colours,
}: {
  products: { id: string; name: string; code: string }[];
  colours: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [colourId, setColourId] = useState(colours[0]?.id ?? "");
  const [quantity, setQuantity] = useState(100);
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [customerName, setCustomerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="max-w-lg">
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Product</Label>
          <Select value={productId} onValueChange={(v) => v && setProductId(v)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: string) => {
                  const p = products.find((x) => x.id === value);
                  return p ? `${p.name} (${p.code})` : "";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Colour</Label>
            <Select value={colourId} onValueChange={(v) => v && setColourId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => colours.find((c) => c.id === value)?.name ?? ""}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {colours.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => v && setPriority(v as Priority)}>
            <SelectTrigger className="w-full">
              <SelectValue>{() => priority}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Customer name</Label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          className="w-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                const id = await createSalesOrderManual({
                  productId,
                  quantity,
                  colourId,
                  priority,
                  customerName,
                });
                router.push(`/sales-orders/${id}`);
              } catch {
                setError("Could not create sales order.");
              }
            })
          }
        >
          {pending ? "Creating…" : "Create & notify coordinator"}
        </Button>
      </CardContent>
    </Card>
  );
}
