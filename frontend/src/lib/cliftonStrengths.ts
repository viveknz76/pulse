export const CLIFTON_STRENGTH_OPTIONS = [
  { value: "ACHIEVER", label: "Achiever" },
  { value: "ACTIVATOR", label: "Activator" },
  { value: "ADAPTABILITY", label: "Adaptability" },
  { value: "ANALYTICAL", label: "Analytical" },
  { value: "ARRANGER", label: "Arranger" },
  { value: "BELIEF", label: "Belief" },
  { value: "COMMAND", label: "Command" },
  { value: "COMMUNICATION", label: "Communication" },
  { value: "COMPETITION", label: "Competition" },
  { value: "CONNECTEDNESS", label: "Connectedness" },
  { value: "CONSISTENCY", label: "Consistency" },
  { value: "CONTEXT", label: "Context" },
  { value: "DELIBERATIVE", label: "Deliberative" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "DISCIPLINE", label: "Discipline" },
  { value: "EMPATHY", label: "Empathy" },
  { value: "FOCUS", label: "Focus" },
  { value: "FUTURISTIC", label: "Futuristic" },
  { value: "HARMONY", label: "Harmony" },
  { value: "IDEATION", label: "Ideation" },
  { value: "INCLUDER", label: "Includer" },
  { value: "INDIVIDUALIZATION", label: "Individualization" },
  { value: "INPUT", label: "Input" },
  { value: "INTELLECTION", label: "Intellection" },
  { value: "LEARNER", label: "Learner" },
  { value: "MAXIMIZER", label: "Maximizer" },
  { value: "POSITIVITY", label: "Positivity" },
  { value: "RELATOR", label: "Relator" },
  { value: "RESPONSIBILITY", label: "Responsibility" },
  { value: "RESTORATIVE", label: "Restorative" },
  { value: "SELF_ASSURANCE", label: "Self-Assurance" },
  { value: "SIGNIFICANCE", label: "Significance" },
  { value: "STRATEGIC", label: "Strategic" },
  { value: "WOO", label: "Woo" },
] as const;

export type CliftonStrength = (typeof CLIFTON_STRENGTH_OPTIONS)[number]["value"];

const CLIFTON_STRENGTH_LABELS = new Map(
  CLIFTON_STRENGTH_OPTIONS.map((option) => [option.value, option.label])
);

export function cliftonStrengthLabel(strength: CliftonStrength): string {
  return CLIFTON_STRENGTH_LABELS.get(strength) || strength;
}
