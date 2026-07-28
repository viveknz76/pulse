import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 cursor-pointer rounded-[4px] border-0 bg-overlay-subtle shadow-none ring-1 ring-inset ring-overlay-strong outline-none transition-all duration-200 active:scale-90",
        "focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:ring-primary data-[state=checked]:shadow-[0_0_0_3px_var(--brand-glow)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex animate-in zoom-in-50 items-center justify-center text-current duration-200">
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
