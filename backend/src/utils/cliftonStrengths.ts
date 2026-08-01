import { z } from "zod";

export const CLIFTON_STRENGTHS = [
  "ACHIEVER",
  "ACTIVATOR",
  "ADAPTABILITY",
  "ANALYTICAL",
  "ARRANGER",
  "BELIEF",
  "COMMAND",
  "COMMUNICATION",
  "COMPETITION",
  "CONNECTEDNESS",
  "CONSISTENCY",
  "CONTEXT",
  "DELIBERATIVE",
  "DEVELOPER",
  "DISCIPLINE",
  "EMPATHY",
  "FOCUS",
  "FUTURISTIC",
  "HARMONY",
  "IDEATION",
  "INCLUDER",
  "INDIVIDUALIZATION",
  "INPUT",
  "INTELLECTION",
  "LEARNER",
  "MAXIMIZER",
  "POSITIVITY",
  "RELATOR",
  "RESPONSIBILITY",
  "RESTORATIVE",
  "SELF_ASSURANCE",
  "SIGNIFICANCE",
  "STRATEGIC",
  "WOO",
] as const;

export const cliftonStrengthEnum = z.enum(CLIFTON_STRENGTHS);

export const cliftonStrengthsSchema = z
  .array(cliftonStrengthEnum)
  .max(5, "Choose no more than five strengths")
  .refine((strengths) => new Set(strengths).size === strengths.length, {
    message: "Choose each strength only once",
  });
