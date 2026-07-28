import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface JourneyStep {
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}

export function GuidedJourney({
  steps,
  currentStep,
  onStepChange,
  children,
}: {
  steps: JourneyStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode;
}) {
  const step = steps[currentStep];
  const StepIcon = step.Icon;

  return (
    <>
      <nav aria-label="Check-in progress" className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground sm:hidden">
          <span>
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="font-semibold text-foreground">{step.label}</span>
        </div>
        <ol
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map((journeyStep, index) => {
            const complete = index < currentStep;
            const active = index === currentStep;

            return (
              <li key={journeyStep.label}>
                <button
                  type="button"
                  onClick={() => onStepChange(index)}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Step ${index + 1}: ${journeyStep.label}`}
                  className="group w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span
                    className={cn(
                      "flex h-1.5 w-full rounded-full transition-colors",
                      index <= currentStep ? "bg-primary" : "bg-overlay-strong"
                    )}
                    aria-hidden="true"
                  />
                  <span className="mt-2 hidden items-center justify-center gap-1.5 text-xs font-medium sm:flex">
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full transition-colors",
                        active && "bg-primary text-primary-foreground",
                        complete && "bg-brand-soft text-brand-strong",
                        !active && !complete && "bg-muted text-muted-foreground"
                      )}
                      aria-hidden="true"
                    >
                      {complete ? <Check className="size-3" /> : index + 1}
                    </span>
                    <span className={cn(active ? "text-foreground" : "text-muted-foreground")}>
                      {journeyStep.label}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <section
        key={currentStep}
        aria-labelledby="journey-step-title"
        className="animate-in fade-in slide-in-from-right-2 rounded-2xl bg-card p-5 shadow-[var(--surface-shadow)] duration-200 sm:p-7"
      >
        <header className="mb-6 flex items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"
            aria-hidden="true"
          >
            <StepIcon className="size-5" />
          </span>
          <div>
            <p className="mb-0.5 text-xs font-semibold tracking-wide text-brand-strong uppercase">
              {step.eyebrow}
            </p>
            <h2 id="journey-step-title" className="text-xl font-semibold tracking-tight">
              {step.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </div>
        </header>
        {children}
      </section>
    </>
  );
}
