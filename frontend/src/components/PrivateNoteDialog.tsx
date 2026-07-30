import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { CheckIn } from "../types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PrivateNoteDialog({
  checkIn,
  open,
  onOpenChange,
  onSaved,
}: {
  checkIn: CheckIn | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (checkIn: CheckIn) => void;
}) {
  const [privateNotes, setPrivateNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && checkIn) setPrivateNotes(checkIn.privateNotes || "");
  }, [open, checkIn]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!checkIn) return;

    setSaving(true);
    try {
      const updated = await api.patch<CheckIn>(
        `/api/check-ins/${checkIn.id}/private-note`,
        { privateNotes: privateNotes.trim() || null }
      );
      toast.success(privateNotes.trim() ? "Private note saved" : "Private note removed");
      onSaved(updated);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-xl bg-overlay-subtle text-muted-foreground">
              <LockKeyhole className="size-4" />
            </div>
            <DialogTitle>Private note to self</DialogTitle>
            <DialogDescription>
              Kept inside Pulse for your own reflection. It is never included in copied or
              emailed check-in summaries.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            className="my-5 min-h-36"
            value={privateNotes}
            onChange={(event) => setPrivateNotes(event.target.value)}
            placeholder="Something useful to remember before your next conversation…"
            maxLength={10000}
            autoFocus
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save private note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
