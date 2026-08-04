import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function TalkingPointNoteDialog({
  open,
  onOpenChange,
  pointContent,
  initialNotes,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pointContent: string;
  initialNotes: string;
  onSave: (notes: string) => void;
}) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) setNotes(initialNotes);
  }, [open, initialNotes]);

  function handleSave() {
    onSave(notes);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pointContent.trim() || "Untitled talking point"}</DialogTitle>
        </DialogHeader>

        <Textarea
          className="min-h-40"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Jot something down while it's fresh…"
          maxLength={10000}
          autoFocus
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
