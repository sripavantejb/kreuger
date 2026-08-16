import { prisma } from "@/lib/prisma";
import { getContactDirectory } from "@/lib/alerts";
import type { ContactDirectory } from "@/lib/notification-routing";
import { FINISHED_GOODS_STAGE, PROCUREMENT_STAGE } from "@/lib/stages";

export type AssignableHead = {
  key: string;
  label: string;
  name: string;
  email: string;
};

export async function listAssignableHeads(
  directory?: ContactDirectory
): Promise<AssignableHead[]> {
  const dir = directory ?? (await getContactDirectory());
  const out: AssignableHead[] = [];

  const push = (key: string, label: string, name: string, email: string) => {
    if (!email.trim()) return;
    if (out.some((h) => h.email.toLowerCase() === email.toLowerCase() && h.key === key)) return;
    out.push({ key, label, name: name || label, email: email.trim() });
  };

  push("primary", "Primary / Plant head", dir.primary.name, dir.primary.email);
  push("procurement", "Procurement head", dir.procurement.name, dir.procurement.email);
  push("dispatch", "Dispatch head", dir.dispatch.name, dir.dispatch.email);
  for (const d of dir.departments) {
    push(`dept:${d.name}`, `${d.name} head`, d.headName || `${d.name} Head`, d.headEmail);
  }
  return out;
}

export function headForStage(stageName: string, dir: ContactDirectory): AssignableHead | null {
  if (stageName === PROCUREMENT_STAGE) {
    if (!dir.procurement.email) return null;
    return {
      key: "procurement",
      label: "Procurement head",
      name: dir.procurement.name,
      email: dir.procurement.email,
    };
  }
  if (stageName === FINISHED_GOODS_STAGE) {
    if (!dir.dispatch.email) return null;
    return {
      key: "dispatch",
      label: "Dispatch head",
      name: dir.dispatch.name,
      email: dir.dispatch.email,
    };
  }
  const dept = dir.departments.find((d) => d.name === stageName);
  if (dept?.headEmail) {
    return {
      key: `dept:${dept.name}`,
      label: `${dept.name} head`,
      name: dept.headName || `${dept.name} Head`,
      email: dept.headEmail,
    };
  }
  if (dir.primary.email) {
    return {
      key: "primary",
      label: "Primary / Plant head",
      name: dir.primary.name,
      email: dir.primary.email,
    };
  }
  return null;
}

/** True if this session email matches a configured head contact. */
export async function sessionMatchesHeadEmail(email: string): Promise<boolean> {
  const heads = await listAssignableHeads();
  return heads.some((h) => h.email.toLowerCase() === email.toLowerCase());
}

export async function pendingApprovalsForEmail(email: string) {
  const heads = await listAssignableHeads();
  const mine = heads.filter((h) => h.email.toLowerCase() === email.toLowerCase());
  if (mine.length === 0) {
    // Still show all pending to HEAD role users who aren't in directory — handled by caller
    return prisma.stageChangeRequest.findMany({
      where: { status: "pending" },
      include: { oc: { include: { product: true, colour: true } } },
      orderBy: { requestedAt: "asc" },
    });
  }
  const stageKeys = new Set<string>();
  for (const h of mine) {
    if (h.key === "primary") {
      // primary can approve any pending
      return prisma.stageChangeRequest.findMany({
        where: { status: "pending" },
        include: { oc: { include: { product: true, colour: true } } },
        orderBy: { requestedAt: "asc" },
      });
    }
    if (h.key === "procurement") stageKeys.add(PROCUREMENT_STAGE);
    else if (h.key === "dispatch") stageKeys.add(FINISHED_GOODS_STAGE);
    else if (h.key.startsWith("dept:")) stageKeys.add(h.key.slice(5));
  }
  return prisma.stageChangeRequest.findMany({
    where: {
      status: "pending",
      fromStage: { in: [...stageKeys] },
    },
    include: { oc: { include: { product: true, colour: true } } },
    orderBy: { requestedAt: "asc" },
  });
}
