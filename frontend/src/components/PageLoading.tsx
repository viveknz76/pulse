import { PulseMark } from "./PulseBrand";

export function PageLoading() {
  return (
    <div className="flex flex-col items-center gap-3 p-12 text-center text-sm text-muted-foreground">
      <PulseMark className="size-9 animate-pulse rounded-xl" />
      <span>Loading your pulse…</span>
    </div>
  );
}
