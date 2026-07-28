import {
  Coffee,
  Leaf,
  Rocket,
  Smile,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";

const AVATAR_ICONS: {
  Icon: LucideIcon;
  background: string;
  color: string;
}[] = [
  { Icon: Smile, background: "#ccfbf1", color: "#115e59" },
  { Icon: Coffee, background: "#fef3c7", color: "#92400e" },
  { Icon: Sparkles, background: "#ffe4e6", color: "#9f1239" },
  { Icon: Rocket, background: "#e0f2fe", color: "#075985" },
  { Icon: Star, background: "#f3e8ff", color: "#6b21a8" },
  { Icon: Leaf, background: "#e2e8f0", color: "#334155" },
];

export function avatarChoiceSeeds(memberId: string): string[] {
  return Array.from({ length: 6 }, (_, index) => `${memberId}:pulse:${index + 1}`);
}

export function avatarIcon(seed: string) {
  const option = Number(seed.match(/:pulse:(\d+)$/)?.[1] || 1);
  return AVATAR_ICONS[(option - 1) % AVATAR_ICONS.length];
}
