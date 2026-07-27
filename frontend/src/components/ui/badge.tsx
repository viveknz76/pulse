import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold w-fit whitespace-nowrap [&>svg]:size-3 before:content-[''] before:size-1.5 before:rounded-full before:bg-current before:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary-tint)] text-primary",
        success: "bg-[var(--success-tint)] text-[var(--success-text)]",
        warning: "bg-[var(--warning-tint)] text-[var(--warning-text)]",
        destructive: "bg-[var(--destructive-tint)] text-[var(--destructive-text)]",
        secondary: "bg-muted text-muted-foreground border border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  showDot = true,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { showDot?: boolean }) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), !showDot && "before:hidden", className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
