import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepartmentsTable } from "@/components/master-data/departments-table";
import { ProductsTable } from "@/components/master-data/products-table";
import { RecipientsForm } from "@/components/master-data/recipients-form";
import { SettingsForm } from "@/components/master-data/settings-form";
import { UsersTable } from "@/components/master-data/users-table";

export const dynamic = "force-dynamic";

export default async function MasterDataPage() {
  const session = await getSession();
  const isAdmin = session ? roleAtLeast(session.role, "ADMIN") : false;

  const [departments, products, settings, users] = await Promise.all([
    prisma.department.findMany({ orderBy: { sequence: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    isAdmin ? prisma.user.findMany({ orderBy: { createdAt: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        title="Master data"
        description="This drives every calculation in the app. Nothing here is a hardcoded constant."
      />
      <div className="px-8 py-6">
        <Tabs defaultValue="departments">
          <TabsList>
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
                plantHeadName: settings.plantHeadName,
                plantHeadEmail: settings.plantHeadEmail,
                procurementHeadName: settings.procurementHeadName,
                procurementHeadEmail: settings.procurementHeadEmail,
                dispatchHeadName: settings.dispatchHeadName,
                dispatchHeadEmail: settings.dispatchHeadEmail,
              }}
              readOnly={!isAdmin}
            />
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            <SettingsForm settings={settings} readOnly={!isAdmin} />
          </TabsContent>
          {isAdmin && session && (
            <TabsContent value="users" className="mt-4">
              <UsersTable users={users} currentUserId={session.sub} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
