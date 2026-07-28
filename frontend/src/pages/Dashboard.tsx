import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  PartyPopper,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { api } from "../api/client";
import { TeamMember } from "../types";
import { MemberAvatar } from "../components/MemberAvatar";
import { PageLoading } from "../components/PageLoading";
import { PageTitle, SectionLabel } from "../components/Typography";
import { IconLinkAction } from "../components/IconActionButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr).getTime() < Date.now();
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function relativeDueLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days < -1) return `${Math.abs(days)} days overdue`;
  if (days === -1) return "Overdue by a day";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `Due in ${days} days`;
  return `Due ${new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}

function greetingWord(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const CARD_BASE =
  "p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-border hover:shadow-[0_12px_28px_var(--brand-glow)]";

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
  const navigate = useNavigate();

  useEffect(() => {
    api.get<TeamMember[]>("/api/team-members").then(setMembers);
  }, []);

  async function startCheckIn(member: TeamMember) {
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

  if (!members) return <PageLoading />;

  const active = members.filter((m) => m.active && !m.deletedAt);
  const due = active
    .filter((m) => daysUntil(m.nextDueDate) <= 3)
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
  const upcoming = active
    .filter((m) => daysUntil(m.nextDueDate) > 3)
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
  const overdue = due.filter((m) => isOverdue(m.nextDueDate));
  const inProgress = active.filter((m) => !!m.activeCheckInId);
  const onTrack = active.filter((m) => !isOverdue(m.nextDueDate));
  const rhythmPercent = active.length ? Math.round((onTrack.length / active.length) * 100) : 100;
  const nextConversation = due[0];

  const todayLabel = new Date().toLocaleDateString("en-US", {
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
          <Link to="/team">Manage team</Link>
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
                <Button onClick={() => startCheckIn(nextConversation)}>
                  {nextConversation.activeCheckInId ? "Resume next check-in" : "Start next check-in"}
                  <ArrowRight />
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
                value={active.length ? `${onTrack.length}/${active.length}` : "—"}
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
                  <Button size="sm" onClick={() => startCheckIn(m)}>
                    {m.activeCheckInId ? "Resume check-in" : "Start check-in"}
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
                  <Button size="sm" variant="outline" onClick={() => startCheckIn(m)}>
                    {m.activeCheckInId ? "Resume check-in" : "Start early"}
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

    </div>
  );
}
