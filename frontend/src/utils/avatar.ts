const AVATAR_PALETTE = [
  { background: "#ccfbf1", color: "#115e59" },
  { background: "#fef3c7", color: "#92400e" },
  { background: "#ffe4e6", color: "#9f1239" },
  { background: "#e0f2fe", color: "#075985" },
  { background: "#f3e8ff", color: "#6b21a8" },
  { background: "#e2e8f0", color: "#334155" },
];

export function avatarStyle(id: string): { background: string; color: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
