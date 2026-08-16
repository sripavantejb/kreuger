import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody } from "@/components/layout/page-body";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepartmentsTable } from "@/components/master-data/departments-table";
import { ProductsTable } from "@/components/master-data/products-table";
import { RecipientsForm } from "@/components/master-data/recipients-form";
import { SettingsForm } from "@/components/master-data/settings-form";
import { WeeklyOffForm } from "@/components/master-data/weekly-off-form";
import { UsersTable } from "@/components/master-data/users-table";

export const dynamic = "force-dynamic";

export default async function MasterDataPage() {
  const session = await getSession();
  const isAdmin = session ? roleAtLeast(session.role, "ADMIN") : false;

  const [departments, products, settings, users, holidays] = await Promise.all([
    prisma.department.findMany({ orderBy: { sequence: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    isAdmin ? prisma.user.findMany({ orderBy: { createdAt: "asc" } }) : Promise.resolve([]),
    prisma.holiday.findMany({ orderBy: { date: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Master data"
        description="This drives every calculation in the app. Nothing here is a hardcoded constant."
        help={{
          content: (
            <>
              <p>Everything on this page is a direct input to the capacity, manpower and pricing calculations elsewhere in the app — change a value here and every future order, quotation and manpower plan uses it.</p>
              <ul>
                <li><strong>Departments</strong> — headcount, units/worker/day and the daily ceiling for each production stage, in the order goods pass through them.</li>
                <li><strong>Products</strong> — base rate, default lead time, materials required per unit, and optional per-department rate overrides for that product alone (open a product to set these).</li>
                <li><strong>Weekly off &amp; holidays</strong> — which days don&apos;t count as working days for the manpower calculator.</li>
                <li><strong>Recipients</strong> — who alert emails are addressed to for each department and escalation.</li>
                <li><strong>Users</strong> — accounts and roles (Admin, Manager, Viewer) — Admin only.</li>
              </ul>
              <p>Most fields here are edit-only for Admins; Managers and Viewers see them read-only.</p>
            </>
          ),
        }}
      />
      <PageBody>
        <Tabs defaultValue="departments">
          <TabsList className="h-auto w-full max-w-full flex-wrap justify-start overflow-x-auto bg-card p-1 ring-1 ring-border">
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="recipients">Recipients</TabsTrigger>
            <TabsTrigger value="settings">Timeline settings</TabsTrigger>
            {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          </TabsList>
          <TabsContent value="departments" className="mt-4">
            <DepartmentsTable departments={departments} readOnly={!isAdmin} />
          </TabsContent>
          <TabsContent value="products" className="mt-4">
            <ProductsTable products={products} readOnly={!isAdmin} />
          </TabsContent>
          <TabsContent value="recipients" className="mt-4">
            <RecipientsForm
              departments={departments}
              escalation={{
                primaryHeadName: settings.primaryHeadName,
                primaryHeadEmail: settings.primaryHeadEmail,
                secondaryHeadName: settings.secondaryHeadName,
                secondaryHeadEmail: settings.secondaryHeadEmail,
                plantHeadName: settings.plantHeadName,
                plantHeadEmail: settings.plantHeadEmail,
                procurementHeadName: settings.procurementHeadName,
                procurementHeadEmail: settings.procurementHeadEmail,
                dispatchHeadName: settings.dispatchHeadName,
                dispatchHeadEmail: settings.dispatchHeadEmail,
                salesCoordinatorName: settings.salesCoordinatorName,
                salesCoordinatorEmail: settings.salesCoordinatorEmail,
              }}
              readOnly={!isAdmin}
            />
          </TabsContent>
          <TabsContent value="settings" className="mt-4 space-y-8">
            <SettingsForm settings={settings} readOnly={!isAdmin} />
            <WeeklyOffForm weeklyOff={settings.weeklyOff} holidays={holidays} readOnly={!isAdmin} />
          </TabsContent>
          {isAdmin && session && (
            <TabsContent value="users" className="mt-4">
              <UsersTable users={users} currentUserId={session.sub} />
            </TabsContent>
          )}
        </Tabs>
      </PageBody>
    </div>
  );
}
