import { Activity } from "lucide-react";
import { CheckIn } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateOnly, todayDateOnly } from "@/lib/dateOnly";
import { energyLevelLabel } from "@/lib/energyPulse";

type EnergyWeek = {
  start: string;
  end: string;
  label: string;
  checkIn?: CheckIn;
};

function shiftDateOnly(value: string, days: number): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function mondayOfWeek(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return shiftDateOnly(value, -daysSinceMonday);
}

function energyWeeks(checkIns: CheckIn[]): EnergyWeek[] {
  const currentWeekStart = mondayOfWeek(todayDateOnly());

  return Array.from({ length: 4 }, (_, index) => {
    const weeksAgo = 3 - index;
    const start = shiftDateOnly(currentWeekStart, weeksAgo * -7);
    const end = shiftDateOnly(start, 6);
    const checkIn = checkIns
      .filter(
        (item) =>
          item.energyLevel != null &&
          item.scheduledDate.slice(0, 10) >= start &&
          item.scheduledDate.slice(0, 10) <= end
      )
      .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))[0];

    return {
      start,
      end,
      label:
        weeksAgo === 0
          ? "This week"
          : formatDateOnly(start, { month: "short", day: "numeric" }),
      checkIn,
    };
  });
}

export function EnergyHistoryCard({ checkIns }: { checkIns: CheckIn[] }) {
  const weeks = energyWeeks(checkIns);
  const recordedCount = weeks.filter((week) => week.checkIn).length;
  const latest = [...weeks].reverse().find((week) => week.checkIn)?.checkIn;
  const latestEnergy = latest?.energyLevel ?? null;

  function energyPosition(energy: number): number {
    return ((5 - energy) / 4) * 100;
  }

  return (
    <Card className="mb-8 overflow-hidden">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4.5 text-[var(--energy-teal)]" aria-hidden="true" />
          <CardTitle>Energy pulse</CardTitle>
        </div>
        <span className="text-xs font-medium text-muted-foreground">Last 4 weeks</span>
      </CardHeader>
      <CardContent className="pb-5">
        <div className="relative ml-7 h-28" aria-label="Energy check-ins by week">
          {[5, 4, 3, 2, 1].map((level) => (
            <div
              key={level}
              className="absolute right-0 left-0 border-t border-border/70"
              style={{ top: `${energyPosition(level)}%` }}
              aria-hidden="true"
            >
              <span className="absolute -top-2 -left-7 w-4 text-right text-[0.65rem] font-medium text-muted-foreground">
                {level}
              </span>
            </div>
          ))}

          <svg className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
            {weeks.slice(0, -1).map((week, index) => {
              const nextWeek = weeks[index + 1];
              const energy = week.checkIn?.energyLevel;
              const nextEnergy = nextWeek.checkIn?.energyLevel;
              if (energy == null || nextEnergy == null) return null;

              return (
                <line
                  key={`${week.start}-${nextWeek.start}`}
                  x1={`${(index + 0.5) * 25}%`}
                  y1={`${energyPosition(energy)}%`}
                  x2={`${(index + 1.5) * 25}%`}
                  y2={`${energyPosition(nextEnergy)}%`}
                  stroke="var(--energy-teal)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.55"
                />
              );
            })}
          </svg>

          {weeks.map((week, index) => {
            const energy = week.checkIn?.energyLevel;
            if (energy == null) return null;
            const label = energyLevelLabel(energy);
            const rangeLabel = `${formatDateOnly(week.start, {
              month: "short",
              day: "numeric",
            })} to ${formatDateOnly(week.end, { month: "short", day: "numeric" })}`;

            return (
              <Tooltip key={week.start}>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--energy-teal)] text-[0.68rem] font-bold text-[var(--energy-on)] shadow-sm outline-none ring-4 ring-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    style={{
                      left: `${(index + 0.5) * 25}%`,
                      top: `${energyPosition(energy)}%`,
                    }}
                    aria-label={`${rangeLabel}: ${energy} out of 5, ${label}`}
                  >
                    {energy}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {energy} — {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="mt-3 ml-7 grid grid-cols-4">
          {weeks.map((week) => (
            <div key={week.start} className="text-center">
              {!week.checkIn && (
                <span
                  className="mx-auto mb-1.5 block size-2.5 rounded-full ring-1 ring-muted-foreground/45"
                  aria-hidden="true"
                />
              )}
              <p className="text-[0.68rem] font-medium text-muted-foreground">{week.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <p className="font-semibold text-foreground">
            {latestEnergy
              ? `Latest: ${latestEnergy} · ${energyLevelLabel(latestEnergy)}`
              : "Energy will appear after a check-in"
            }
          </p>
          <p className="text-muted-foreground">{recordedCount} of 4 recorded</p>
        </div>
      </CardContent>
    </Card>
  );
}
