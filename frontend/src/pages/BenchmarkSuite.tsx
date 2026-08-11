import { useMemo, useState } from "react";
import { SectionHeader } from "../components/widgets/SectionHeader";
import { StatusPill } from "../components/widgets/StatusPill";
import { MetricLineChart } from "../components/charts/MetricLineChart";
import { ComparisonBar } from "../components/charts/ComparisonBar";
import { useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  type BenchmarkRecord,
  useBenchmarkQuery,
} from "../lib/api";

const LENGTH_OPTIONS = [64, 128, 256, 512, 1024, 2048];

type SortKey = keyof BenchmarkRecord;

export default function BenchmarkSuite() {
  const [selected, setSelected] = useState<number[]>([128, 512, 2048]);
  const [enabled, setEnabled] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("seq_len");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const queryClient = useQueryClient();

  const query = useBenchmarkQuery({ seq_lengths: selected }, enabled);

  const toggleLen = (n: number) => {
    setSelected((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b),
    );
  };

  const err = query.error instanceof ApiError ? query.error : null;

  const series = (metric: keyof BenchmarkRecord) => {
    const records = query.data?.records ?? [];
    return {
      bdh: records
        .filter((r) => r.model === "bdh")
        .map((r) => ({ seq_len: r.seq_len, value: Number(r[metric]) })),
      transformer: records
        .filter((r) => r.model === "transformer")
        .map((r) => ({ seq_len: r.seq_len, value: Number(r[metric]) })),
    };
  };

  const sortedRows = useMemo(() => {
    const rows = [...(query.data?.records ?? [])];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return rows;
  }, [query.data, sortKey, sortDir]);

  const summary = useMemo(() => {
    const records = query.data?.records;
    if (!records?.length) return null;
    const maxLen = Math.max(...records.map((r) => r.seq_len));
    const bdh = records.find((r) => r.model === "bdh" && r.seq_len === maxLen);
    const tf = records.find((r) => r.model === "transformer" && r.seq_len === maxLen);
    if (!bdh || !tf) return null;
    const delta = bdh.locality_ratio_k5 - tf.locality_ratio_k5;
    const sign = delta >= 0 ? "+" : "";
    return `At seq_len=${maxLen}, BDH shows Δ locality_ratio_k5 of ${sign}${delta.toFixed(4)} versus baseline.`;
  }, [query.data]);

  const onSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const state =
    query.isFetching || query.isLoading
      ? "running"
      : err
        ? "failed"
        : query.data
          ? "complete"
          : "running";

  return (
    <div>
      <SectionHeader
        eyebrow="PILLAR 2 · QUANTITATIVE"
        title="Benchmark Suite"
        description="Head-to-head attention entropy, sparsity, and k=5 locality across sequence lengths."
      />

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-sans text-eyebrow uppercase text-secondary">seq_lengths</span>
          {LENGTH_OPTIONS.map((n) => (
            <label
              key={n}
              className="inline-flex items-center gap-1.5 font-mono text-metric-sm text-secondary border border-hairline rounded-badge px-2 py-1 cursor-pointer hover:bg-panel-raised"
            >
              <input
                type="checkbox"
                checked={selected.includes(n)}
                onChange={() => toggleLen(n)}
                className="accent-[var(--signal-teal)]"
              />
              {n}
            </label>
          ))}
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={selected.length === 0 || query.isFetching}
          onClick={() => {
            setEnabled(true);
            void queryClient.invalidateQueries({ queryKey: ["benchmark"] });
          }}
        >
          Run Benchmark
        </button>
        {enabled && (
          <div className="flex items-center gap-2">
            <StatusPill state={state} />
            <span className="font-mono text-metric-sm text-tertiary">
              {query.data?.cached_at
                ? new Date(query.data.cached_at).toLocaleString()
                : "—"}
            </span>
          </div>
        )}
      </div>

      {!enabled ? (
        <p className="font-body text-body text-secondary">Select sequence lengths and run the benchmark.</p>
      ) : query.isLoading ? (
        <p className="font-body text-body text-secondary">
          Running benchmark across {selected.length} sequence lengths…
        </p>
      ) : err ? (
        <div className="error-panel">
          {err.body.error === "checkpoint_missing"
            ? `Checkpoint missing. Expected path: ${err.body.expected_path ?? "unknown"}`
            : err.message}
        </div>
      ) : query.data ? (
        <>
          <p className="font-mono text-metric-sm text-tertiary mb-4">
            teal = BDH · amber = Transformer
          </p>
          <div className="grid grid-cols-1 min-[1280px]:grid-cols-3 gap-4 mb-8">
            {(
              [
                ["attention_entropy", "attention_entropy"],
                ["sparsity_ratio", "sparsity_ratio"],
                ["locality_ratio_k5", "locality_ratio_k5"],
              ] as const
            ).map(([key, label]) => {
              const s = series(key);
              return (
                <div key={key} className="border border-hairline bg-panel rounded-card p-2">
                  <div className="font-sans text-eyebrow uppercase text-secondary px-2 pt-1 mb-1">
                    {label}
                  </div>
                  <MetricLineChart bdh={s.bdh} transformer={s.transformer} yLabel={label} />
                </div>
              );
            })}
          </div>

          <div className="border border-hairline bg-panel rounded-card p-2 mb-8">
            <div className="font-sans text-eyebrow uppercase text-secondary px-2 pt-1 mb-1">
              extraction_time_ms
            </div>
            <ComparisonBar
              labels={(query.data?.seq_lengths ?? []).map(String)}
              bdh={(query.data?.seq_lengths ?? []).map((len) => {
                const row = query.data?.records.find((r) => r.model === "bdh" && r.seq_len === len);
                return row?.extraction_time_ms ?? 0;
              })}
              transformer={(query.data?.seq_lengths ?? []).map((len) => {
                const row = query.data?.records.find(
                  (r) => r.model === "transformer" && r.seq_len === len,
                );
                return row?.extraction_time_ms ?? 0;
              })}
              yLabel="extraction_time_ms"
            />
          </div>

          <div className="border border-hairline rounded-card overflow-x-auto mb-4">
            <table className="data-table">
              <thead>
                <tr>
                  {(
                    [
                      "model",
                      "seq_len",
                      "attention_entropy",
                      "sparsity_ratio",
                      "locality_ratio_k5",
                      "extraction_time_ms",
                    ] as SortKey[]
                  ).map((key) => (
                    <th key={key} onClick={() => onSort(key)}>
                      {key}
                      {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={`${row.model}-${row.seq_len}`}>
                    <td className={row.model === "bdh" ? "text-teal" : "text-amber"}>{row.model}</td>
                    <td>{row.seq_len}</td>
                    <td>{row.attention_entropy.toFixed(6)}</td>
                    <td>{row.sparsity_ratio.toFixed(6)}</td>
                    <td>{row.locality_ratio_k5.toFixed(6)}</td>
                    <td>{row.extraction_time_ms.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {summary && (
            <p className="font-mono text-metric-sm text-secondary">{summary}</p>
          )}
        </>
      ) : null}
    </div>
  );
}
