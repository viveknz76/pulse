import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  Clock3,
  LockKeyhole,
  PartyPopper,
  PlayCircle,
  Quote,
  Sparkles,
  Trophy,
} from "lucide-react";
import { api } from "../api/client";
import { ENERGY_COLORS, ENERGY_ON_COLOR } from "../lib/energyPalette";
import { PrivateWin, TeamMember } from "../types";
import { MemberAvatar } from "../components/MemberAvatar";
import { PageLoading } from "../components/PageLoading";
import { PageTitle, SectionLabel } from "../components/Typography";
import { IconLinkAction } from "../components/IconActionButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { APPLICATION_TIME_ZONE, calendarDayDifference, formatDateOnly } from "@/lib/dateOnly";
import { cn } from "@/lib/utils";

function isOverdue(dateStr: string): boolean {
  return calendarDayDifference(dateStr) < 0;
}

function daysUntil(dateStr: string): number {
  return calendarDayDifference(dateStr);
}

function relativeDueLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days < -1) return `${Math.abs(days)} days overdue`;
  if (days === -1) return "Overdue by a day";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `Due in ${days} days`;
  return `Due ${formatDateOnly(dateStr, {
    month: "short",
    day: "numeric",
  })}`;
}

function greetingWord(): string {
  const hour = Number(new Intl.DateTimeFormat("en-NZ", {
    timeZone: APPLICATION_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const CARD_BASE =
  "p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-border hover:shadow-[0_12px_28px_var(--brand-glow)]";

function winDateLabel(dateStr: string): string {
  return formatDateOnly(dateStr, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MomentumMetric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-white/55 p-3 ring-1 ring-inset ring-white/60 dark:bg-white/[0.045] dark:ring-white/10">
      <div className="mb-1 flex items-center gap-2 text-brand-strong">
        {icon}
        <span className="text-lg font-bold tracking-tight text-foreground">{value}</span>
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [wins, setWins] = useState<PrivateWin[] | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<TeamMember[]>("/api/team-members"),
      api.get<PrivateWin[]>("/api/check-ins/wins"),
    ]).then(([nextMembers, nextWins]) => {
      setMembers(nextMembers);
      setWins(nextWins);
    });
  }, []);

  if (!members || !wins) return <PageLoading />;

  const winsWithText = wins.filter((w) => w.text);

  const active = members.filter((m) => m.active && !m.deletedAt);
  const onHold = active.filter((m) => m.checkInsOnHold);
  const scheduled = active.filter((m) => !m.checkInsOnHold);
  const due = scheduled
    .filter((m) => daysUntil(m.nextDueDate) <= 3)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
  const upcoming = scheduled
    .filter((m) => daysUntil(m.nextDueDate) > 3)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
  const overdue = due.filter((m) => isOverdue(m.nextDueDate));
  const inProgress = scheduled.filter((m) => !!m.activeCheckInId);
  const onTrack = scheduled.filter((m) => !isOverdue(m.nextDueDate));
  const rhythmPercent = scheduled.length
    ? Math.round((onTrack.length / scheduled.length) * 100)
    : 100;
  const nextConversation = due[0];

  const todayLabel = new Date().toLocaleDateString("en-US", {
    timeZone: APPLICATION_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-10 flex items-end justify-between gap-6">
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[0.72rem] font-semibold tracking-wide text-brand-strong uppercase ring-1 ring-inset ring-brand-border">
            <Sparkles className="size-3" />
            {todayLabel}
          </p>
          <PageTitle className="mb-1 bg-gradient-to-r from-brand-strong to-brand bg-clip-text text-transparent">
            {greetingWord()}
          </PageTitle>
          <p className="text-sm text-muted-foreground">
            Let’s make the next conversation count.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/team">Manage people</Link>
        </Button>
      </div>

      <Card className="relative mb-10 overflow-hidden border-brand-border bg-gradient-to-br from-brand-soft via-card to-card p-6 sm:p-7">
        <div
          aria-hidden="true"
          className="absolute -top-20 -right-16 size-56 rounded-full bg-indigo-500/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute top-7 right-10 hidden size-2 rounded-full bg-indigo-400/60 shadow-[36px_20px_0_-1px_rgba(167,139,250,0.55),70px_-8px_0_-2px_rgba(99,102,241,0.45),18px_72px_0_-2px_rgba(129,140,248,0.4)] sm:block"
        />

        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:items-end">
          <div>
            <div className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_24px_var(--brand-glow)]">
              {overdue.length > 0 ? (
                <Clock3 className="size-5" />
              ) : (
                <PartyPopper className="size-5" />
              )}
            </div>
            <p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-strong uppercase">
              Your team rhythm
            </p>
            <h2 className="max-w-xl text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {active.length === 0
                ? "Your check-in rhythm starts here"
                : overdue.length > 0
                  ? "One conversation can get the rhythm moving again"
                  : due.length > 0
                    ? `${due.length} meaningful ${due.length === 1 ? "conversation is" : "conversations are"} ready`
                    : "You’re beautifully on track"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {active.length === 0
                ? "Add your first team member and Pulse will help you stay ahead of every conversation."
                : overdue.length > 0
                  ? `${overdue.length} ${overdue.length === 1 ? "check-in needs" : "check-ins need"} attention. Pick one and turn it into fresh momentum.`
                  : due.length > 0
                    ? "A little preparation now can make each conversation more useful and human."
                    : "Nothing needs attention in the next few days. Take a moment to enjoy the breathing room."}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {nextConversation ? (
                <Button asChild>
                  <Link to={`/team/${nextConversation.id}/prepare`}>
                    Prepare next check-in
                    <ArrowRight />
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link to={active.length > 0 ? "/review" : "/team"}>
                    {active.length > 0 ? "Review the week" : "Add a team member"}
                    <ArrowRight />
                  </Link>
                </Button>
              )}
              {nextConversation && (
                <span className="text-xs font-medium text-muted-foreground">
                  Next up: {nextConversation.name}
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">On-schedule rhythm</span>
              <span className="text-brand-strong">{rhythmPercent}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Percentage of active team members whose check-ins are on schedule"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={rhythmPercent}
              className="mb-4 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-700"
                style={{ width: `${rhythmPercent}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MomentumMetric
                icon={<Clock3 className="size-4" />}
                value={due.length}
                label="Ready now"
              />
              <MomentumMetric
                icon={<PlayCircle className="size-4" />}
                value={inProgress.length}
                label="In progress"
              />
              <MomentumMetric
                icon={<CheckCircle2 className="size-4" />}
                value={scheduled.length ? `${onTrack.length}/${scheduled.length}` : "—"}
                label="On schedule"
              />
            </div>
          </div>
        </div>
      </Card>

      {due.length > 0 && (
        <>
          <SectionLabel>Ready for a meaningful conversation</SectionLabel>
          <div className="mb-10 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {due.map((m) => (
              <Card key={m.id} className={CARD_BASE}>
                <div className="mb-4 flex items-center gap-3">
                  <MemberAvatar
                    id={m.id}
                    name={m.name}
                    avatarUrl={m.avatarUrl}
                    avatarSeed={m.avatarSeed}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.95rem] font-semibold">{m.name}</div>
                    {m.role && (
                      <div className="truncate text-[0.78rem] text-[var(--muted-foreground-2)]">
                        {m.role}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={isOverdue(m.nextDueDate) ? "destructive" : "warning"}>
                  {relativeDueLabel(m.nextDueDate)}
                </Badge>
                <div className="mt-4 flex items-center gap-2.5">
                  <Button size="sm" asChild>
                    <Link to={`/team/${m.id}/prepare`}>Prepare</Link>
                  </Button>
                  <IconLinkAction
                    label="View history"
                    icon={<ArrowUpRight />}
                    to={`/team/${m.id}`}
                  />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <section className="mb-10" aria-labelledby="private-wins-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <h2
                id="private-wins-title"
                className="text-xs font-bold tracking-[0.12em] text-foreground uppercase"
              >
                Wall of private wins
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-overlay-subtle px-2 py-0.5 text-[0.68rem] font-semibold text-muted-foreground ring-1 ring-inset ring-overlay-strong">
                <LockKeyhole className="size-3" />
                Kept inside Pulse
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              A quiet place to remember what’s going well.
            </p>
          </div>
          {winsWithText.length > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              {winsWithText.length} {winsWithText.length === 1 ? "moment" : "moments"} worth keeping
            </span>
          )}
        </div>

        {wins.length > 0 ? (
          <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wins.map((win, index) => (
              <Card
                key={win.id}
                className={cn(
                  "flex h-full flex-col overflow-hidden p-5 transition-all duration-200",
                  win.text
                    ? "bg-card hover:-translate-y-1 hover:shadow-[0_14px_32px_var(--brand-glow)]"
                    : "border-dashed bg-card/65"
                )}
              >
                <div
                  className="mb-3 flex size-9 items-center justify-center rounded-xl"
                  style={
                    win.text
                      ? {
                        color: ENERGY_COLORS[index % ENERGY_COLORS.length],
                        background: `color-mix(in srgb, ${ENERGY_COLORS[index % ENERGY_COLORS.length]} 12%, transparent)`,
                      }
                      : undefined
                  }
                >
                  {win.text ? (
                    <Quote className="size-4" fill="currentColor" aria-hidden="true" />
                  ) : (
                    <CircleDashed className="size-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
                <p
                  className={cn(
                    "flex-1 text-[0.93rem] leading-relaxed whitespace-pre-line",
                    win.text ? "font-medium text-foreground" : "text-muted-foreground italic"
                  )}
                >
                  {win.text || "No update from their last check-in."}
                </p>
                <div className="mt-5 flex items-center gap-2.5 border-t border-black/8 pt-3.5 dark:border-white/10">
                  <MemberAvatar
                    id={win.teamMember.id}
                    name={win.teamMember.name}
                    avatarUrl={win.teamMember.avatarUrl}
                    avatarSeed={win.teamMember.avatarSeed}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/team/${win.teamMember.id}`}
                      className="block truncate text-xs font-semibold text-foreground hover:underline"
                    >
                      {win.teamMember.name}
                    </Link>
                    <p className="text-[0.7rem] text-muted-foreground">
                      {winDateLabel(win.date)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center border-dashed bg-card/65 px-6 py-9 text-center">
            <div
              className="mb-3 flex size-11 items-center justify-center rounded-2xl shadow-sm"
              style={{ background: ENERGY_COLORS[1], color: ENERGY_ON_COLOR }}
            >
              <Trophy className="size-5" />
            </div>
            <h3 className="text-sm font-semibold">Your wall is ready for its first win</h3>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
              Capture something worth remembering in “What went well?” and it will
              appear here when you complete the check-in.
            </p>
          </Card>
        )}
      </section>

      {upcoming.length > 0 && (
        <>
          <SectionLabel>Coming up</SectionLabel>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {upcoming.map((m) => (
              <Card key={m.id} className={CARD_BASE}>
                <div className="mb-4 flex items-center gap-3">
                  <MemberAvatar
                    id={m.id}
                    name={m.name}
                    avatarUrl={m.avatarUrl}
                    avatarSeed={m.avatarSeed}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.95rem] font-semibold">{m.name}</div>
                    {m.role && (
                      <div className="truncate text-[0.78rem] text-[var(--muted-foreground-2)]">
                        {m.role}
                      </div>
                    )}
                  </div>
                </div>
                <Badge>{relativeDueLabel(m.nextDueDate)}</Badge>
                <div className="mt-4 flex items-center gap-2.5">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/team/${m.id}/prepare`}>Prepare early</Link>
                  </Button>
                  <IconLinkAction
                    label="View history"
                    icon={<ArrowUpRight />}
                    to={`/team/${m.id}`}
                  />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {onHold.length > 0 && (
        <section className="mt-10" aria-label="Team members on leave">
          <SectionLabel>On leave ({onHold.length})</SectionLabel>
          <Card className="divide-y divide-border px-5">
            {onHold.map((member) => (
              <div key={member.id} className="flex items-center gap-3 py-3.5">
                <MemberAvatar
                  id={member.id}
                  name={member.name}
                  avatarUrl={member.avatarUrl}
                  avatarSeed={member.avatarSeed}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/team/${member.id}`}
                    className="text-sm font-semibold hover:text-primary"
                  >
                    {member.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {member.checkInsHoldReason || "On leave"}
                    {member.checkInsResumeOn &&
                      ` · Returns ${formatDateOnly(member.checkInsResumeOn)}`}
                  </p>
                </div>
                <Badge variant="warning">Check-ins paused</Badge>
              </div>
            ))}
          </Card>
        </section>
      )}

    </div>
  );
}
