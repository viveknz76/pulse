import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { api } from "../api/client";
import { TeamMember } from "../types";
import { MemberAvatar } from "../components/MemberAvatar";
import { PageLoading } from "../components/PageLoading";
import { PageTitle, SectionLabel } from "../components/Typography";
import { IconLinkAction } from "../components/IconActionButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr).getTime() < Date.now();
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function greetingWord(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const CARD_BASE =
  "rounded-xl border border-border bg-card p-5 transition-colors duration-150 hover:bg-overlay-subtle";
const CARD_SHADOW = "";

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

  const active = members.filter((m) => m.active);
  const due = active
    .filter((m) => daysUntil(m.nextDueDate) <= 3)
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
  const upcoming = active
    .filter((m) => daysUntil(m.nextDueDate) > 3)
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="mb-2 text-[0.8rem] tracking-wide text-[var(--muted-foreground-2)] uppercase">
            {todayLabel}
          </p>
          <PageTitle className="mb-0">{greetingWord()}</PageTitle>
        </div>
        <Button variant="outline" asChild>
          <Link to="/team">Manage team</Link>
        </Button>
      </div>

      <SectionLabel>Due now / this week</SectionLabel>
      {due.length === 0 && (
        <p className="mb-10 rounded-xl border border-dashed border-input bg-card p-6 text-center text-[0.95rem] text-muted-foreground">
          Nothing due in the next few days — you're all caught up.
        </p>
      )}
      {due.length > 0 && (
        <div className="mb-10 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {due.map((m) => (
            <div key={m.id} className={cn(CARD_BASE, CARD_SHADOW)}>
              <div className="mb-3 flex items-center gap-2.5">
                <MemberAvatar id={m.id} name={m.name} />
                <div>
                  <div className="text-[0.95rem] font-semibold">{m.name}</div>
                  {m.role && <div className="text-[0.78rem] text-[var(--muted-foreground-2)]">{m.role}</div>}
                </div>
              </div>
              <Badge variant={isOverdue(m.nextDueDate) ? "destructive" : "warning"}>
                {isOverdue(m.nextDueDate)
                  ? `Overdue since ${new Date(m.nextDueDate).toLocaleDateString()}`
                  : `Due ${new Date(m.nextDueDate).toLocaleDateString()}`}
              </Badge>
              <div className="mt-3.5 flex items-center gap-2.5">
                <Button size="sm" onClick={() => startCheckIn(m)}>
                  {m.activeCheckInId ? "Resume check-in" : "Start check-in"}
                </Button>
                <IconLinkAction label="View history" icon={<ArrowUpRight />} to={`/team/${m.id}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionLabel>Upcoming</SectionLabel>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {upcoming.map((m) => (
          <div key={m.id} className={CARD_BASE}>
            <div className="mb-3 flex items-center gap-2.5">
              <MemberAvatar id={m.id} name={m.name} />
              <div>
                <div className="text-[0.95rem] font-semibold">{m.name}</div>
                {m.role && <div className="text-[0.78rem] text-[var(--muted-foreground-2)]">{m.role}</div>}
              </div>
            </div>
            <Badge>Due {new Date(m.nextDueDate).toLocaleDateString()}</Badge>
            <div className="mt-3.5 flex items-center gap-2.5">
              <Button size="sm" variant="outline" onClick={() => startCheckIn(m)}>
                {m.activeCheckInId ? "Resume check-in" : "Start early"}
              </Button>
              <Link
                to={`/team/${m.id}`}
                className="text-[0.8rem] font-semibold text-muted-foreground transition-opacity hover:opacity-70"
              >
                History →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
