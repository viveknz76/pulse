import { FormEvent, useEffect, useState } from "react";
import { addDays, format } from "date-fns";
import { toast } from "sonner";
import { api } from "../api/client";
import { TeamMember } from "../types";
import { DatePicker } from "./DatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DATE_FORMAT = "yyyy-MM-dd";

export function CheckInHoldDialog({
  member,
  open,
  onOpenChange,
  onSaved,
}: {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [returnDate, setReturnDate] = useState("");
  const [reason, setReason] = useState("On leave");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReturnDate(format(addDays(new Date(), 7), DATE_FORMAT));
    setReason("On leave");
  }, [open, member]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!member || !returnDate) return;

    const resumeOn = new Date(`${returnDate}T00:00:00`);
    if (resumeOn.getTime() <= Date.now()) {
      toast.error("Choose a return date after today.");
      return;
    }

    setSaving(true);
    try {
      await api.post(`/api/team-members/${member.id}/check-in-hold`, {
        resumeOn: resumeOn.toISOString(),
        reason: reason.trim() || "On leave",
      });
      toast.success(`${member.name}'s check-ins are on hold`);
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
            <DialogTitle>Put check-ins on hold</DialogTitle>
            <DialogDescription>
              {member?.name} will stay visible, but won’t appear as due or overdue while away.
              Their unfinished check-in, talking points, and actions will be kept.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="hold-reason">
                Reason
              </label>
              <Input
                id="hold-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="On leave"
                maxLength={160}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Return date</label>
              <DatePicker
                value={returnDate}
                onChange={setReturnDate}
                className="w-full"
                placeholder="Choose a return date"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                The next check-in will become due when they return.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !returnDate}>
              {saving ? "Putting on hold…" : "Put on hold"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
