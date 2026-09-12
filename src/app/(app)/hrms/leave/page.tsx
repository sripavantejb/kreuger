import { PageHeader } from "@/components/layout/page-header";
import { PageBody } from "@/components/layout/page-body";
import { LeaveTable } from "@/components/hrms/leave-table";
import { LEAVE_REQUESTS, getEmployee } from "@/lib/hrms";

export default function LeavePage() {
  const rows = LEAVE_REQUESTS.map((l) => {
    const emp = getEmployee(l.employeeId);
    return {
      ...l,
      employeeName: emp?.name ?? l.employeeId,
      department: emp?.department ?? "—",
    };
  }).sort((a, b) => b.appliedOn.localeCompare(a.appliedOn));

  const pending = rows.filter((r) => r.status === "Pending").length;

  return (
    <div>
      <PageHeader
        title="Leave Management"
        description={`${pending} pending request${pending === 1 ? "" : "s"} · approve or reject from the table.`}
      />
      <PageBody>
        <LeaveTable initialRows={rows} />
      </PageBody>
    </div>
  );
}
