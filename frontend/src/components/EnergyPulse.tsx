import { ENERGY_LEVELS } from "@/lib/energyPulse";
import { cn } from "@/lib/utils";

export function EnergyPulse({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const selectedLabel = ENERGY_LEVELS.find((level) => level.value === value)?.label;

  return (
    <fieldset className="mb-7 rounded-2xl border border-brand-border bg-gradient-to-br from-brand-soft/80 to-card p-5">
      <legend className="px-1 text-[0.88rem] font-semibold text-foreground">Starting pulse</legend>
      <p className="mb-4 text-[0.84rem] leading-relaxed text-muted-foreground">
        How are they arriving today? Capture a quick read of the room—optional, and never a
        performance score.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Starting energy level">
        {ENERGY_LEVELS.map((level) => {
          const selected = value === level.value;
          return (
            <button
              key={level.value}
              type="button"
              aria-pressed={selected}
              aria-label={`${level.value} out of 5: ${level.label}`}
              onClick={() => onChange(selected ? null : level.value)}
              className={cn(
                "group flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-center ring-1 ring-inset transition-all active:scale-[0.97]",
                selected
                  ? "bg-primary text-primary-foreground ring-primary shadow-[0_8px_22px_var(--brand-glow)]"
                  : "bg-card/70 text-muted-foreground ring-overlay-strong hover:-translate-y-0.5 hover:bg-brand-soft hover:text-brand-strong hover:ring-brand-border"
              )}
            >
              <span className="text-xl leading-none" aria-hidden="true">
                {level.emoji}
              </span>
              <span
                className={cn(
                  "text-[0.7rem] font-semibold leading-tight",
                  selected ? "text-primary-foreground" : "text-foreground"
                )}
              >
                {level.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 min-h-4 text-center text-xs text-muted-foreground" aria-live="polite">
        {selectedLabel ? `${selectedLabel} selected. Select it again to clear.` : "No pulse selected."}
      </p>
    </fieldset>
  );
}
