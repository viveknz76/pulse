import type { CSSProperties } from "react";
import { Check } from "lucide-react";

const CONFETTI = [
  { x: "-64px", y: "-42px", r: "-38deg", color: "#818cf8", delay: "20ms" },
  { x: "-42px", y: "-72px", r: "24deg", color: "#a78bfa", delay: "70ms" },
  { x: "-8px", y: "-82px", r: "64deg", color: "#6366f1", delay: "0ms" },
  { x: "34px", y: "-70px", r: "112deg", color: "#c4b5fd", delay: "90ms" },
  { x: "67px", y: "-38px", r: "148deg", color: "#818cf8", delay: "30ms" },
  { x: "74px", y: "4px", r: "188deg", color: "#a78bfa", delay: "110ms" },
  { x: "52px", y: "38px", r: "218deg", color: "#6366f1", delay: "50ms" },
  { x: "14px", y: "56px", r: "260deg", color: "#c4b5fd", delay: "120ms" },
  { x: "-34px", y: "48px", r: "302deg", color: "#818cf8", delay: "40ms" },
  { x: "-70px", y: "20px", r: "344deg", color: "#a78bfa", delay: "100ms" },
] as const;

type ConfettiStyle = CSSProperties & {
  "--confetti-x": string;
  "--confetti-y": string;
  "--confetti-rotation": string;
};

export function CompletionCelebration() {
  return (
    <div className="relative mx-auto h-24 w-44" aria-hidden="true">
      {CONFETTI.map((piece, index) => (
        <span
          key={index}
          className="pulse-confetti-piece"
          style={
            {
              "--confetti-x": piece.x,
              "--confetti-y": piece.y,
              "--confetti-rotation": piece.r,
              backgroundColor: piece.color,
              animationDelay: piece.delay,
            } as ConfettiStyle
          }
        />
      ))}
      <div className="pulse-celebration-mark absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_14px_36px_var(--brand-glow)] ring-1 ring-white/25">
        <Check className="size-8" strokeWidth={2.5} />
      </div>
    </div>
  );
}
