import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  delta?: number | null;
  mono?: boolean;
};

export function MetricCard({ label, value, delta, mono = true }: Props) {
  const deltaColor =
    delta == null
      ? undefined
      : delta >= 0
        ? "text-teal"
        : "text-amber";

  return (
    <div className="border border-hairline bg-panel rounded-card px-4 py-3 min-w-0">
      <div className="font-sans text-eyebrow uppercase text-secondary mb-2">{label}</div>
      <div className={`${mono ? "font-mono text-metric-lg" : "font-sans text-section-header"} text-primary truncate`}>
        {value}
      </div>
      {delta != null && (
        <div className={`font-mono text-metric-sm mt-1 ${deltaColor}`}>
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(2)}
        </div>
      )}
    </div>
  );
}
