"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateDepartmentContact, updateEscalationContacts } from "@/lib/actions-master-data";

type Department = { id: string; name: string; headName: string; headEmail: string };
type EscalationContacts = {
  plantHeadName: string;
  plantHeadEmail: string;
  procurementHeadName: string;
  procurementHeadEmail: string;
  dispatchHeadName: string;
  dispatchHeadEmail: string;
  salesCoordinatorName: string;
  salesCoordinatorEmail: string;
};

function DepartmentContactRow({ dept, readOnly }: { dept: Department; readOnly: boolean }) {
  const [name, setName] = useState(dept.headName);
  const [email, setEmail] = useState(dept.headEmail);
  const [pending, startTransition] = useTransition();
  const dirty = name !== dept.headName || email !== dept.headEmail;

  return (
    <div className="grid grid-cols-1 items-start gap-3 border-b border-border py-3 last:border-0 sm:grid-cols-[140px_1fr_1fr_auto] sm:items-center">
      <div className="text-sm font-medium">{dept.name}</div>
      <Input value={name} disabled={readOnly} onChange={(e) => setName(e.target.value)} placeholder="Contact name" />
      <Input
        value={email}
        disabled={readOnly}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
      />
      {!readOnly && (
        <Button
          size="sm"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={!dirty || pending}
          onClick={() =>
            startTransition(async () => {
              await updateDepartmentContact({ id: dept.id, headName: name, headEmail: email });
              toast.success(`${dept.name} contact updated`);
            })
          }
        >
          {pending ? "Saving…" : "Save"}
        </Button>
      )}
    </div>
  );
}

export function RecipientsForm({
  departments,
  escalation,
  readOnly = false,
}: {
  departments: Department[];
  escalation: EscalationContacts;
  readOnly?: boolean;
}) {
  const [form, setForm] = useState(escalation);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(form) !== JSON.stringify(escalation);

  function set<K extends keyof EscalationContacts>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Department heads (stage-entry alerts)</h3>
        <Card>
          <CardContent>
            {departments.map((d) => (
              <DepartmentContactRow key={d.id} dept={d} readOnly={readOnly} />
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Escalation &amp; sales contacts
        </h3>
        <Card className="max-w-xl">
          <CardContent className="space-y-4">
            {(
              [
                ["plantHeadName", "plantHeadEmail", "Plant head"],
                ["procurementHeadName", "procurementHeadEmail", "Procurement head"],
                ["dispatchHeadName", "dispatchHeadEmail", "Dispatch head"],
                ["salesCoordinatorName", "salesCoordinatorEmail", "Sales coordinator"],
              ] as const
            ).map(([nameKey, emailKey, label]) => (
              <div key={nameKey} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={nameKey}>{label} name</Label>
                  <Input
                    id={nameKey}
                    value={form[nameKey]}
                    disabled={readOnly}
                    onChange={(e) => set(nameKey, e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={emailKey}>{label} email</Label>
                  <Input
                    id={emailKey}
                    type="email"
                    value={form[emailKey]}
                    disabled={readOnly}
                    onChange={(e) => set(emailKey, e.target.value)}
                  />
                </div>
              </div>
            ))}
            {!readOnly && (
              <Button
                disabled={!dirty || pending}
                onClick={() =>
                  startTransition(async () => {
                    await updateEscalationContacts(form);
                    toast.success("Escalation contacts updated");
                  })
                }
              >
                {pending ? "Saving…" : "Save contacts"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
