import { cn } from "@/lib/utils";

const TITLE_SIZES = {
  default: "text-2xl mb-6",
  md: "text-xl mb-7",
  sm: "mb-0 text-xl",
};

export function PageTitle({
  children,
  size = "default",
  className,
}: {
  children: React.ReactNode;
  size?: keyof typeof TITLE_SIZES;
  className?: string;
}) {
  return (
    <h1 className={cn("font-semibold tracking-tight text-foreground", TITLE_SIZES[size], className)}>
      {children}
    </h1>
  );
}

const LABEL_VARIANTS = {
  default: "text-foreground",
  attention: "text-[var(--warning-text)]",
  success: "text-[var(--success-text)]",
};

export function SectionLabel({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof LABEL_VARIANTS;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-4 border-b border-border pb-3 text-sm font-semibold",
        LABEL_VARIANTS[variant],
        className
      )}
    >
      {children}
    </p>
  );
}
