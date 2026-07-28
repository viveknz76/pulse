export const ENERGY_LEVELS = [
  { value: 1, label: "Running low" },
  { value: 2, label: "A little flat" },
  { value: 3, label: "Steady" },
  { value: 4, label: "Feeling good" },
  { value: 5, label: "Full of energy" },
] as const;

export function energyLevelLabel(value?: number | null): string | null {
  return ENERGY_LEVELS.find((level) => level.value === value)?.label ?? null;
}
