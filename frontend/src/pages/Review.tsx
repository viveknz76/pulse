import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { ActionItem, ActionItemStatus, ReviewData } from "../types";
import { PageLoading } from "../components/PageLoading";
import { PageTitle, SectionLabel } from "../components/Typography";
import { StatusDot } from "../components/StatusDot";

const CARD_CLASS =
  "rounded-xl border border-border bg-card px-5";
const ROW_CLASS =
  "flex flex-wrap items-center justify-between gap-4 border-b border-border py-3.5 text-sm last:border-b-0";
const ACTION_LINK_CLASS =
  "cursor-pointer text-[0.8rem] font-semibold text-primary transition-opacity hover:opacity-70";

function ActionItemRow({ item, onChanged }: { item: ActionItem; onChanged: () => void }) {
  async function setStatus(status: ActionItemStatus) {
    await api.patch(`/api/action-items/${item.id}`, { status });
    onChanged();
  }

  async function carryOver() {
    await api.post(`/api/action-items/${item.id}/carry-over`);
    onChanged();
  }

  return (
    <li className={ROW_CLASS}>
      <div className="flex items-center gap-2">
        <StatusDot status={item.status} />
        <strong>{item.teamMember?.name}</strong>
        <span>{item.description}</span>
        {item.dueDate && (
          <span className="text-muted-foreground">
            — due {new Date(item.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3.5 whitespace-nowrap">
        {item.status !== "DONE" && (
          <>
            {item.status === "OPEN" && (
              <button className={ACTION_LINK_CLASS} onClick={() => setStatus("IN_PROGRESS")}>
                In progress
              </button>
            )}
            <button className={ACTION_LINK_CLASS} onClick={() => setStatus("DONE")}>
              Done
            </button>
            <button className={ACTION_LINK_CLASS} onClick={carryOver}>
              Carry over
            </button>
          </>
        )}
        <Link
          to={`/team/${item.teamMemberId}`}
          className="text-[0.8rem] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          View →
        </Link>
      </div>
    </li>
  );
}

export default function Review() {
  const [data, setData] = useState<ReviewData | null>(null);

  function load() {
    api.get<ReviewData>("/api/review").then(setData);
  }

  useEffect(load, []);

  if (!data) return <PageLoading />;

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

      <div className="mb-8">
        <SectionLabel variant="attention">Overdue ({data.overdue.length})</SectionLabel>
        {data.overdue.length === 0 && <p className="text-sm text-muted-foreground">Nothing overdue.</p>}
        {data.overdue.length > 0 && (
          <ul className={CARD_CLASS}>
            {data.overdue.map((item) => (
              <ActionItemRow key={item.id} item={item} onChanged={load} />
            ))}
          </ul>
        )}
      </div>

      <div className="mb-8">
        <SectionLabel variant="attention">Due this week ({data.dueThisWeek.length})</SectionLabel>
        {data.dueThisWeek.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing due this week.</p>
        )}
        {data.dueThisWeek.length > 0 && (
          <ul className={CARD_CLASS}>
            {data.dueThisWeek.map((item) => (
              <ActionItemRow key={item.id} item={item} onChanged={load} />
            ))}
          </ul>
        )}
      </div>

      <div className="mb-8">
        <SectionLabel>No due date ({data.noDueDate.length})</SectionLabel>
        {data.noDueDate.length > 0 && (
          <ul className={CARD_CLASS}>
            {data.noDueDate.map((item) => (
              <ActionItemRow key={item.id} item={item} onChanged={load} />
            ))}
          </ul>
        )}
      </div>

      <div className="mb-8">
        <SectionLabel>Upcoming ({data.upcoming.length})</SectionLabel>
        {data.upcoming.length > 0 && (
          <ul className={CARD_CLASS}>
            {data.upcoming.map((item) => (
              <ActionItemRow key={item.id} item={item} onChanged={load} />
            ))}
          </ul>
        )}
      </div>

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
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
