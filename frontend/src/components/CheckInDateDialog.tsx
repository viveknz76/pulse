import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../api/client";
import { CheckIn } from "../types";
import { DatePicker } from "./DatePicker";
import { Button } from "@/components/ui/button";
import { dateOnlyValue, parseDateOnlyLocal, todayDateOnly } from "@/lib/dateOnly";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CheckInDateDialog({
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
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && checkIn) setDate(dateOnlyValue(checkIn.scheduledDate));
  }, [open, checkIn]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!checkIn || !date) return;

    if (date > todayDateOnly()) {
      toast.error("Choose today or an earlier date.");
      return;
    }

    setSaving(true);
    try {
      const updated = await api.patch<CheckIn>(`/api/check-ins/${checkIn.id}/date`, {
        scheduledDate: date,
      });
      toast.success("Check-in date updated");
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
            <DialogTitle>Edit check-in date</DialogTitle>
            <DialogDescription>
              Choose the date this conversation took place. This date is used in history,
              summaries, and the next check-in calculation.
            </DialogDescription>
          </DialogHeader>

          <div className="py-5">
            <label className="mb-1.5 block text-sm font-medium">Check-in date</label>
            <DatePicker
              value={date}
              onChange={setDate}
              className="w-full"
              maxDate={parseDateOnlyLocal(todayDateOnly())}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!date || saving}>
              {saving ? "Saving…" : "Save date"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
