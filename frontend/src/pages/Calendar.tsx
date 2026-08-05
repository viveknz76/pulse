import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Link2,
  ShieldCheck,
  Trash2,
  Unlink,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import {
  CalendarConnectionStatus,
  CheckInCalendarEvent,
  ManagerLeavePeriod,
} from "../types";
import { MemberAvatar } from "../components/MemberAvatar";
import { PageLoading } from "../components/PageLoading";
import { PageTitle, SectionLabel } from "../components/Typography";
import { ManagerLeavePlanner } from "../components/ManagerLeavePlanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function eventDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Google Calendar integration is not configured yet.",
  authorization_failed: "Google Calendar authorization did not complete.",
  invalid_state: "The connection request expired. Please try again.",
  account_mismatch: "Connect the same Google account you use to sign in to Pulse.",
  email_unavailable: "Google did not provide the account email.",
  refresh_token_missing: "Google did not provide offline access. Please reconnect.",
};

export default function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<CalendarConnectionStatus | null>(null);
  const [events, setEvents] = useState<CheckInCalendarEvent[]>([]);
  const [leavePeriods, setLeavePeriods] = useState<ManagerLeavePeriod[]>([]);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const [nextStatus, nextLeavePeriods] = await Promise.all([
      api.get<CalendarConnectionStatus>("/api/calendar/status"),
      api.get<ManagerLeavePeriod[]>("/api/manager-leave"),
    ]);
    setStatus(nextStatus);
    setLeavePeriods(nextLeavePeriods);
    if (!nextStatus.connected) {
      setEvents([]);
      return;
    }
    const nextEvents = await api.get<CheckInCalendarEvent[]>("/api/calendar/events");
    setEvents(nextEvents);
  }, []);

  useEffect(() => {
    void load().catch(() => {
      setStatus({ configured: false, connected: false });
      toast.error("Unable to load Google Calendar settings");
    });
  }, [load]);

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      toast.success("Google Calendar connected");
      setSearchParams({}, { replace: true });
      void load();
      return;
    }
    const error = searchParams.get("error");
    if (error) {
      toast.error(ERROR_MESSAGES[error] || "Unable to connect Google Calendar");
      setSearchParams({}, { replace: true });
    }
  }, [load, searchParams, setSearchParams]);

  async function connect() {
    setWorking(true);
    try {
      const { url } = await api.get<{ url: string }>("/api/calendar/connect");
      window.location.assign(url);
    } catch {
      toast.error("Google Calendar connection could not start");
      setWorking(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Google Calendar and remove Pulse's saved event links?")) {
      return;
    }
    setWorking(true);
    try {
      await api.delete("/api/calendar/connection");
      await load();
      toast.success("Google Calendar disconnected");
    } catch {
      toast.error("Unable to disconnect Google Calendar");
    } finally {
      setWorking(false);
    }
  }

  async function removeEvent(event: CheckInCalendarEvent) {
    const message = event.createdByPulse
      ? `Remove the check-in with ${event.teamMember.name} from Google Calendar?`
      : `Unlink the appointment from ${event.teamMember.name}'s check-in? The Google Calendar appointment will not be changed.`;
    if (!window.confirm(message)) {
      return;
    }
    try {
      await api.delete(`/api/calendar/events/${event.id}`);
      setEvents((current) => current.filter((item) => item.id !== event.id));
      toast.success(
        event.createdByPulse
          ? "Calendar event removed"
          : "Appointment unlinked from Pulse"
      );
    } catch {
      toast.error(
        event.createdByPulse
          ? "Unable to remove the Google Calendar event"
          : "Unable to unlink the appointment"
      );
    }
  }

  if (!status) return <PageLoading />;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-8">
        <p className="mb-1 text-xs font-bold tracking-[0.12em] text-brand-strong uppercase">
          Stay in rhythm
        </p>
        <PageTitle>Google Calendar</PageTitle>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Turn prepared check-ins into real calendar time without importing the rest of your
          calendar into Pulse.
        </p>
      </div>

      <div className="mb-9 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <Card className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong ring-1 ring-inset ring-brand-border">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <p className="font-semibold">RICADO Google Calendar</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {status.connected ? status.accountEmail : "Not connected"}
                </p>
              </div>
            </div>
            <Badge variant={status.connected ? "success" : "secondary"}>
              {status.connected ? "Connected" : "Not connected"}
            </Badge>
          </div>

          {!status.configured ? (
            <div className="rounded-xl border border-warning/30 bg-[var(--warning-tint)] p-4">
              <p className="text-sm font-semibold">One-time setup needed</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Enable the Google Calendar API, add the callback URI, then configure the client
                secret and calendar encryption key described in the README.
              </p>
            </div>
          ) : status.connected ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={connect} disabled={working}>
                <Link2 />
                Reconnect
              </Button>
              <Button variant="ghost" onClick={disconnect} disabled={working}>
                <Unplug />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={connect} disabled={working}>
              <Link2 />
              {working ? "Opening Google…" : "Connect Google Calendar"}
            </Button>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="size-5 text-brand-strong" />
            <p className="font-semibold">Thoughtful by default</p>
          </div>
          <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              Pulse uses Google’s event scope and never imports unrelated calendar events.
            </li>
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              Team members are invited only when you explicitly choose to invite them.
            </li>
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              The refresh token is encrypted before it is stored.
            </li>
          </ul>
        </Card>
      </div>

      <section className="mb-9">
        <SectionLabel>Your availability</SectionLabel>
        <ManagerLeavePlanner periods={leavePeriods} onChanged={load} />
      </section>

      <section>
        <SectionLabel>Upcoming Pulse events</SectionLabel>
        <Card className="px-5">
          {events.length === 0 ? (
            <div className="py-9 text-center">
              <CalendarDays className="mx-auto mb-3 size-5 text-muted-foreground" />
              <p className="text-sm font-semibold">No check-ins scheduled yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Open a team member’s preparation view to schedule one.
              </p>
            </div>
          ) : (
            <ul>
              {events.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border py-4 last:border-b-0"
                >
                  <MemberAvatar
                    id={event.teamMember.id}
                    name={event.teamMember.name}
                    avatarUrl={event.teamMember.avatarUrl}
                    avatarSeed={event.teamMember.avatarSeed}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        Check-in with {event.teamMember.name}
                      </p>
                      <Badge variant="secondary">
                        {event.createdByPulse ? "Created by Pulse" : "Linked appointment"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {eventDate(event.startsAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {event.htmlLink && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={event.htmlLink} target="_blank" rel="noreferrer">
                          Open
                          <ExternalLink />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={
                        event.createdByPulse
                          ? `Remove check-in with ${event.teamMember.name} from Google Calendar`
                          : `Unlink appointment from ${event.teamMember.name}`
                      }
                      onClick={() => removeEvent(event)}
                    >
                      {event.createdByPulse ? <Trash2 /> : <Unlink />}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
