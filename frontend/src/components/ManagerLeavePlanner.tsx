import { FormEvent, useEffect, useState } from "react";
import { addDays, format } from "date-fns";
import { ArrowRight, CalendarOff, ExternalLink, PlaneTakeoff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { ManagerLeavePeriod, ManagerLeavePreview } from "@/types";
import { DatePicker } from "@/components/DatePicker";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  dateOnlyValue,
  formatDateOnly,
  parseDateOnlyLocal,
  todayDateOnly,
} from "@/lib/dateOnly";

const DATE_FORMAT = "yyyy-MM-dd";

function leaveDateRange(period: Pick<ManagerLeavePeriod, "startsOn" | "endsOn">): string {
  const startsOn = dateOnlyValue(period.startsOn);
  const endsOn = dateOnlyValue(period.endsOn);
  if (startsOn === endsOn) {
    return formatDateOnly(startsOn, { weekday: "short", month: "short", day: "numeric" });
  }
  return `${formatDateOnly(startsOn, { month: "short", day: "numeric" })} – ${formatDateOnly(
    endsOn,
    { month: "short", day: "numeric", year: "numeric" }
  )}`;
}

export function ManagerLeavePlanner({
  periods,
  onChanged,
}: {
  periods: ManagerLeavePeriod[];
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [preview, setPreview] = useState<ManagerLeavePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<ManagerLeavePeriod | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const today = parseDateOnlyLocal(todayDateOnly());
    setStartsOn(format(addDays(today, 7), DATE_FORMAT));
    setEndsOn(format(addDays(today, 14), DATE_FORMAT));
    setPreview(null);
  }, [open]);

  useEffect(() => {
    if (!open || !startsOn || !endsOn || endsOn < startsOn) {
      setPreview(null);
      return;
    }

    let ignore = false;
    setPreviewing(true);
    const query = new URLSearchParams({ startsOn, endsOn });
    api.get<ManagerLeavePreview>(`/api/manager-leave/preview?${query.toString()}`)
      .then((nextPreview) => {
        if (!ignore) setPreview(nextPreview);
      })
      .catch(() => {
        if (!ignore) setPreview(null);
      })
      .finally(() => {
        if (!ignore) setPreviewing(false);
      });

    return () => {
      ignore = true;
    };
  }, [endsOn, open, startsOn]);

  async function saveLeave(event: FormEvent) {
    event.preventDefault();
    if (!startsOn || !endsOn || endsOn < startsOn) return;

    setSaving(true);
    try {
      await api.post("/api/manager-leave", { startsOn, endsOn });
      await onChanged();
      setOpen(false);
      toast.success("Leave planned — affected check-ins will resume in their normal rhythm");
    } catch {
      toast.error("Unable to plan this leave. Check that it does not overlap another period.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemoveLeave() {
    if (!pendingRemove) return;
    setRemoving(true);
    try {
      await api.delete(`/api/manager-leave/${pendingRemove.id}`);
      await onChanged();
      toast.success("Planned leave removed");
      setPendingRemove(null);
    } catch {
      toast.error("Unable to remove this leave period");
    } finally {
      setRemoving(false);
    }
  }

  const today = todayDateOnly();

  return (
    <>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--warning-tint)] text-[var(--warning-text)]">
              <PlaneTakeoff className="size-5" />
            </div>
            <div>
              <p className="font-semibold">Your leave</p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Skip check-ins due while you are away, then continue each person’s normal cadence.
                Team members will not be placed on hold.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setOpen(true)}>
            <CalendarOff />
            Plan leave
          </Button>
        </div>

        {periods.length > 0 && (
          <ul className="mt-5 border-t border-border pt-2">
            {periods.map((period) => {
              const startsOnValue = dateOnlyValue(period.startsOn);
              const endsOnValue = dateOnlyValue(period.endsOn);
              const current = startsOnValue <= today && endsOnValue >= today;
              return (
                <li
                  key={period.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{leaveDateRange(period)}</p>
                      <Badge variant={current ? "warning" : "secondary"}>
                        {current ? "Away now" : "Planned"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Due occurrences in this period move to the next cadence date.
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove planned leave for ${leaveDateRange(period)}`}
                    onClick={() => setPendingRemove(period)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={saveLeave}>
            <DialogHeader>
              <DialogTitle>Plan your leave</DialogTitle>
              <DialogDescription>
                Pulse will preview the affected check-ins before saving. Drafts, talking points,
                actions, and team-member availability remain unchanged.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">First day away</label>
                <DatePicker
                  value={startsOn}
                  onChange={(value) => {
                    setStartsOn(value);
                    if (endsOn && endsOn < value) setEndsOn(value);
                  }}
                  minDate={parseDateOnlyLocal(today)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Last day away</label>
                <DatePicker
                  value={endsOn}
                  onChange={setEndsOn}
                  minDate={parseDateOnlyLocal(startsOn || today)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="rounded-xl bg-muted/55 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Check-in impact</p>
                {preview && (
                  <span className="text-xs text-muted-foreground">
                    {preview.affectedCheckIns.length} affected
                  </span>
                )}
              </div>

              {previewing ? (
                <p className="text-sm text-muted-foreground">Checking the schedule…</p>
              ) : preview?.affectedCheckIns.length ? (
                <ul>
                  {preview.affectedCheckIns.map((item) => (
                    <li
                      key={item.teamMember.id}
                      className="flex items-center gap-3 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0"
                    >
                      <MemberAvatar
                        id={item.teamMember.id}
                        name={item.teamMember.name}
                        avatarUrl={item.teamMember.avatarUrl}
                        avatarSeed={item.teamMember.avatarSeed}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.teamMember.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateOnly(item.currentDueDate, { month: "short", day: "numeric" })}
                          <ArrowRight className="mx-1 inline size-3" />
                          {formatDateOnly(item.adjustedDueDate, {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      {item.activeCheckInId && <Badge variant="warning">Draft preserved</Badge>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No check-in due dates fall inside this leave period.
                </p>
              )}
            </div>

            {preview && preview.calendarEvents.length > 0 && (
              <div className="mt-4 rounded-xl border border-warning/30 bg-[var(--warning-tint)] p-4">
                <p className="text-sm font-semibold text-foreground">
                  Review {preview.calendarEvents.length} calendar appointment
                  {preview.calendarEvents.length === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Saving leave changes Pulse’s due dates, but does not alter Google Calendar events.
                </p>
                <ul className="mt-2 space-y-1.5">
                  {preview.calendarEvents.map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate">{event.teamMember.name}</span>
                      {event.htmlLink && (
                        <a
                          href={event.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[var(--warning-text)]"
                        >
                          Open <ExternalLink className="size-3" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || previewing || !startsOn || !endsOn}>
                {saving ? "Saving leave…" : "Save leave"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingRemove} onOpenChange={(open) => !open && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove leave for {pendingRemove && leaveDateRange(pendingRemove)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Check-in due dates adjusted for this leave period will return to their normal
              cadence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveLeave}
              disabled={removing}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {removing ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
