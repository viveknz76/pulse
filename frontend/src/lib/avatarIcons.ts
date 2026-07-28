import {
  Coffee,
  Leaf,
  Rocket,
  Smile,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import { ENERGY_COLORS, ENERGY_ON_COLOR } from "./energyPalette";

const AVATAR_ICONS: {
  Icon: LucideIcon;
  background: string;
  color: string;
}[] = [
  { Icon: Smile, background: ENERGY_COLORS[0], color: ENERGY_ON_COLOR },
  { Icon: Coffee, background: ENERGY_COLORS[1], color: ENERGY_ON_COLOR },
  { Icon: Sparkles, background: ENERGY_COLORS[2], color: ENERGY_ON_COLOR },
  { Icon: Rocket, background: ENERGY_COLORS[3], color: ENERGY_ON_COLOR },
  { Icon: Star, background: ENERGY_COLORS[4], color: ENERGY_ON_COLOR },
  { Icon: Leaf, background: ENERGY_COLORS[5], color: ENERGY_ON_COLOR },
];

export function avatarChoiceSeeds(memberId: string): string[] {
  return Array.from({ length: 6 }, (_, index) => `${memberId}:pulse:${index + 1}`);
}

export function avatarIcon(seed: string) {
  const option = Number(seed.match(/:pulse:(\d+)$/)?.[1] || 1);
  return AVATAR_ICONS[(option - 1) % AVATAR_ICONS.length];
}
