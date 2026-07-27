import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-white/5 text-muted-foreground",
        success: "bg-[var(--success-tint)] text-[var(--success-text)]",
        warning: "bg-[var(--warning-tint)] text-[var(--warning-text)]",
        destructive: "bg-[var(--destructive-tint)] text-[var(--destructive-text)]",
        secondary: "bg-white/5 text-muted-foreground",
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
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
