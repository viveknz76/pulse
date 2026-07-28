import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function PulseMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl",
        "bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 text-white",
        "shadow-[0_8px_24px_var(--brand-glow)] ring-1 ring-white/20",
        className
      )}
    >
      <span className="absolute inset-x-1 top-0 h-px bg-white/50" />
      <Activity className="relative size-5" strokeWidth={2.25} />
    </span>
  );
}

export function PulseBrand({
  showTagline = false,
  centered = false,
  className,
}: {
  showTagline?: boolean;
  centered?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", centered && "flex-col text-center", className)}>
      <PulseMark className={centered ? "size-12 rounded-2xl" : undefined} />
      <div>
        <div className="text-xl font-bold tracking-[-0.035em] text-foreground">Pulse</div>
        {showTagline && (
          <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Thoughtful check-ins, meaningful momentum.
          </div>
        )}
      </div>
    </div>
  );
}
