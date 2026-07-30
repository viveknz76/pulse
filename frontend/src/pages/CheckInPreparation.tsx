import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  MessageCircleMore,
  Repeat2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { CheckIn, TeamMember } from "../types";
import { MemberAvatar } from "../components/MemberAvatar";
import { PageLoading } from "../components/PageLoading";
import { PageTitle, SectionLabel } from "../components/Typography";
import { StatusDot } from "../components/StatusDot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { energyLevelLabel } from "@/lib/energyPulse";

function dateLabel(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function daysSince(value: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24))
  );
}

function ContextField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-sm leading-relaxed whitespace-pre-line">{value}</p>
    </div>
  );
}

export default function CheckInPreparation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<TeamMember | null>(null);
  const [newPoint, setNewPoint] = useState("");
  const [addingPoint, setAddingPoint] = useState(false);

  const load = useCallback(async (shouldIgnore: () => boolean = () => false) => {
    if (!id) return;
    try {
      const nextMember = await api.get<TeamMember>(`/api/team-members/${id}`);
      if (!shouldIgnore()) setMember(nextMember);
    } catch {
      if (!shouldIgnore()) toast.error("Unable to prepare this check-in. Please try again.");
    }
  }, [id]);

  useEffect(() => {
    let ignore = false;
    void load(() => ignore);
    return () => {
      ignore = true;
    };
  }, [load]);

  async function addTalkingPoint(event: FormEvent) {
    event.preventDefault();
    if (!member || !newPoint.trim()) return;
    setAddingPoint(true);
    try {
      await api.post("/api/talking-points", {
        teamMemberId: member.id,
        content: newPoint.trim(),
      });
      setNewPoint("");
      await load();
      toast.success("Talking point added for the next check-in");
    } finally {
      setAddingPoint(false);
    }
  }

  async function startCheckIn() {
    if (!member || member.checkInsOnHold) return;
    if (member.activeCheckInId) {
      navigate(`/check-ins/${member.activeCheckInId}`);
      return;
    }
    const checkIn = await api.post<{ id: string }>("/api/check-ins", {
      teamMemberId: member.id,
      scheduledDate: new Date().toISOString(),
    });
    navigate(`/check-ins/${checkIn.id}`);
  }

  if (!member) return <PageLoading />;

  const completed = (member.checkIns || [])
    .filter((checkIn) => checkIn.status === "COMPLETED")
    .sort(
      (a, b) =>
        new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );
  const lastCheckIn: CheckIn | undefined = completed[0];
  const openCommitments = (member.actionItems || []).filter((item) => item.status !== "DONE");
  const talkingPoints = (member.talkingPoints || []).filter((point) => !point.resolved);
  const lastDate = lastCheckIn?.scheduledDate;
  const hasLastContext = !!(
    lastCheckIn?.energyLevel ||
    lastCheckIn?.wins ||
    lastCheckIn?.challenges ||
    lastCheckIn?.decisions ||
    lastCheckIn?.growthNotes
  );

  return (
    <div className="animate-in fade-in duration-300">
      <Link
        to={`/team/${member.id}`}
        className="text-[0.82rem] font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        ← {member.name}
      </Link>

      <div className="mt-2 mb-8 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <MemberAvatar
            id={member.id}
            name={member.name}
            avatarUrl={member.avatarUrl}
            avatarSeed={member.avatarSeed}
            size="lg"
          />
          <div>
            <p className="mb-1 text-xs font-bold tracking-[0.12em] text-brand-strong uppercase">
              Prepare with context
            </p>
            <PageTitle size="sm">Check-in with {member.name}</PageTitle>
            {member.role && <p className="mt-1 text-sm text-muted-foreground">{member.role}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/team/${member.id}#check-in-history`}>View history</Link>
          </Button>
          <Button onClick={startCheckIn} disabled={member.checkInsOnHold || !member.active}>
            {member.activeCheckInId ? "Resume check-in" : "Start check-in"}
            <ArrowRight />
          </Button>
        </div>
      </div>

      {member.checkInsOnHold && (
        <Card className="mb-7 flex items-start gap-3 border-warning/30 bg-[var(--warning-tint)] p-4">
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-[var(--warning-text)]" />
          <div>
            <p className="text-sm font-semibold">Check-ins are on hold</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You can still prepare while {member.name} is away.
              {member.checkInsResumeOn &&
                ` Their next check-in becomes due on ${dateLabel(member.checkInsResumeOn)}.`}
            </p>
          </div>
        </Card>
      )}

      <div className="mb-9 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Last conversation</p>
          <p className="mt-1 text-lg font-semibold">
            {lastDate ? `${daysSince(lastDate)} days ago` : "Not yet"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Open commitments</p>
          <p className="mt-1 text-lg font-semibold">{openCommitments.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Talking points ready</p>
          <p className="mt-1 text-lg font-semibold">{talkingPoints.length}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <section>
            <SectionLabel>Last conversation</SectionLabel>
            <Card className="p-5">
              {!lastCheckIn ? (
                <div className="py-5 text-center">
                  <Sparkles className="mx-auto mb-3 size-5 text-brand-strong" />
                  <p className="text-sm font-semibold">A fresh starting point</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    There is no earlier check-in to revisit yet.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{dateLabel(lastCheckIn.scheduledDate)}</p>
                    {lastCheckIn.energyLevel && (
                      <Badge variant="secondary">
                        Starting pulse · {energyLevelLabel(lastCheckIn.energyLevel)}
                      </Badge>
                    )}
                  </div>
                  {hasLastContext ? (
                    <div className="grid gap-5">
                      <ContextField label="Wins" value={lastCheckIn.wins} />
                      <ContextField label="Challenges" value={lastCheckIn.challenges} />
                      <ContextField label="Decisions" value={lastCheckIn.decisions} />
                      <ContextField label="Growth" value={lastCheckIn.growthNotes} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No conversation notes were captured last time.
                    </p>
                  )}
                  {lastCheckIn.privateNotes && (
                    <div className="mt-5 rounded-xl border border-border bg-overlay-subtle p-4">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        <LockKeyhole className="size-3.5" />
                        Private note to self
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {lastCheckIn.privateNotes}
                      </p>
                    </div>
                  )}
                </>
              )}
            </Card>
          </section>

          <section>
            <SectionLabel>Commitments still in motion</SectionLabel>
            <Card className="px-5">
              {openCommitments.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No open commitments to revisit.
                </div>
              ) : (
                <ul>
                  {openCommitments.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 border-b border-border py-4 last:border-b-0"
                    >
                      <span className="mt-1.5"><StatusDot status={item.status} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.status === "IN_PROGRESS" ? "In progress" : "Open"}
                          {item.dueDate && ` · Due ${dateLabel(item.dueDate)}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <SectionLabel>Ready to discuss</SectionLabel>
            <Card className="p-5">
              <form className="mb-4 flex gap-2" onSubmit={addTalkingPoint}>
                <Input
                  value={newPoint}
                  onChange={(event) => setNewPoint(event.target.value)}
                  placeholder="Add something worth discussing…"
                />
                <Button type="submit" disabled={addingPoint || !newPoint.trim()}>
                  Add
                </Button>
              </form>
              {talkingPoints.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nothing queued yet. A clear agenda can stay short.
                </p>
              ) : (
                <ul>
                  {talkingPoints.map((point) => (
                    <li
                      key={point.id}
                      className="flex items-start gap-2.5 border-t border-border py-3.5 text-sm first:border-t-0"
                    >
                      <MessageCircleMore className="mt-0.5 size-4 shrink-0 text-brand-strong" />
                      <span className="min-w-0 flex-1">{point.content}</span>
                      {point.recurring && (
                        <Badge variant="secondary">
                          <Repeat2 />
                          Every check-in
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section>
            <SectionLabel>A moment to orient</SectionLabel>
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Lightbulb className="size-4 text-brand-strong" />
                <p className="text-sm font-semibold">Before you begin</p>
              </div>
              <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  What deserves recognition since the last conversation?
                </li>
                <li className="flex gap-2.5">
                  <MessageCircleMore className="mt-0.5 size-4 shrink-0" />
                  What may need more listening than problem-solving?
                </li>
                <li className="flex gap-2.5">
                  <ListChecks className="mt-0.5 size-4 shrink-0" />
                  Which commitment needs clarity, support, or closure?
                </li>
              </ul>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
