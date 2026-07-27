import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const VARIANT_CLASSES = {
  default: "text-muted-foreground hover:text-foreground hover:bg-white/5",
  primary: "text-primary hover:bg-white/5",
  danger: "text-destructive hover:bg-destructive/10",
};

interface IconActionButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: keyof typeof VARIANT_CLASSES;
  className?: string;
}

export function IconActionButton({
  label,
  icon,
  onClick,
  type = "button",
  disabled,
  variant = "default",
  className,
}: IconActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type={type}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={cn(
            "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4",
            VARIANT_CLASSES[variant],
            className
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

interface IconLinkActionProps {
  label: string;
  icon: React.ReactNode;
  to: string;
  variant?: keyof typeof VARIANT_CLASSES;
  className?: string;
}

export function IconLinkAction({ label, icon, to, variant = "default", className }: IconLinkActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={to}
          aria-label={label}
          className={cn(
            "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors [&_svg]:size-4",
            VARIANT_CLASSES[variant],
            className
          )}
        >
          {icon}
        </Link>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
