import { ENERGY_COLORS, ENERGY_ON_COLOR } from "../lib/energyPalette";

export function avatarStyle(id: string): { background: string; color: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return {
    background: ENERGY_COLORS[hash % ENERGY_COLORS.length],
    color: ENERGY_ON_COLOR,
  };
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
