export const ENERGY_LEVELS = [
  { value: 1, emoji: "🌙", label: "Running low" },
  { value: 2, emoji: "🌧️", label: "A little flat" },
  { value: 3, emoji: "🌤️", label: "Steady" },
  { value: 4, emoji: "☀️", label: "Feeling good" },
  { value: 5, emoji: "⚡", label: "Full of energy" },
] as const;

export function energyLevelLabel(value?: number | null): string | null {
  return ENERGY_LEVELS.find((level) => level.value === value)?.label ?? null;
}
