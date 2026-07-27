import { cn } from "@/lib/utils";

const TITLE_SIZES = {
  default: "text-[2.4rem] mb-7",
  md: "text-[2.1rem] mb-8",
  sm: "mb-0 text-[1.9rem]",
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
    <h1 className={cn("font-bold tracking-tight text-foreground", TITLE_SIZES[size], className)}>
      {children}
    </h1>
  );
}

const LABEL_VARIANTS = {
  default: "text-muted-foreground",
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
        "mb-4 text-[0.76rem] font-semibold tracking-wide uppercase",
        LABEL_VARIANTS[variant],
        className
      )}
    >
      {children}
    </p>
  );
}
