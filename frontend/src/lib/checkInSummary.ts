import { format, parse } from "date-fns";
import { ActionItemStatus } from "@/types";
import { energyLevelLabel } from "@/lib/energyPulse";

export const ACTION_ITEM_STATUS_LABEL: Record<ActionItemStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

interface SummaryTalkingPoint {
  content: string;
  resolved: boolean;
}

interface SummaryActionItem {
  description: string;
  status: ActionItemStatus;
  dueDate?: string | null;
}

interface BuildCheckInSummaryInput {
  teamMemberName: string;
  date: Date;
  wins?: string | null;
  challenges?: string | null;
  decisions?: string | null;
  growthNotes?: string | null;
  energyLevel?: number | null;
  talkingPoints: SummaryTalkingPoint[];
  actionItems: SummaryActionItem[];
}

function formatDueDate(dueDate: string): string {
  // Draft form state uses a bare "yyyy-MM-dd" (local midnight); persisted API
  // data is a full ISO datetime. Parse each so neither shifts a day under TZ.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
    ? parse(dueDate, "yyyy-MM-dd", new Date())
    : new Date(dueDate);
  return format(date, "MMM d, yyyy");
}

export function buildCheckInSummaryText({
  teamMemberName,
  date,
  wins,
  challenges,
  decisions,
  growthNotes,
  energyLevel,
  talkingPoints,
  actionItems,
}: BuildCheckInSummaryInput): string {
  const lines: string[] = [];
  lines.push(`Check-in summary — ${teamMemberName}`);
  lines.push(date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }));
  const startingPulse = energyLevelLabel(energyLevel);
  if (startingPulse) {
    lines.push(`Starting pulse: ${startingPulse}`);
  }
  lines.push("");

  lines.push("Wins");
  lines.push(wins?.trim() || "—");
  lines.push("");

  lines.push("Challenges");
  lines.push(challenges?.trim() || "—");
  lines.push("");

  lines.push("Decisions");
  lines.push(decisions?.trim() || "—");
  lines.push("");

  lines.push("Growth");
  lines.push(growthNotes?.trim() || "—");
  lines.push("");

  const activePoints = talkingPoints.filter((p) => p.content.trim());
  lines.push("Talking points");
  if (activePoints.length === 0) {
    lines.push("—");
  } else {
    activePoints.forEach((p) => lines.push(`- [${p.resolved ? "x" : " "}] ${p.content.trim()}`));
  }
  lines.push("");

  const activeItems = actionItems.filter((it) => it.description.trim());
  lines.push("Action items");
  if (activeItems.length === 0) {
    lines.push("—");
  } else {
    activeItems.forEach((it) => {
      const due = it.dueDate ? ` (due ${formatDueDate(it.dueDate)})` : "";
      lines.push(`- [${ACTION_ITEM_STATUS_LABEL[it.status]}] ${it.description.trim()}${due}`);
    });
  }

  return lines.join("\n");
}
