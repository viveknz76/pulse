import type { LucideIcon } from "lucide-react";
import { CheckCircle2, ListChecks, TrendingUp, Trophy } from "lucide-react";
import type { CheckIn } from "@/types";
import { ENERGY_COLORS } from "@/lib/energyPalette";
import { StatusDot } from "@/components/StatusDot";

interface MomentStyle {
  label: string;
  Icon: LucideIcon;
  color: string;
}

const MOMENT_STYLES = {
  win: { label: "Win", Icon: Trophy, color: ENERGY_COLORS[1] },
  decision: { label: "Decision", Icon: CheckCircle2, color: ENERGY_COLORS[3] },
  growth: { label: "Growth", Icon: TrendingUp, color: ENERGY_COLORS[0] },
  commitment: { label: "Commitments", Icon: ListChecks, color: ENERGY_COLORS[4] },
} satisfies Record<string, MomentStyle>;

function MomentIcon({ moment }: { moment: MomentStyle }) {
  const { Icon, color } = moment;

  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-lg"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
      aria-hidden="true"
    >
      <Icon className="size-4" strokeWidth={2.2} />
    </span>
  );
}

function NarrativeMoment({
  moment,
  children,
}: {
  moment: MomentStyle;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-muted/55 p-4">
      <div className="flex items-start gap-3">
        <MomentIcon moment={moment} />
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {moment.label}
          </p>
          <p className="text-[0.92rem] leading-relaxed whitespace-pre-line">{children}</p>
        </div>
      </div>
    </div>
  );
}

export function RelationshipTimeline({ checkIns }: { checkIns: CheckIn[] }) {
  const moments = [...checkIns]
    .filter(
      (checkIn) =>
        checkIn.wins?.trim() ||
        checkIn.decisions?.trim() ||
        checkIn.growthNotes?.trim() ||
        checkIn.actionItems.some((item) => item.description.trim())
    )
    .sort(
      (a, b) =>
        new Date(b.completedAt || b.scheduledDate).getTime() -
        new Date(a.completedAt || a.scheduledDate).getTime()
    );

  if (moments.length === 0) {
    return (
      <div className="mb-10 rounded-xl bg-muted/45 px-5 py-6 text-center">
        <p className="text-sm font-medium">Your timeline will grow with each check-in.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Wins, decisions, growth, and commitments will appear here.
        </p>
      </div>
    );
  }

  return (
    <ol className="mb-10" aria-label="Relationship timeline">
      {moments.map((checkIn) => {
        const date = new Date(checkIn.completedAt || checkIn.scheduledDate);
        const commitments = checkIn.actionItems.filter((item) => item.description.trim());

        return (
          <li
            key={checkIn.id}
            className="group relative pb-8 pl-9 last:pb-0"
          >
            <span
              className="absolute top-3 bottom-[-0.75rem] left-[7px] w-px bg-border group-last:hidden"
              aria-hidden="true"
            />
            <span
              className="absolute top-2 left-0 size-[15px] rounded-full border-[3px] border-background bg-primary"
              aria-hidden="true"
            />

            <div className="mb-3 flex flex-wrap items-baseline gap-x-2">
              <time
                dateTime={date.toISOString()}
                className="text-sm font-semibold text-foreground"
              >
                {date.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              <span className="text-xs text-muted-foreground">
                {[
                  checkIn.wins?.trim(),
                  checkIn.decisions?.trim(),
                  checkIn.growthNotes?.trim(),
                  commitments.length > 0,
                ].filter(Boolean).length}{" "}
                moments
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {checkIn.wins?.trim() && (
                <NarrativeMoment moment={MOMENT_STYLES.win}>{checkIn.wins}</NarrativeMoment>
              )}
              {checkIn.decisions?.trim() && (
                <NarrativeMoment moment={MOMENT_STYLES.decision}>
                  {checkIn.decisions}
                </NarrativeMoment>
              )}
              {checkIn.growthNotes?.trim() && (
                <NarrativeMoment moment={MOMENT_STYLES.growth}>
                  {checkIn.growthNotes}
                </NarrativeMoment>
              )}
              {commitments.length > 0 && (
                <div className="rounded-xl bg-muted/55 p-4">
                  <div className="flex items-start gap-3">
                    <MomentIcon moment={MOMENT_STYLES.commitment} />
                    <div className="min-w-0 flex-1">
                      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {MOMENT_STYLES.commitment.label}
                      </p>
                      <ul className="space-y-2">
                        {commitments.map((item) => (
                          <li key={item.id} className="flex items-start gap-2 text-[0.92rem]">
                            <span className="mt-1">
                              <StatusDot status={item.status} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="leading-relaxed">{item.description}</p>
                              {item.dueDate && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Due {new Date(item.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
