import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import {
  CalendarConnectionStatus,
  CheckInCalendarEvent,
  TeamMember,
} from "../types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function localDateTimeValue(value: string): string {
  const candidate = new Date(value);
  const date =
    Number.isNaN(candidate.getTime()) || candidate.getTime() <= Date.now()
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : candidate;
  date.setHours(10, 0, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function ScheduleCalendarDialog({
  member,
  status,
  onCreated,
}: {
  member: TeamMember;
  status: CalendarConnectionStatus | null;
  onCreated?: (event: CheckInCalendarEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [startsAt, setStartsAt] = useState(() => localDateTimeValue(member.nextDueDate));
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [inviteAttendee, setInviteAttendee] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<CheckInCalendarEvent | null>(null);

  useEffect(() => {
    if (open) {
      setStartsAt(localDateTimeValue(member.nextDueDate));
      setDurationMinutes("30");
      setInviteAttendee(false);
      setCreatedEvent(null);
    }
  }, [open, member.nextDueDate]);

  if (!status) {
    return (
      <Button variant="outline" disabled>
        <CalendarPlus />
        Loading calendar…
      </Button>
    );
  }

  if (!status.configured || !status.connected) {
    return (
      <Button variant="outline" asChild>
        <Link to="/calendar">
          <CalendarPlus />
          {status.configured ? "Connect calendar" : "Set up calendar"}
        </Link>
      </Button>
    );
  }

  async function schedule(event: FormEvent) {
    event.preventDefault();
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime())) {
      toast.error("Choose a valid date and time");
      return;
    }

    setSaving(true);
    try {
      const created = await api.post<CheckInCalendarEvent>("/api/calendar/events", {
        teamMemberId: member.id,
        startsAt: start.toISOString(),
        durationMinutes: Number(durationMinutes),
        inviteAttendee,
      });
      setCreatedEvent(created);
      onCreated?.(created);
      toast.success(`Check-in with ${member.name} added to Google Calendar`);
    } catch {
      toast.error("Unable to create the Google Calendar event");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarPlus />
          Schedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        {createdEvent ? (
          <>
            <DialogHeader>
              <DialogTitle>Calendar event created</DialogTitle>
              <DialogDescription>
                Your check-in with {member.name} is now in Google Calendar.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Done
              </Button>
              {createdEvent.htmlLink && (
                <Button asChild>
                  <a href={createdEvent.htmlLink} target="_blank" rel="noreferrer">
                    Open in Google Calendar
                    <ExternalLink />
                  </a>
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={schedule}>
            <DialogHeader>
              <DialogTitle>Schedule with {member.name}</DialogTitle>
              <DialogDescription>
                Add this conversation to your connected Google Calendar.
              </DialogDescription>
            </DialogHeader>

            <div className="my-5 space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold" htmlFor="calendar-start">
                  Date and time
                </label>
                <Input
                  id="calendar-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">Duration</label>
                <Select value={durationMinutes} onValueChange={setDurationMinutes}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {member.email && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-overlay-subtle p-4">
                  <Checkbox
                    className="mt-0.5"
                    checked={inviteAttendee}
                    onCheckedChange={(checked) => setInviteAttendee(checked === true)}
                  />
                  <span>
                    <span className="block text-sm font-semibold">Invite {member.name}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      Google will email an invitation to {member.email}. Leave this off to keep
                      the event private on your calendar.
                    </span>
                  </span>
                </label>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Scheduling…" : "Add to calendar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
