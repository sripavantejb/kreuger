import { PayrollClient } from "@/components/hrms/payroll-client";
import { HRMS_TODAY } from "@/lib/hrms";

export default function PayrollPage() {
  return <PayrollClient defaultMonth={HRMS_TODAY.slice(0, 7)} />;
}
