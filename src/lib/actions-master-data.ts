"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireRole, hashPassword, type Role } from "./auth";

// ---- Products -------------------------------------------------------

const DEFAULT_SLABS = [
  { minQuantity: 1, maxQuantity: 24, discountPercent: 0 },
  { minQuantity: 25, maxQuantity: 99, discountPercent: 5 },
  { minQuantity: 100, maxQuantity: 249, discountPercent: 10 },
  { minQuantity: 250, maxQuantity: 499, discountPercent: 15 },
  { minQuantity: 500, maxQuantity: null, discountPercent: 20 },
];

export async function createProduct(input: {
  name: string;
  code: string;
  baseRate: number;
  defaultLeadDays: number;
}) {
  await requireRole("ADMIN");
  const colours = await prisma.colour.findMany();

  const product = await prisma.product.create({
    data: {
      name: input.name,
      code: input.code.toUpperCase(),
      baseRate: input.baseRate,
      defaultLeadDays: input.defaultLeadDays,
    },
  });

  await Promise.all([
    ...DEFAULT_SLABS.map((s) => prisma.pricingSlab.create({ data: { productId: product.id, ...s } })),
    ...colours.map((c) =>
      prisma.productColourImage.create({
        data: { productId: product.id, colourId: c.id, imagePath: "" },
      })
    ),
  ]);

  revalidatePath("/master-data");
  return product.id;
}

export async function updateProduct(input: {
  id: string;
  name: string;
  code: string;
  baseRate: number;
  defaultLeadDays: number;
  description: string;
  hsnCode: string;
}) {
  await requireRole("ADMIN");
  await prisma.product.update({
    where: { id: input.id },
    data: {
      name: input.name,
      code: input.code.toUpperCase(),
      baseRate: input.baseRate,
      defaultLeadDays: input.defaultLeadDays,
      description: input.description,
      hsnCode: input.hsnCode.trim(),
    },
  });
  revalidatePath("/master-data");
  revalidatePath(`/master-data/products/${input.id}`);
  revalidatePath("/quotations");
}

export async function deleteProduct(id: string) {
  await requireRole("ADMIN");
  const [quotationCount, orderCount] = await Promise.all([
    prisma.quotation.count({ where: { productId: id } }),
    prisma.orderConfirmation.count({ where: { productId: id } }),
  ]);
  if (quotationCount > 0 || orderCount > 0) {
    throw new Error("Cannot delete a product that has quotations or orders against it.");
  }
  await prisma.$transaction([
    prisma.pricingSlab.deleteMany({ where: { productId: id } }),
    prisma.productMaterial.deleteMany({ where: { productId: id } }),
    prisma.productColourImage.deleteMany({ where: { productId: id } }),
    prisma.productDepartmentRate.deleteMany({ where: { productId: id } }),
    prisma.product.delete({ where: { id } }),
  ]);
  revalidatePath("/master-data");
}

// ---- Per-product department overrides --------------------------------
// Wired into planning via src/lib/product-department-rates.ts, applied in
// createOrder, saveManpowerPlan and the three client-side live-recompute
// forms — see the callers of applyProductDepartmentRates.

export async function setProductDepartmentRate(input: {
  productId: string;
  departmentId: string;
  unitsPerWorkerPerDay: number;
  maxUnitsPerDay: number;
}) {
  await requireRole("ADMIN");
  await prisma.productDepartmentRate.upsert({
    where: { productId_departmentId: { productId: input.productId, departmentId: input.departmentId } },
    create: input,
    update: {
      unitsPerWorkerPerDay: input.unitsPerWorkerPerDay,
      maxUnitsPerDay: input.maxUnitsPerDay,
    },
  });
  revalidatePath("/master-data");
  revalidatePath("/orders");
  revalidatePath("/manpower");
}

export async function clearProductDepartmentRate(input: { productId: string; departmentId: string }) {
  await requireRole("ADMIN");
  await prisma.productDepartmentRate
    .delete({
      where: { productId_departmentId: { productId: input.productId, departmentId: input.departmentId } },
    })
    .catch(() => {
      // Already using the default — nothing to clear.
    });
  revalidatePath("/master-data");
  revalidatePath("/orders");
  revalidatePath("/manpower");
}

// ---- Per-colour product photos --------------------------------------
// Stored as a data: URI directly on ProductColourImage.imagePath — no
// external file storage, so this works in any hosting environment.

const MAX_IMAGE_DATA_URI_LENGTH = 4_000_000; // ~3MB raw before base64 overhead

export async function updateProductColourImage(input: {
  productId: string;
  colourId: string;
  imageDataUrl: string;
}) {
  await requireRole("ADMIN");
  if (!input.imageDataUrl.startsWith("data:image/") || input.imageDataUrl.startsWith("data:image/svg+xml")) {
    throw new Error("Expected a PNG, JPEG or WebP image file.");
  }
  if (input.imageDataUrl.length > MAX_IMAGE_DATA_URI_LENGTH) {
    throw new Error("Image is too large — please use a file under 3MB.");
  }
  await prisma.productColourImage.upsert({
    where: { productId_colourId: { productId: input.productId, colourId: input.colourId } },
    create: { productId: input.productId, colourId: input.colourId, imagePath: input.imageDataUrl },
    update: { imagePath: input.imageDataUrl },
  });
  revalidatePath("/master-data");
  revalidatePath("/quotations");
}

export async function clearProductColourImage(input: { productId: string; colourId: string }) {
  await requireRole("ADMIN");
  await prisma.productColourImage.upsert({
    where: { productId_colourId: { productId: input.productId, colourId: input.colourId } },
    create: { productId: input.productId, colourId: input.colourId, imagePath: "" },
    update: { imagePath: "" },
  });
  revalidatePath("/master-data");
  revalidatePath("/quotations");
}

export async function addPricingSlabRow(productId: string) {
  await requireRole("ADMIN");
  await prisma.pricingSlab.create({
    data: { productId, minQuantity: 0, maxQuantity: null, discountPercent: 0 },
  });
  revalidatePath("/master-data");
}

export async function deletePricingSlabRow(id: string) {
  await requireRole("ADMIN");
  await prisma.pricingSlab.delete({ where: { id } });
  revalidatePath("/master-data");
}

export async function addMaterialRow(productId: string) {
  await requireRole("ADMIN");
  await prisma.productMaterial.create({
    data: { productId, materialName: "New material", unit: "kg", quantityPerUnit: 0 },
  });
  revalidatePath("/master-data");
}

export async function deleteMaterialRow(id: string) {
  await requireRole("ADMIN");
  await prisma.productMaterial.delete({ where: { id } });
  revalidatePath("/master-data");
}

export async function updateMaterialName(input: { id: string; materialName: string; unit: string }) {
  await requireRole("ADMIN");
  await prisma.productMaterial.update({
    where: { id: input.id },
    data: { materialName: input.materialName, unit: input.unit },
  });
  revalidatePath("/master-data");
}

// ---- Recipients / contacts -------------------------------------------

export async function updateDepartmentContact(input: { id: string; headName: string; headEmail: string }) {
  await requireRole("ADMIN");
  await prisma.department.update({
    where: { id: input.id },
    data: { headName: input.headName, headEmail: input.headEmail },
  });
  revalidatePath("/master-data");
}

export async function updateEscalationContacts(input: {
  plantHeadName: string;
  plantHeadEmail: string;
  procurementHeadName: string;
  procurementHeadEmail: string;
  dispatchHeadName: string;
  dispatchHeadEmail: string;
  salesCoordinatorName: string;
  salesCoordinatorEmail: string;
}) {
  await requireRole("ADMIN");
  await prisma.settings.update({ where: { id: 1 }, data: input });
  revalidatePath("/master-data");
}

// ---- Users -------------------------------------------------------------

export async function createUser(input: { name: string; email: string; password: string; role: Role }) {
  await requireRole("ADMIN");
  await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.trim().toLowerCase(),
      passwordHash: await hashPassword(input.password),
      role: input.role,
    },
  });
  revalidatePath("/master-data");
}

export async function updateUserRole(input: { id: string; role: Role }) {
  const session = await requireRole("ADMIN");
  if (session.sub === input.id) throw new Error("You cannot change your own role.");
  await prisma.user.update({ where: { id: input.id }, data: { role: input.role } });
  revalidatePath("/master-data");
}

export async function resetUserPassword(input: { id: string; password: string }) {
  await requireRole("ADMIN");
  await prisma.user.update({
    where: { id: input.id },
    data: { passwordHash: await hashPassword(input.password) },
  });
  revalidatePath("/master-data");
}

export async function deleteUser(id: string) {
  const session = await requireRole("ADMIN");
  if (session.sub === id) throw new Error("You cannot delete your own account.");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/master-data");
}
