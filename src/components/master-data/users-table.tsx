"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createUser, updateUserRole, resetUserPassword, deleteUser } from "@/lib/actions-master-data";
import { formatDate } from "@/lib/format";
import { ROLES, type Role } from "@/lib/roles";
import { Plus, KeyRound, Trash2 } from "lucide-react";

type UserRow = { id: string; name: string; email: string; role: string; createdAt: Date };

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", MANAGER: "Manager", VIEWER: "Viewer" };

function RoleSelect({ user, disabled }: { user: UserRow; disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={user.role}
      disabled={disabled || pending}
      onValueChange={(v) =>
        v &&
        startTransition(async () => {
          try {
            await updateUserRole({ id: user.id, role: v as Role });
            toast.success(`${user.name}'s role updated`);
          } catch {
            toast.error("Could not update role");
          }
        })
      }
    >
      <SelectTrigger className="w-32">
        <SelectValue>{(value: string) => ROLE_LABEL[value] ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABEL[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ResetPasswordButton({ user }: { user: UserRow }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button size="icon-sm" variant="ghost" title="Reset password" onClick={() => setOpen(true)}>
        <KeyRound className="size-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password for {user.name}</DialogTitle>
            <DialogDescription>They will need to use this new password on their next sign-in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || password.length < 8}
              onClick={() =>
                startTransition(async () => {
                  await resetUserPassword({ id: user.id, password });
                  toast.success("Password reset");
                  setOpen(false);
                  setPassword("");
                })
              }
            >
              {pending ? "Saving…" : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeleteUserButton({ user }: { user: UserRow }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button size="icon-sm" variant="ghost" title="Delete user" onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {user.name}?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await deleteUser(user.id);
                    toast.success("User deleted");
                    setOpen(false);
                  } catch {
                    toast.error("Could not delete this user");
                  }
                })
              }
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus /> Add user
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Name</Label>
              <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-password">Password</Label>
              <Input
                id="u-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-role">Role</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v as Role)}>
                <SelectTrigger id="u-role" className="w-full">
                  <SelectValue>{(value: string) => ROLE_LABEL[value] ?? value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !name.trim() || !email.trim() || password.length < 8}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  try {
                    await createUser({ name, email, password, role });
                    toast.success(`${name} added`);
                    setOpen(false);
                    setName("");
                    setEmail("");
                    setPassword("");
                    setRole("VIEWER");
                  } catch {
                    setError("Could not create user — email may already be in use.");
                  }
                })
              }
            >
              {pending ? "Adding…" : "Add user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function UsersTable({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  return (
    <div className="space-y-2">
      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="h-14">
                <TableCell className="font-medium">
                  {u.name}
                  {u.id === currentUserId && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <RoleSelect user={u} disabled={u.id === currentUserId} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ResetPasswordButton user={u} />
                    {u.id !== currentUserId && <DeleteUserButton user={u} />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <AddUserDialog />
    </div>
  );
}
