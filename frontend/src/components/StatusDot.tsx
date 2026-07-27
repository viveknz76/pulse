import { cn } from "@/lib/utils";
import { ActionItemStatus } from "../types";

const COLORS: Record<ActionItemStatus, string> = {
  OPEN: "bg-[var(--warning)]",
  IN_PROGRESS: "bg-primary",
  DONE: "bg-[var(--success)]",
};

export function StatusDot({ status, className }: { status: ActionItemStatus; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", COLORS[status], className)} />;
}
