import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../api/client";
import { Cadence, TeamMember } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FIELD_LABEL = "mb-1.5 block text-sm font-medium text-foreground";

interface EditMemberDialogProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditMemberDialog({ member, open, onOpenChange, onSaved }: EditMemberDialogProps) {
  const [form, setForm] = useState({
    name: "",
    role: "",
    email: "",
    cadence: "FORTNIGHTLY" as Cadence,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setForm({
        name: member.name,
        role: member.role || "",
        email: member.email || "",
        cadence: member.cadence,
        notes: member.notes || "",
      });
    }
  }, [member]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!member || !form.name.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/api/team-members/${member.id}`, {
        name: form.name.trim(),
        role: form.role.trim(),
        email: form.email.trim(),
        cadence: form.cadence,
        notes: form.notes.trim(),
      });
      toast.success(`${form.name.trim()} updated`);
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit team member</DialogTitle>
            <DialogDescription>Update {member?.name}'s details.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <label className={FIELD_LABEL}>Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={FIELD_LABEL}>Role</label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className={FIELD_LABEL}>Cadence</label>
                <Select
                  value={form.cadence}
                  onValueChange={(value) => setForm({ ...form, cadence: value as Cadence })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="FORTNIGHTLY">Fortnightly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className={FIELD_LABEL}>Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className={FIELD_LABEL}>Notes</label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Private notes about this person (optional)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
