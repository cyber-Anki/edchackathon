type State = "complete" | "running" | "failed";

const LABELS: Record<State, string> = {
  complete: "complete",
  running: "running",
  failed: "failed",
};

export function StatusPill({ state }: { state: State }) {
  const dotClass =
    state === "complete"
      ? "bg-teal"
      : state === "failed"
        ? "bg-red-muted"
        : "bg-tertiary status-dot-running";

  return (
    <span className="inline-flex items-center gap-2 font-sans text-caption text-secondary">
      <span className={`inline-block w-[6px] h-[6px] rounded-badge ${dotClass}`} aria-hidden />
      <span className="font-mono text-metric-sm">{LABELS[state]}</span>
    </span>
  );
}
