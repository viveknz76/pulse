import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold shadow-none ring-1 ring-inset ring-overlay-strong transition-colors disabled:pointer-events-none disabled:cursor-default disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground ring-overlay-strong hover:bg-[var(--primary-hover)]",
        destructive:
          "bg-destructive/10 text-destructive ring-destructive/15 hover:bg-destructive/15 focus-visible:ring-destructive/20",
        outline: "border-0 bg-overlay-subtle ring-overlay-strong hover:bg-overlay-strong text-foreground",
        secondary: "bg-secondary text-secondary-foreground ring-overlay-strong hover:bg-overlay-strong",
        ghost: "ring-0 hover:bg-accent hover:text-accent-foreground",
        link: "ring-0 text-foreground underline-offset-4 hover:underline",
        success:
          "bg-[var(--success-tint)] text-[var(--success-text)] ring-[var(--success)]/20 hover:bg-[var(--success)]/15",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-5",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
