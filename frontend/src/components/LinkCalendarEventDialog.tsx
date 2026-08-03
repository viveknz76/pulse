import { useEffect, useState } from "react";
import { ExternalLink, Link2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import {
  CalendarConnectionStatus,
  CalendarEventCandidate,
  CheckInCalendarEvent,
  TeamMember,
} from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { parseDateOnlyLocal } from "@/lib/dateOnly";

function eventDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function LinkCalendarEventDialog({
  member,
  status,
  onLinked,
}: {
  member: TeamMember;
  status: CalendarConnectionStatus | null;
  onLinked?: (event: CheckInCalendarEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CalendarEventCandidate[]>([]);

  useEffect(() => {
    if (!open || !status?.connected) return;
    let ignore = false;
    setLoading(true);
    const around = parseDateOnlyLocal(member.nextDueDate);
    const aroundValue = Number.isNaN(around.getTime()) ? new Date() : around;
    api
      .get<CalendarEventCandidate[]>(
        `/api/calendar/events/candidates?teamMemberId=${encodeURIComponent(member.id)}&around=${encodeURIComponent(aroundValue.toISOString())}`
      )
      .then((events) => {
        if (!ignore) setCandidates(events);
      })
      .catch(() => {
        if (!ignore) toast.error("Unable to load upcoming Google Calendar appointments");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [member.id, member.nextDueDate, open, status?.connected]);

  if (!status?.connected) return null;

  async function link(candidate: CalendarEventCandidate) {
    setLinkingId(candidate.id);
    try {
      const linked = await api.post<CheckInCalendarEvent>("/api/calendar/events/link", {
        teamMemberId: member.id,
        googleEventId: candidate.id,
      });
      onLinked?.(linked);
      setOpen(false);
      toast.success(`Appointment linked to ${member.name}'s check-in`);
    } catch {
      toast.error("Unable to link that Google Calendar appointment");
    } finally {
      setLinkingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Link2 />
          Link existing
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link an existing appointment</DialogTitle>
          <DialogDescription>
            Choose the Google Calendar appointment that belongs to your check-in with{" "}
            {member.name}. Pulse will not change or resend it.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 max-h-[440px] overflow-y-auto pr-1">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Looking for likely appointments…
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-10 text-center">
              <Link2 className="mx-auto mb-3 size-5 text-muted-foreground" />
              <p className="text-sm font-semibold">No timed appointments found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pulse searched from two weeks before the next due date through the following
                month.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {candidates.map((candidate, index) => {
                const linkedElsewhere =
                  candidate.linkedTeamMember &&
                  candidate.linkedTeamMember.id !== member.id;
                const linkedHere = candidate.linkedTeamMember?.id === member.id;
                return (
                  <li
                    key={candidate.id}
                    className="rounded-xl border border-border bg-overlay-subtle p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">
                            {candidate.summary || "Busy"}
                          </p>
                          {index === 0 && candidate.matchScore > 0 && (
                            <Badge variant="secondary">
                              <Sparkles />
                              Best match
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {eventDate(candidate.startsAt)}
                        </p>
                        {candidate.matchReasons.length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {candidate.matchReasons.join(" · ")}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {candidate.htmlLink && (
                          <Button size="icon" variant="ghost" asChild>
                            <a
                              href={candidate.htmlLink}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${candidate.summary || "appointment"} in Google Calendar`}
                            >
                              <ExternalLink />
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => link(candidate)}
                          disabled={
                            !!linkedElsewhere ||
                            !!linkedHere ||
                            linkingId === candidate.id
                          }
                        >
                          {linkedHere
                            ? "Linked"
                            : linkedElsewhere
                              ? `Linked to ${candidate.linkedTeamMember?.name}`
                              : linkingId === candidate.id
                                ? "Linking…"
                                : "Link"}
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
