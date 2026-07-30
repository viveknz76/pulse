import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { api } from "../api/client";
import { CheckIn } from "../types";
import { DatePicker } from "./DatePicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function toLocalDateInput(value: string): string {
  return format(new Date(value), "yyyy-MM-dd");
}

function localDateStart(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day).toISOString();
}

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
    if (open && checkIn) setDate(toLocalDateInput(checkIn.scheduledDate));
  }, [open, checkIn]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!checkIn || !date) return;

    const scheduledDate = localDateStart(date);
    if (new Date(scheduledDate).getTime() > Date.now()) {
      toast.error("Choose today or an earlier date.");
      return;
    }

    setSaving(true);
    try {
      const updated = await api.patch<CheckIn>(`/api/check-ins/${checkIn.id}/date`, {
        scheduledDate,
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
              maxDate={new Date()}
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
