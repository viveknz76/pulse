import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Check, CornerUpRight, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import {
  ActionItem,
  ActionItemOwner,
  ActionItemStatus,
  ReviewData,
} from "../types";
import { PageLoading } from "../components/PageLoading";
import { PageTitle, SectionLabel } from "../components/Typography";
import { StatusDot } from "../components/StatusDot";
import { IconActionButton, IconLinkAction } from "../components/IconActionButton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CARD_CLASS =
  "rounded-xl border border-border bg-card px-5";
const ROW_CLASS =
  "flex flex-wrap items-center justify-between gap-4 border-b border-border py-3.5 text-sm last:border-b-0";

function ActionItemRow({ item, onChanged }: { item: ActionItem; onChanged: () => void }) {
  const dueDate = item.dueDate ? new Date(item.dueDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = !!dueDate && dueDate.getTime() < today.getTime();

  async function setStatus(status: ActionItemStatus) {
    await api.patch(`/api/action-items/${item.id}`, { status });
    if (status === "DONE") {
      toast.success("Commitment complete — nice momentum.");
    } else if (status === "IN_PROGRESS") {
      toast("Moved into progress.");
    }
    onChanged();
  }

  async function carryOver() {
    await api.post(`/api/action-items/${item.id}/carry-over`);
    toast("Carried forward — still in view.");
    onChanged();
  }

  async function setOwner(owner: ActionItemOwner) {
    await api.patch(`/api/action-items/${item.id}`, { owner });
    toast.success("Commitment owner updated");
    onChanged();
  }

  return (
    <li className={ROW_CLASS}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <StatusDot status={item.status} />
          <strong>{item.teamMember?.name}</strong>
          <span>{item.description}</span>
        </div>
        {item.dueDate && (
          <div className="mt-1 flex items-center gap-2 pl-4">
            <p className="text-xs text-muted-foreground">
              Due {new Date(item.dueDate).toLocaleDateString()}
            </p>
            {overdue && <Badge variant="destructive">Overdue</Badge>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {item.status !== "DONE" && (
          <Select value={item.owner} onValueChange={(value) => setOwner(value as ActionItemOwner)}>
            <SelectTrigger className="mr-1 h-8 w-[130px]" aria-label="Commitment owner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MANAGER">Me</SelectItem>
              <SelectItem value="TEAM_MEMBER">{item.teamMember?.name || "Team member"}</SelectItem>
              <SelectItem value="SHARED">Shared</SelectItem>
            </SelectContent>
          </Select>
        )}
        {item.status !== "DONE" && (
          <>
            {item.status === "OPEN" && (
              <IconActionButton
                label="Mark in progress"
                icon={<Clock />}
                variant="primary"
                onClick={() => setStatus("IN_PROGRESS")}
              />
            )}
            <IconActionButton
              label="Mark done"
              icon={<Check />}
              variant="primary"
              onClick={() => setStatus("DONE")}
            />
            <IconActionButton
              label="Carry over"
              icon={<CornerUpRight />}
              variant="primary"
              onClick={carryOver}
            />
          </>
        )}
        <IconLinkAction label="View person" icon={<ArrowUpRight />} to={`/team/${item.teamMemberId}`} />
      </div>
    </li>
  );
}

function CommitmentGroup({
  title,
  description,
  items,
  onChanged,
}: {
  title: string;
  description: string;
  items: ActionItem[];
  onChanged: () => void;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant={items.length > 0 ? "default" : "secondary"}>{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-5 py-6 text-center text-sm text-muted-foreground">
          Nothing waiting here.
        </div>
      ) : (
        <ul className={CARD_CLASS}>
          {items.map((item) => (
            <ActionItemRow key={item.id} item={item} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Review() {
  const [data, setData] = useState<ReviewData | null>(null);

  function load() {
    api.get<ReviewData>("/api/review").then(setData);
  }

  useEffect(load, []);

  if (!data) return <PageLoading />;

  const openCommitments = [
    ...data.overdue,
    ...data.dueThisWeek,
    ...data.noDueDate,
    ...data.upcoming,
  ];
  const mine = openCommitments.filter((item) => item.owner === "MANAGER");
  const teamOwned = openCommitments.filter((item) => item.owner === "TEAM_MEMBER");
  const shared = openCommitments.filter((item) => item.owner === "SHARED");

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-8">
        <PageTitle className="mb-1.5">Weekly review</PageTitle>
        <p className="text-[0.9rem] text-[var(--muted-foreground-2)]">
          {new Date(data.weekStart).toLocaleDateString()} – {new Date(data.weekEnd).toLocaleDateString()}
        </p>
      </div>

      {data.checkInsDueThisWeek.length > 0 && (
        <div className="mb-8">
          <SectionLabel>Check-ins due this week</SectionLabel>
          <ul className="flex flex-col gap-2">
            {data.checkInsDueThisWeek.map(({ teamMember, nextDueDate }) => (
              <li
                key={teamMember.id}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
              >
                <Link to={`/team/${teamMember.id}`} className="font-semibold hover:text-primary">
                  {teamMember.name}
                </Link>{" "}
                <span className="text-muted-foreground">
                  — due {new Date(nextDueDate).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SectionLabel>Commitments by owner</SectionLabel>
      <CommitmentGroup
        title="Mine"
        description="Commitments you own as the manager."
        items={mine}
        onChanged={load}
      />
      <CommitmentGroup
        title="Team-owned"
        description="Commitments owned by individual team members."
        items={teamOwned}
        onChanged={load}
      />
      <CommitmentGroup
        title="Shared"
        description="Commitments you agreed to move forward together."
        items={shared}
        onChanged={load}
      />

      <div>
        <SectionLabel variant="success">Completed this week ({data.recentlyCompleted.length})</SectionLabel>
        <ul className="flex flex-col gap-2">
          {data.recentlyCompleted.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-[0.88rem] opacity-65"
            >
              <StatusDot status="DONE" className="mr-2" />
              <strong>{item.teamMember?.name}</strong> — {item.description}
              <Badge variant="secondary" className="ml-2">
                {item.owner === "MANAGER"
                  ? "Me"
                  : item.owner === "TEAM_MEMBER"
                    ? item.teamMember?.name || "Team member"
                    : "Shared"}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
