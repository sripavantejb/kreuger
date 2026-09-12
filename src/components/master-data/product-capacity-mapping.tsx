"use client";

import Link from "next/link";
import { DepartmentRatesForm } from "@/components/master-data/department-rates-form";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

type Department = {
  id: string;
  name: string;
  sequence: number;
  unitsPerWorkerPerDay: number;
  maxUnitsPerDay: number;
};

type Override = {
  departmentId: string;
  unitsPerWorkerPerDay: number;
  maxUnitsPerDay: number;
};

type Product = {
  id: string;
  name: string;
  code: string;
  departmentRates: Override[];
};

export function ProductCapacityMapping({
  products,
  departments,
  readOnly = false,
}: {
  products: Product[];
  departments: Department[];
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Product-based capacity mapping</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Set a different daily capacity per department for each product. Leave a stage on the
          global default unless this product truly bottlenecks differently.
        </p>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add a product first to map capacity.</p>
      ) : (
        <div className="space-y-6">
          {products.map((product) => (
            <div key={product.id} className="space-y-2 border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">Code {product.code}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/master-data/products/${product.id}`} />}
                >
                  Open product <ChevronRight className="size-3.5" />
                </Button>
              </div>
              <DepartmentRatesForm
                productId={product.id}
                departments={departments}
                overrides={product.departmentRates}
                readOnly={readOnly}
                showDescription={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
