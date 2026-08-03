import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../api/client";
import { Team } from "../types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TeamDialogProps {
  team?: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function TeamDialog({ team, open, onOpenChange, onSaved }: TeamDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(team?.name || "");
    setDescription(team?.description || "");
  }, [open, team]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), description: description.trim() };
      if (team) {
        await api.patch(`/api/teams/${team.id}`, body);
        toast.success(`${name.trim()} updated`);
      } else {
        await api.post("/api/teams", body);
        toast.success(`${name.trim()} created`);
      }
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("We couldn't save this team. Check that the name is unique.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{team ? "Edit team" : "Create a team"}</DialogTitle>
            <DialogDescription>
              {team ? "Keep this team's details current." : "Set up a home for the people who work together."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5">
            <div>
              <label htmlFor="team-name" className="mb-1.5 block text-sm font-medium">Name</label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Product"
                maxLength={80}
                required
              />
            </div>
            <div>
              <label htmlFor="team-description" className="mb-1.5 block text-sm font-medium">Description</label>
              <Textarea
                id="team-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What brings this team together? (optional)"
                maxLength={240}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Saving…" : team ? "Save changes" : "Create team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
