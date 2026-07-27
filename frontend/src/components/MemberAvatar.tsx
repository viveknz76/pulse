import { cn } from "@/lib/utils";
import { avatarColor, initials } from "../utils/avatar";

const SIZES = {
  sm: "size-[34px] text-[0.78rem]",
  md: "size-10 text-[0.8rem]",
  lg: "size-14 text-[1.05rem]",
};

export function MemberAvatar({
  id,
  name,
  size = "md",
  className,
}: {
  id: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        SIZES[size],
        className
      )}
      style={{ background: avatarColor(id) }}
    >
      {initials(name)}
    </div>
  );
}
