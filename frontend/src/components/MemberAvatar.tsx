import * as Avatar from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";
import { apiAssetUrl } from "../api/client";
import { avatarIcon } from "../lib/avatarIcons";
import { avatarStyle, initials } from "../utils/avatar";

const SIZES = {
  sm: "size-[34px] text-[0.78rem]",
  md: "size-10 text-[0.8rem]",
  lg: "size-14 text-[1.05rem]",
};

export function MemberAvatar({
  id,
  name,
  avatarUrl,
  avatarSeed,
  size = "md",
  className,
}: {
  id: string;
  name: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const iconOption = avatarSeed ? avatarIcon(avatarSeed) : null;
  const AvatarIcon = iconOption?.Icon;

  return (
    <Avatar.Root
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full ring-1 ring-black/10",
        SIZES[size],
        className
      )}
    >
      <Avatar.Image
        src={apiAssetUrl(avatarUrl)}
        alt={name}
        crossOrigin="use-credentials"
        className="size-full object-cover"
      />
      <Avatar.Fallback
        className="flex size-full items-center justify-center font-semibold"
        style={
          iconOption
            ? { background: iconOption.background, color: iconOption.color }
            : avatarStyle(id)
        }
        delayMs={avatarUrl ? 250 : 0}
      >
        {AvatarIcon ? (
          <AvatarIcon className="size-[52%]" strokeWidth={2.2} aria-hidden="true" />
        ) : (
          initials(name)
        )}
      </Avatar.Fallback>
    </Avatar.Root>
  );
}
