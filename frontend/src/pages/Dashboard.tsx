import { useMemo, useState } from "react";
import { SectionHeader } from "../components/widgets/SectionHeader";
import { MetricCard } from "../components/widgets/MetricCard";
import { CausalWatermark } from "../components/widgets/CausalWatermark";
import { Heatmap } from "../components/charts/Heatmap";
import {
  ApiError,
  useAttentionQuery,
  useBenchmarkQuery,
  useInvalidateAll,
  useOverviewQuery,
  useStatusQuery,
} from "../lib/api";

function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return "–";
  return n.toFixed(digits);
}

/** Map sentence length into a valid attention seq_len (16–128, step 16). */
function seqFromSentence(text: string): number {
  const raw = text.trim().length || 32;
  const clamped = Math.max(16, Math.min(128, raw));
  return Math.max(16, Math.round(clamped / 16) * 16);
}

export default function Dashboard() {
  const status = useStatusQuery();
  const layers = status.data?.layers ?? 4;
  const heads = status.data?.heads ?? 4;

  const [sentence, setSentence] = useState("");
  const [ran, setRan] = useState(false);
  const [layer, setLayer] = useState(0);
  const [head, setHead] = useState(0);
  const [seqLen, setSeqLen] = useState(64);
  const [showUnmasked, setShowUnmasked] = useState(false);
  const [activeSentence, setActiveSentence] = useState<string | null>(null);

  const invalidate = useInvalidateAll();
  const overview = useOverviewQuery(ran);
  const masked = useAttentionQuery({ layer, head, seq_len: seqLen, unmasked: false }, ran);
  const unmasked = useAttentionQuery(
    { layer, head, seq_len: seqLen, unmasked: true },
    ran && showUnmasked,
  );
  const bench = useBenchmarkQuery({ seq_lengths: [seqLen] }, ran);

  const err =
    overview.error instanceof ApiError
      ? overview.error
      : masked.error instanceof ApiError
        ? masked.error
        : null;

  const bdhMetrics = useMemo(() => {
    const rec = bench.data?.records.find((r) => r.model === "bdh" && r.seq_len === seqLen);
    return {
      entropy: rec?.attention_entropy ?? null,
      sparsity: rec?.sparsity_ratio ?? null,
      locality: rec?.locality_ratio_k5 ?? null,
    };
  }, [bench.data, seqLen]);

  const extracting =
    ran &&
    (overview.isLoading ||
      overview.isFetching ||
      masked.isLoading ||
      masked.isFetching ||
      bench.isLoading ||
      bench.isFetching);

  const onExecute = () => {
    const nextSeq = seqFromSentence(sentence);
    setSeqLen(nextSeq);
    setActiveSentence(sentence.trim() || "(empty prompt)");
    setRan(true);
    invalidate();
  };

  return (
    <div className="relative">
      <CausalWatermark />
      <div className="relative z-[1]">
        <SectionHeader
          eyebrow="DRAGONFORGE TRACK 02 · DIAGNOSTIC CONSOLE"
          title="Dashboard"
          description="Type a sentence, run extraction, and inspect causal attention with live metrics. Layer / head / seq controls remain available for causality exploration."
        />

        <div className="mb-6 border border-hairline bg-panel rounded-card p-4">
          <label
            htmlFor="prompt-sentence"
            className="font-sans text-eyebrow uppercase text-secondary block mb-2"
          >
            Input sentence
          </label>
          <textarea
            id="prompt-sentence"
            className="ctrl w-full min-h-[88px] resize-y mb-3"
            placeholder="Enter a sentence to drive attention extraction…"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            spellCheck={false}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={onExecute}
              disabled={extracting}
            >
              {extracting ? "Running Extraction…" : "Execute / Run Extraction"}
            </button>
            {activeSentence != null && (
              <span className="font-mono text-metric-sm text-tertiary truncate max-w-[480px]">
                context · seq_len={seqLen} · “{activeSentence.slice(0, 64)}
                {activeSentence.length > 64 ? "…" : ""}”
              </span>
            )}
          </div>
        </div>

        {!ran ? (
          <div className="border border-hairline bg-panel rounded-card min-h-[360px] flex items-center justify-center mb-6">
            <p className="font-body text-body text-secondary m-0">
              Awaiting extraction — enter a sentence and execute.
            </p>
          </div>
        ) : extracting && !masked.data ? (
          <div className="border border-hairline bg-panel rounded-card min-h-[360px] flex flex-col items-center justify-center gap-3 mb-6">
            <div className="status-dot-running w-2 h-2 rounded-badge bg-teal" aria-hidden />
            <p className="font-body text-body text-secondary m-0">
              Extracting attention weights…
            </p>
            <p className="font-mono text-metric-sm text-tertiary m-0">
              diagnostic output · layer {layer} · head {head} · seq {seqLen}
            </p>
          </div>
        ) : err ? (
          <div className="error-panel mb-6">
            {err.body.error === "checkpoint_missing"
              ? `Checkpoint missing. Expected path: ${err.body.expected_path ?? "unknown"}`
              : err.message}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 min-[1100px]:grid-cols-5 gap-3 mb-4">
              <MetricCard label="Entropy" value={fmt(bdhMetrics.entropy, 3)} />
              <MetricCard label="Sparsity" value={fmt(bdhMetrics.sparsity, 3)} />
              <MetricCard label="Locality (k=5)" value={fmt(bdhMetrics.locality, 3)} />
              <MetricCard
                label="Causal Violations"
                value={fmt(
                  masked.data?.causal_violations ?? overview.data?.causal_violations,
                  0,
                )}
              />
              <MetricCard
                label="Layers Instrumented"
                value={fmt(overview.data?.layers_instrumented, 0)}
              />
            </div>

            <div className="flex flex-col min-[1100px]:flex-row gap-4 items-stretch min-[1100px]:items-start">
              <aside className="w-full min-[1100px]:w-[200px] shrink-0 border border-hairline bg-panel rounded-card p-4 space-y-4">
                <div className="font-sans text-eyebrow uppercase text-secondary">
                  Attention controls
                </div>
                <div>
                  <label
                    className="font-mono text-metric-sm text-secondary block mb-1"
                    htmlFor="layer"
                  >
                    layer
                  </label>
                  <select
                    id="layer"
                    className="ctrl w-full"
                    value={layer}
                    onChange={(e) => setLayer(Number(e.target.value))}
                  >
                    {Array.from({ length: layers }, (_, i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="font-mono text-metric-sm text-secondary block mb-1"
                    htmlFor="head"
                  >
                    head
                  </label>
                  <select
                    id="head"
                    className="ctrl w-full"
                    value={head}
                    onChange={(e) => setHead(Number(e.target.value))}
                  >
                    {Array.from({ length: heads }, (_, i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="font-mono text-metric-sm text-secondary block mb-1"
                    htmlFor="seq"
                  >
                    seq_len · {seqLen}
                  </label>
                  <input
                    id="seq"
                    type="range"
                    min={16}
                    max={128}
                    step={16}
                    value={seqLen}
                    onChange={(e) => setSeqLen(Number(e.target.value))}
                  />
                </div>
                <label className="flex items-center gap-2 font-mono text-metric-sm text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUnmasked}
                    onChange={(e) => setShowUnmasked(e.target.checked)}
                    className="accent-[var(--signal-teal)]"
                  />
                  Show unmasked
                </label>
              </aside>

              <div className="flex-1 min-w-0 space-y-4">
                <div
                  className={`grid gap-4 ${
                    showUnmasked ? "grid-cols-1 min-[1200px]:grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  <div className="border border-hairline bg-panel rounded-card p-2 min-h-[420px]">
                    <div className="font-sans text-eyebrow uppercase text-secondary px-2 pt-1 mb-1">
                      Attention Heatmap · causal masked
                    </div>
                    {masked.isLoading || !masked.data ? (
                      <p className="font-body text-caption text-secondary p-4">
                        Extracting attention weights…
                      </p>
                    ) : (
                      <Heatmap matrix={masked.data.matrix} height={showUnmasked ? 400 : 520} />
                    )}
                  </div>
                  {showUnmasked && (
                    <div className="border border-hairline bg-panel rounded-card p-2 min-h-[420px]">
                      <div className="font-sans text-eyebrow uppercase text-secondary px-2 pt-1 mb-1">
                        Unmasked (pre-causal-mask)
                      </div>
                      {unmasked.isLoading || !unmasked.data ? (
                        <p className="font-body text-caption text-secondary p-4">
                          Extracting attention weights…
                        </p>
                      ) : (
                        <Heatmap matrix={unmasked.data.matrix} height={400} />
                      )}
                    </div>
                  )}
                </div>
                <p className="font-mono text-metric-sm text-tertiary m-0">
                  masked positions: upper triangle · seq_len: {seqLen} · layer: {layer} · head:{" "}
                  {head}
                  {masked.data?.causal_violations != null
                    ? ` · violations: ${masked.data.causal_violations}`
                    : ""}
                  {overview.data?.runtime_delta_pct != null
                    ? ` · runtime Δ: ${
                        overview.data.runtime_delta_pct >= 0 ? "+" : ""
                      }${overview.data.runtime_delta_pct.toFixed(1)}%`
                    : ""}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
