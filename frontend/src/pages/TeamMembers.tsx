import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Trash2, UserCheck, UserMinus } from "lucide-react";
import { api } from "../api/client";
import { Cadence, TeamMember } from "../types";
import { MemberAvatar } from "../components/MemberAvatar";
import { PageLoading } from "../components/PageLoading";
import { PageTitle } from "../components/Typography";
import { EditMemberDialog } from "../components/EditMemberDialog";
import { IconActionButton } from "../components/IconActionButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const emptyForm = { name: "", role: "", email: "", cadence: "FORTNIGHTLY" as Cadence };

const CADENCE_LABELS: Record<Cadence, string> = {
  WEEKLY: "Weekly",
  FORTNIGHTLY: "Fortnightly",
  MONTHLY: "Monthly",
};

export default function TeamMembers() {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TeamMember | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  function load() {
    api.get<TeamMember[]>("/api/team-members").then(setMembers);
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/api/team-members", {
        name: form.name.trim(),
        role: form.role.trim() || undefined,
        email: form.email.trim() || undefined,
        cadence: form.cadence,
      });
      toast.success(`Added ${form.name.trim()}`);
      setForm(emptyForm);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(m: TeamMember) {
    await api.patch(`/api/team-members/${m.id}`, { active: !m.active });
    toast.success(m.active ? `${m.name} deactivated` : `${m.name} reactivated`);
    load();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await api.delete(`/api/team-members/${pendingDelete.id}`);
    toast.success(`${pendingDelete.name} deleted`);
    setPendingDelete(null);
    load();
  }

  return (
    <div className="animate-in fade-in duration-300">
      <PageTitle>Team members</PageTitle>

      <form
        className="mb-7 flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card p-4"
        onSubmit={handleSubmit}
      >
        <Input
          className="min-w-0 flex-[2]"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          className="min-w-0 flex-[1.5]"
          placeholder="Role (optional)"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        />
        <Input
          className="min-w-0 flex-[2]"
          placeholder="Email (optional)"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Select
          value={form.cadence}
          onValueChange={(value) => setForm({ ...form, cadence: value as Cadence })}
        >
          <SelectTrigger className="w-[140px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WEEKLY">Weekly</SelectItem>
            <SelectItem value="FORTNIGHTLY">Fortnightly</SelectItem>
            <SelectItem value="MONTHLY">Monthly</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={submitting} className="shrink-0">
          Add
        </Button>
      </form>

      {!members ? (
        <PageLoading />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead>Next due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} className={m.deletedAt ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar id={m.id} name={m.name} size="sm" />
                      <div>
                        {m.deletedAt ? (
                          <span className="text-[0.9rem] font-semibold text-foreground">{m.name}</span>
                        ) : (
                          <Link
                            to={`/team/${m.id}`}
                            className="text-[0.9rem] font-semibold text-foreground transition-colors hover:text-primary"
                          >
                            {m.name}
                          </Link>
                        )}
                        <div className="text-[0.78rem] text-[var(--muted-foreground-2)]">
                          {m.role || "—"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{CADENCE_LABELS[m.cadence]}</TableCell>
                  <TableCell>{new Date(m.nextDueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={m.deletedAt ? "destructive" : m.active ? "success" : "secondary"}>
                      {m.deletedAt ? "Deleted" : m.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.deletedAt ? (
                      <div className="text-right text-[0.78rem] text-muted-foreground">
                        {m.deletedBy && <>by {m.deletedBy}</>}
                        {m.deletedBy && " · "}
                        {new Date(m.deletedAt).toLocaleDateString()}
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <IconActionButton
                          label="Edit"
                          icon={<Pencil />}
                          onClick={() => setEditingMember(m)}
                        />
                        <IconActionButton
                          label={m.active ? "Deactivate" : "Reactivate"}
                          icon={m.active ? <UserMinus /> : <UserCheck />}
                          variant="primary"
                          onClick={() => toggleActive(m)}
                        />
                        <IconActionButton
                          label="Delete"
                          icon={<Trash2 />}
                          variant="danger"
                          onClick={() => setPendingDelete(m)}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This hides {pendingDelete?.name} from your active team, dashboard, and review. Their
              check-in history is kept and they'll still show (marked "Deleted") in this table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditMemberDialog
        member={editingMember}
        open={!!editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
        onSaved={load}
      />
    </div>
  );
}
