import { ENERGY_LEVELS } from "@/lib/energyPulse";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function EnergyPulse({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const selectedLabel = ENERGY_LEVELS.find((level) => level.value === value)?.label;

  return (
    <fieldset className="mb-7 rounded-xl border border-border bg-card px-4 py-3.5">
      <legend className="sr-only">Starting energy</legend>
      <div className="mb-2 flex min-h-5 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <span className="text-[0.88rem] font-semibold text-foreground">Starting energy</span>
          <span className="ml-2 text-xs text-muted-foreground">Optional</span>
        </div>
        <p
          className={cn(
            "text-xs",
            selectedLabel ? "font-semibold text-brand-strong" : "text-muted-foreground"
          )}
          aria-live="polite"
        >
          {selectedLabel ? `${value} — ${selectedLabel}` : "How are they arriving today?"}
        </p>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <span className="text-[0.68rem] font-medium text-muted-foreground">Low</span>
        <div
          className="relative mx-auto grid w-full max-w-[250px] grid-cols-5"
          aria-label="Starting energy level"
        >
          <div
            aria-hidden="true"
            className="absolute top-1/2 right-[22px] left-[22px] h-px -translate-y-1/2 bg-border"
          />
          {ENERGY_LEVELS.map((level) => {
            const selected = value === level.value;
            return (
              <Tooltip key={level.value}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${level.value} out of 5: ${level.label}`}
                    onClick={() => onChange(selected ? null : level.value)}
                    className="relative z-10 flex size-11 items-center justify-center justify-self-center rounded-full outline-none transition-transform active:scale-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full text-xs font-bold ring-1 ring-inset transition-all",
                        selected
                          ? "scale-110 bg-primary text-primary-foreground ring-primary shadow-[0_5px_16px_var(--brand-glow)]"
                          : "bg-card text-muted-foreground ring-overlay-strong hover:bg-brand-soft hover:text-brand-strong hover:ring-brand-border"
                      )}
                    >
                      {level.value}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {level.value} — {level.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <span className="text-[0.68rem] font-medium text-muted-foreground">High</span>
      </div>

      {selectedLabel && (
        <p className="mt-1 text-center text-[0.68rem] text-muted-foreground">
          Select {value} again to clear
        </p>
      )}
    </fieldset>
  );
}
