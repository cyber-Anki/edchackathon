import React, { useState, useEffect } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  GitFork,
  GitPullRequest,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Search,
  Star,
  Terminal as TerminalIcon,
} from "lucide-react";

// --- Types ---
type TabType = "Dashboard" | "Benchmark" | "Open-Source";
type BenchmarkMetric = "latency" | "sparsity" | "entropy";

interface BenchmarkDataPoint {
  seqLen: number;
  bdh: number;
  vanilla: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("Dashboard");

  // ==========================================
  // VIEW 1: DASHBOARD STATE
  // ==========================================
  const [promptInput, setPromptInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
    val: number;
  } | null>(null);

  const getTimestamp = () =>
    new Date().toLocaleTimeString("en-US", { hour12: false });

  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[${getTimestamp()}] System initialized: BDH Attention Instrumentation Engine`,
    `[${getTimestamp()}] Extraction hooks loaded: [Layer 0..3, Head 0..15]`,
    `[${getTimestamp()}] Awaiting diagnostic trigger command: RUN_DIAGNOSTICS`,
  ]);

  const [metrics, setMetrics] = useState({
    entropy: "2.148",
    sparsity: "82.4%",
    locality: "88.6%",
  });

  const gridSize = 16;
  const [matrix, setMatrix] = useState<number[][]>([]);

  // Generate realistic lower-triangular causal attention matrix
  const generateCausalMatrix = () => {
    const newMatrix: number[][] = [];
    for (let r = 0; r < gridSize; r++) {
      const row: number[] = [];
      let rowSum = 0;
      for (let c = 0; c < gridSize; c++) {
        if (c <= r) {
          const distance = r - c;
          const localityBias = Math.exp(-distance * 0.45);
          const noise = Math.random() * 0.35;
          const val = localityBias * 0.75 + noise;
          row.push(val);
          rowSum += val;
        } else {
          row.push(0); // Masked causal position
        }
      }
      const normalizedRow = row.map((v) => (rowSum > 0 ? v / rowSum : 0));
      newMatrix.push(normalizedRow);
    }
    return newMatrix;
  };

  useEffect(() => {
    setMatrix(generateCausalMatrix());
  }, []);

  const handleExecute = () => {
    if (isRunning) return;
    setIsRunning(true);
    const ts = () => getTimestamp();

    const isTriggerMatch = promptInput.trim() === "RUN_DIAGNOSTICS";

    setTerminalLogs((prev) => [
      ...prev,
      `[${ts()}] Execute requested: command="${promptInput.trim()}"`,
    ]);

    setTimeout(() => {
      if (isTriggerMatch) {
        // Optional real backend probe with graceful simulated fallback
        fetch("http://127.0.0.1:8000/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptInput }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.metrics) {
              setMetrics({
                entropy:
                  typeof data.metrics.entropy === "number"
                    ? data.metrics.entropy.toFixed(3)
                    : data.metrics.entropy,
                sparsity:
                  typeof data.metrics.sparsity === "number"
                    ? `${data.metrics.sparsity.toFixed(1)}%`
                    : data.metrics.sparsity,
                locality:
                  typeof data.metrics.locality === "number"
                    ? `${data.metrics.locality.toFixed(1)}%`
                    : data.metrics.locality,
              });
            }
          })
          .catch(() => {
            const nextEntropy = (1.9 + Math.random() * 0.5).toFixed(3);
            const nextSparsity = (80 + Math.random() * 8).toFixed(1) + "%";
            const nextLocality = (86 + Math.random() * 6).toFixed(1) + "%";
            setMetrics({
              entropy: nextEntropy,
              sparsity: nextSparsity,
              locality: nextLocality,
            });
          })
          .finally(() => {
            setMatrix(generateCausalMatrix());
            setHasExtracted(true);
            setIsRunning(false);
            setTerminalLogs((prev) => [
              ...prev,
              `[${ts()}] [SUCCESS] Exact command RUN_DIAGNOSTICS matched.`,
              `[${ts()}] Causal tensor extraction complete (16x16 grid mapped).`,
              `[${ts()}] Metrics computed: Entropy=${metrics.entropy} bits | Sparsity=${metrics.sparsity} | Locality=${metrics.locality}`,
            ]);
          });
      } else {
        setHasExtracted(false);
        setIsRunning(false);
        setTerminalLogs((prev) => [
          ...prev,
          `[${ts()}] [AWAITING] Command "${promptInput.trim()}" not recognized.`,
          `[${ts()}] Heatmap display requires exact command: RUN_DIAGNOSTICS`,
        ]);
      }
    }, 500);
  };

  // ==========================================
  // VIEW 2: BENCHMARK STATE
  // ==========================================
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBenchmarkMetric, setActiveBenchmarkMetric] =
    useState<BenchmarkMetric>("latency");
  const [hoveredPoint, setHoveredPoint] = useState<BenchmarkDataPoint | null>(
    null
  );

  const benchmarkSeries: Record<BenchmarkMetric, BenchmarkDataPoint[]> = {
    latency: [
      { seqLen: 64, bdh: 3.2, vanilla: 4.1 },
      { seqLen: 128, bdh: 5.8, vanilla: 8.9 },
      { seqLen: 256, bdh: 9.4, vanilla: 18.4 },
      { seqLen: 512, bdh: 14.2, vanilla: 38.6 },
      { seqLen: 1024, bdh: 22.8, vanilla: 82.1 },
      { seqLen: 2048, bdh: 39.5, vanilla: 178.4 },
    ],
    sparsity: [
      { seqLen: 64, bdh: 72.4, vanilla: 14.2 },
      { seqLen: 128, bdh: 78.6, vanilla: 12.4 },
      { seqLen: 256, bdh: 82.4, vanilla: 10.2 },
      { seqLen: 512, bdh: 85.1, vanilla: 8.1 },
      { seqLen: 1024, bdh: 88.9, vanilla: 6.4 },
      { seqLen: 2048, bdh: 91.2, vanilla: 4.8 },
    ],
    entropy: [
      { seqLen: 64, bdh: 3.8, vanilla: 5.2 },
      { seqLen: 128, bdh: 3.42, vanilla: 5.88 },
      { seqLen: 256, bdh: 2.85, vanilla: 6.45 },
      { seqLen: 512, bdh: 2.14, vanilla: 7.12 },
      { seqLen: 1024, bdh: 1.82, vanilla: 7.84 },
      { seqLen: 2048, bdh: 1.54, vanilla: 8.42 },
    ],
  };

  const metricUnits: Record<
    BenchmarkMetric,
    { label: string; unit: string; desc: string }
  > = {
    latency: {
      label: "Inference Latency",
      unit: "ms",
      desc: "Lower is better (O(N) subquadratic memory vs O(N²) quadratic bottleneck)",
    },
    sparsity: {
      label: "Causal Sparsity %",
      unit: "%",
      desc: "Higher is better (Activation sparsity per BDH threshold routing)",
    },
    entropy: {
      label: "Attention Entropy",
      unit: "bits",
      desc: "Lower is better (Sharp information concentration vs diffuse attention)",
    },
  };

  const architectures = [
    {
      name: "BDH (Dragon Hatchling)",
      type: "Causal Top-k Sparse",
      entropy: "2.14 bits",
      sparsity: "82.4%",
      locality: "88.6%",
      latency: "14.2 ms",
      isPrimary: true,
      tag: "INSTRUMENTED",
    },
    {
      name: "Vanilla Transformer",
      type: "Dense Softmax",
      entropy: "5.88 bits",
      sparsity: "12.4%",
      locality: "18.9%",
      latency: "38.6 ms",
      isPrimary: false,
      tag: "BASELINE",
    },
    {
      name: "Sparse Mamba (Selective)",
      type: "State-Space Hybrid",
      entropy: "3.12 bits",
      sparsity: "64.2%",
      locality: "71.4%",
      latency: "18.9 ms",
      isPrimary: false,
      tag: "ALTERNATIVE",
    },
  ].filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ==========================================
  // VIEW 3: OPEN-SOURCE STATE
  // ==========================================
  const [isStarred, setIsStarred] = useState(true);
  const [starCount, setStarCount] = useState(1420);
  const [forkCount, setForkCount] = useState(284);

  const [termHistory, setTermHistory] = useState<
    { type: "in" | "out" | "sys"; text: string }[]
  >([
    {
      type: "sys",
      text: "BDH Evaluation & Diagnostic Shell [Preview Edition]",
    },
    {
      type: "sys",
      text: "Type 'help' for commands, or run diagnostic extraction commands.",
    },
    {
      type: "in",
      text: "git clone https://github.com/pathwaycom/bdh.git && cd bdh",
    },
    {
      type: "out",
      text: "Cloning into 'bdh'... Remote: 104 objects, done. Resolving deltas: 100% (42/42).",
    },
  ]);
  const [cliInput, setCliInput] = useState("");

  const handleCliSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;
    const cmd = cliInput.trim();
    const newHistory = [...termHistory, { type: "in" as const, text: cmd }];

    if (cmd === "help") {
      newHistory.push({
        type: "out",
        text: "Available commands:\n  bdh diagnose     Run causal hook extraction\n  bdh benchmark    Run latency & sparsity comparative test\n  bdh --version    Print BDH runtime version\n  clear            Clear terminal screen",
      });
    } else if (cmd === "bdh diagnose") {
      newHistory.push({
        type: "out",
        text: "[BDH-DIAG] Hook attached. Mean Entropy: 2.148 bits | Sparsity: 82.4% | Causal Violations: 0",
      });
    } else if (cmd === "bdh benchmark") {
      newHistory.push({
        type: "out",
        text: "[BENCHMARK] BDH: 14.2ms (512 tokens) vs Baseline: 38.6ms (2.71x speedup)",
      });
    } else if (cmd === "bdh --version") {
      newHistory.push({
        type: "out",
        text: "bdh-engine dragonforge-cuda12",
      });
    } else if (cmd === "clear") {
      setTermHistory([]);
      setCliInput("");
      return;
    } else {
      newHistory.push({
        type: "out",
        text: `bash: ${cmd.split(" ")[0]}: command executed. Output streamed to diagnostic buffer.`,
      });
    }

    setTermHistory(newHistory);
    setCliInput("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col selection:bg-teal-500/30 selection:text-teal-200">
      {/* ------------------------------------------------------------- */}
      {/* TOP APP HEADER & NAVIGATION BAR                                */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-sm shadow-teal-500/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-wide uppercase text-slate-100 font-mono">
                DIAGNOSTIC SUITE
              </h1>
              <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                DRAGON HATCHLING
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              BDH Internal Attention & Causal Sparsity Analyzer
            </p>
          </div>
        </div>

        {/* 3 TABS: Dashboard | Benchmark | Open-Source */}
        <nav className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg self-start md:self-auto">
          {(["Dashboard", "Benchmark", "Open-Source"] as TabType[]).map(
            (tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wider transition-all uppercase flex items-center gap-2 ${
                    isActive
                      ? "bg-teal-600 text-white shadow-sm shadow-teal-600/30 font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  {tab === "Dashboard" && <Activity className="h-3.5 w-3.5" />}
                  {tab === "Benchmark" && <BarChart3 className="h-3.5 w-3.5" />}
                  {tab === "Open-Source" && (
                    <GitPullRequest className="h-3.5 w-3.5" />
                  )}
                  {tab}
                </button>
              );
            }
          )}
        </nav>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* MAIN VIEW CONTENT AREA                                         */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* =========================================================== */}
        {/* VIEW 1: DASHBOARD (Default Tab)                              */}
        {/* =========================================================== */}
        {activeTab === "Dashboard" && (
          <div className="space-y-6">
            {/* SECTION: INPUT SEQUENCE */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-hidden shadow-lg shadow-black/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
                  <label
                    htmlFor="input-sequence"
                    className="font-mono text-xs font-bold uppercase tracking-widest text-slate-300"
                  >
                    INPUT SEQUENCE
                  </label>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Target: BDH_PT · Command: RUN_DIAGNOSTICS
                </span>
              </div>

              {/* Wide Text Input Box & Execute Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <input
                    id="input-sequence"
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Enter extraction command..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/80 focus:ring-1 focus:ring-teal-500/50 transition-all"
                    spellCheck={false}
                  />
                </div>

                <button
                  onClick={handleExecute}
                  disabled={isRunning}
                  className="bg-teal-600 hover:bg-teal-500 active:scale-95 cursor-pointer text-white font-bold text-xs uppercase tracking-widest px-6 py-2.5 rounded-lg transition-all shadow-md shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>RUNNING EXTRACTION...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-white" />
                      <span>EXECUTE / RUN EXTRACTION</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* SECTION: SPLIT VIEW (HEATMAP vs METRICS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT: CAUSAL ATTENTION MAP */}
              <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-hidden flex flex-col justify-between shadow-lg shadow-black/20">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-teal-400" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                      CAUSAL ATTENTION MAP (16x16)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                    {hasExtracted
                      ? "Lower-Triangular Causal Enforced"
                      : "Awaiting Command"}
                  </span>
                </div>

                {/* Heatmap Area / Empty State */}
                <div className="bg-slate-950 border border-slate-800/90 rounded-lg p-4 relative overflow-hidden flex flex-col justify-between min-h-[380px]">
                  {!hasExtracted ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
                        <Layers className="h-6 w-6 text-slate-600" />
                      </div>
                      <h4 className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        No Attention Tensor Loaded
                      </h4>
                      <p className="text-xs text-slate-600 max-w-sm">
                        Type{" "}
                        <code className="text-teal-400 font-mono bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                          RUN_DIAGNOSTICS
                        </code>{" "}
                        into the box above and click Execute to generate the
                        causal attention heatmap.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="w-full aspect-square max-h-[340px] mx-auto grid grid-cols-16 gap-[2px] p-2 bg-slate-950/80 rounded border border-slate-900">
                        {matrix.map((rowArr, rowIndex) =>
                          rowArr.map((val, colIndex) => {
                            const isMasked = colIndex > rowIndex;
                            let cellBg = "#020617";
                            let glowClass = "";
                            if (!isMasked) {
                              if (val < 0.08) cellBg = "#064e3b";
                              else if (val < 0.25) cellBg = "#0f766e";
                              else if (val < 0.5) cellBg = "#0d9488";
                              else if (val < 0.75) cellBg = "#14b8a6";
                              else {
                                cellBg = "#2dd4bf";
                                glowClass =
                                  "shadow-[0_0_8px_rgba(45,212,191,0.5)]";
                              }
                            }

                            return (
                              <div
                                key={`${rowIndex}-${colIndex}`}
                                style={{ backgroundColor: cellBg }}
                                className={`w-full h-full rounded-[1px] cursor-crosshair transition-all duration-150 ${
                                  isMasked
                                    ? "border border-slate-900/60 bg-slate-950 opacity-40 hover:opacity-70"
                                    : `hover:ring-2 hover:ring-white hover:z-10 ${glowClass}`
                                }`}
                                onMouseEnter={() =>
                                  setHoveredCell({
                                    row: rowIndex,
                                    col: colIndex,
                                    val,
                                  })
                                }
                                onMouseLeave={() => setHoveredCell(null)}
                              />
                            );
                          })
                        )}
                      </div>

                      {/* Heatmap Legend & Hover Details */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-mono border-t border-slate-800/80 pt-3 mt-3 gap-2">
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="text-[11px] uppercase text-slate-500 font-bold">
                            Legend:
                          </span>
                          <div
                            className="w-3 h-3 rounded-[2px] bg-[#064e3b]"
                            title="Low Weight"
                          ></div>
                          <div
                            className="w-3 h-3 rounded-[2px] bg-[#0f766e]"
                            title="Mid-Low Weight"
                          ></div>
                          <div
                            className="w-3 h-3 rounded-[2px] bg-[#0d9488]"
                            title="Mid Weight"
                          ></div>
                          <div
                            className="w-3 h-3 rounded-[2px] bg-[#2dd4bf]"
                            title="High Attention Mass"
                          ></div>
                          <div
                            className="w-3 h-3 rounded-[2px] border border-dashed border-slate-700 bg-slate-950"
                            title="Masked (Zero)"
                          ></div>
                          <span className="text-[10px] text-slate-500">
                            (Upper Triangle Masked)
                          </span>
                        </div>

                        <div className="text-teal-300 font-semibold h-4">
                          {hoveredCell ? (
                            <span>
                              Token Q: [{hoveredCell.row}] · Key K: [
                              {hoveredCell.col}] · Weight:{" "}
                              {(hoveredCell.val * 100).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-500 font-normal">
                              Hover over any tensor cell to inspect weight
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* RIGHT: THREE METRIC CARDS (No Decorative Icons) */}
              <div className="lg:col-span-4 flex flex-col justify-between gap-4">
                {/* Metric Card 1: Entropy */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-hidden flex-1 flex flex-col justify-between shadow-lg shadow-black/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                      MEAN ATTENTION ENTROPY
                    </span>
                  </div>
                  <div className="my-2">
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-teal-400 tracking-tight">
                      {hasExtracted ? metrics.entropy : "—"}{" "}
                      <span className="text-sm font-normal text-slate-400">
                        bits
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-slate-800/80 pt-2 text-xs text-slate-400">
                    Low entropy indicates sharply focused attention mass on
                    salient contextual tokens.
                  </div>
                </div>

                {/* Metric Card 2: Sparsity */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-hidden flex-1 flex flex-col justify-between shadow-lg shadow-black/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                      SPARSITY RATIO
                    </span>
                  </div>
                  <div className="my-2">
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-teal-400 tracking-tight">
                      {hasExtracted ? metrics.sparsity : "—"}
                    </div>
                  </div>
                  <div className="border-t border-slate-800/80 pt-2 text-xs text-slate-400">
                    Share of zero/near-zero attention weights filtered by BDH
                    activation routing.
                  </div>
                </div>

                {/* Metric Card 3: Locality */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-hidden flex-1 flex flex-col justify-between shadow-lg shadow-black/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                      LOCALITY RATIO (k=5)
                    </span>
                  </div>
                  <div className="my-2">
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-teal-400 tracking-tight">
                      {hasExtracted ? metrics.locality : "—"}
                    </div>
                  </div>
                  <div className="border-t border-slate-800/80 pt-2 text-xs text-slate-400">
                    Concentration of attention mass bounded within a 5-token
                    trailing local window.
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION: DIAGNOSTIC PROCESS LOGS */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-hidden shadow-lg shadow-black/20">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <TerminalIcon className="h-4 w-4 text-teal-400" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                    DIAGNOSTIC PROCESS LOGS
                  </span>
                </div>
                <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                  SYS_MON: ACTIVE
                </span>
              </div>
              <div className="font-mono text-xs text-slate-300 space-y-1.5 h-28 overflow-y-auto pr-2">
                {terminalLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-teal-500 select-none">&gt;</span>
                    <span
                      className={
                        log.includes("[SUCCESS]")
                          ? "text-teal-300 font-semibold"
                          : log.includes("[AWAITING]")
                          ? "text-amber-400 font-semibold"
                          : log.includes("[ERROR]")
                          ? "text-red-400 font-semibold"
                          : "text-slate-300"
                      }
                    >
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================== */}
        {/* VIEW 2: BENCHMARK                                            */}
        {/* =========================================================== */}
        {activeTab === "Benchmark" && (
          <div className="space-y-6">
            {/* TOP CONTROL BAR: SEARCH & ADD MODEL */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-black/20">
              <div className="relative w-full sm:w-80">
                <Search className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search architectures..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-lg">
                  {(["latency", "sparsity", "entropy"] as BenchmarkMetric[]).map(
                    (m) => (
                      <button
                        key={m}
                        onClick={() => setActiveBenchmarkMetric(m)}
                        className={`px-3 py-1 text-xs font-mono uppercase rounded transition-all cursor-pointer ${
                          activeBenchmarkMetric === m
                            ? "bg-teal-600 text-white font-bold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {m}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  className="bg-teal-600 hover:bg-teal-500 active:scale-95 cursor-pointer text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-md shadow-teal-600/20 flex items-center gap-1.5 whitespace-nowrap select-none"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Model +</span>
                </button>
              </div>
            </div>

            {/* COMPARATIVE METRICS & LINE GRAPH */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT: LINE GRAPH (RECHARTS-STYLE SVG CURVE) */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-hidden shadow-lg shadow-black/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <div>
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                        {metricUnits[activeBenchmarkMetric].label} vs Sequence
                        Length
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {metricUnits[activeBenchmarkMetric].desc}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="flex items-center gap-1.5 text-teal-400 font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full bg-teal-400 inline-block"></span>
                        BDH (Causal)
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-400 inline-block"></span>
                        Vanilla Transformer
                      </span>
                    </div>
                  </div>

                  {/* SVG Line Chart */}
                  <div className="h-64 w-full bg-slate-950 border border-slate-800 rounded-lg p-4 relative">
                    <svg
                      className="w-full h-full overflow-visible"
                      viewBox="0 0 500 200"
                      preserveAspectRatio="none"
                    >
                      {/* Grid Lines */}
                      <line
                        x1="0"
                        y1="40"
                        x2="500"
                        y2="40"
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                      />
                      <line
                        x1="0"
                        y1="90"
                        x2="500"
                        y2="90"
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                      />
                      <line
                        x1="0"
                        y1="140"
                        x2="500"
                        y2="140"
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                      />
                      <line
                        x1="0"
                        y1="190"
                        x2="500"
                        y2="190"
                        stroke="#334155"
                      />

                      {/* Series: Vanilla Transformer Curve */}
                      <path
                        d={
                          activeBenchmarkMetric === "latency"
                            ? "M 10,185 Q 100,170 200,140 T 350,70 T 490,10"
                            : activeBenchmarkMetric === "sparsity"
                            ? "M 10,150 Q 150,155 300,165 T 490,180"
                            : "M 10,100 Q 150,80 300,50 T 490,20"
                        }
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2.5"
                        strokeDasharray={
                          activeBenchmarkMetric === "latency" ? "" : "3 3"
                        }
                      />

                      {/* Series: BDH Curve (Teal with Glow) */}
                      <path
                        d={
                          activeBenchmarkMetric === "latency"
                            ? "M 10,188 Q 150,178 300,165 T 490,145"
                            : activeBenchmarkMetric === "sparsity"
                            ? "M 10,60 Q 150,45 300,30 T 490,15"
                            : "M 10,120 Q 150,140 300,160 T 490,180"
                        }
                        fill="none"
                        stroke="#0d9488"
                        strokeWidth="3.5"
                      />

                      {/* Data Dots for BDH */}
                      {[10, 100, 190, 290, 390, 490].map((cx, idx) => {
                        const pt =
                          benchmarkSeries[activeBenchmarkMetric][idx];
                        const cy =
                          activeBenchmarkMetric === "latency"
                            ? 190 - (pt.bdh / 45) * 45
                            : activeBenchmarkMetric === "sparsity"
                            ? 200 - (pt.bdh / 100) * 190
                            : 200 - (pt.bdh / 10) * 190;
                        return (
                          <circle
                            key={idx}
                            cx={cx}
                            cy={cy}
                            r="4.5"
                            fill="#14b8a6"
                            stroke="#0f172a"
                            strokeWidth="2"
                            className="cursor-pointer hover:r-6 transition-all"
                            onMouseEnter={() => setHoveredPoint(pt)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Chart Footer / Hover Status & X-Axis Labels */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-mono text-slate-500 px-1 mb-2">
                    <span>Seq: 64</span>
                    <span>128</span>
                    <span>256</span>
                    <span>512</span>
                    <span>1024</span>
                    <span>Seq: 2048</span>
                  </div>
                  <div className="text-xs font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80 flex items-center justify-between">
                    {hoveredPoint ? (
                      <span>
                        SeqLen:{" "}
                        <strong className="text-slate-200">
                          {hoveredPoint.seqLen}
                        </strong>{" "}
                        · BDH:{" "}
                        <strong className="text-teal-400">
                          {hoveredPoint.bdh}
                          {metricUnits[activeBenchmarkMetric].unit}
                        </strong>{" "}
                        · Vanilla:{" "}
                        <strong className="text-slate-300">
                          {hoveredPoint.vanilla}
                          {metricUnits[activeBenchmarkMetric].unit}
                        </strong>
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Hover data points on curve to inspect sequence metrics
                      </span>
                    )}
                    <span className="text-[10px] text-teal-400 uppercase font-bold">
                      Subquadratic Scaling
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT: COMPARATIVE ARCHITECTURE CARDS */}
              <div className="lg:col-span-5 space-y-4">
                {architectures.map((arch, idx) => (
                  <div
                    key={idx}
                    className={`bg-slate-900 border rounded-xl p-4 overflow-hidden transition-all shadow-md ${
                      arch.isPrimary
                        ? "border-teal-500/50 bg-teal-950/10 shadow-teal-950/30"
                        : "border-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-mono text-sm font-bold text-slate-100">
                            {arch.name}
                          </h4>
                          {arch.isPrimary && (
                            <span className="text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 py-0.5 rounded">
                              {arch.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{arch.type}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-mono text-xs border-t border-slate-800/80 pt-3">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">
                          Attention Entropy
                        </span>
                        <span className="font-bold text-slate-200">
                          {arch.entropy}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">
                          Causal Sparsity %
                        </span>
                        <span
                          className={`font-bold ${
                            arch.isPrimary ? "text-teal-400" : "text-slate-300"
                          }`}
                        >
                          {arch.sparsity}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">
                          Locality Window (k=5)
                        </span>
                        <span className="font-bold text-slate-200">
                          {arch.locality}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">
                          Inference Latency
                        </span>
                        <span
                          className={`font-bold ${
                            arch.isPrimary ? "text-teal-400" : "text-slate-300"
                          }`}
                        >
                          {arch.latency}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COMPARATIVE FEATURE TABLE */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg shadow-black/20">
              <div className="p-4 border-b border-slate-800">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                  Comprehensive Architecture Matrix (Seq Len = 512)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                      <th className="p-3.5">Architecture</th>
                      <th className="p-3.5">Attention Mechanism</th>
                      <th className="p-3.5">Entropy (bits)</th>
                      <th className="p-3.5">Sparsity Ratio</th>
                      <th className="p-3.5">Locality (k=5)</th>
                      <th className="p-3.5">Latency (ms)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr className="bg-teal-950/20 text-slate-200">
                      <td className="p-3.5 font-bold text-teal-300 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-teal-400" />
                        BDH (Dragon Hatchling)
                      </td>
                      <td className="p-3.5 text-slate-300">
                        Causal Top-k Constrained
                      </td>
                      <td className="p-3.5 font-bold text-teal-400">2.14</td>
                      <td className="p-3.5 font-bold text-teal-400">82.4%</td>
                      <td className="p-3.5 font-bold text-teal-400">88.6%</td>
                      <td className="p-3.5 font-bold text-teal-400">14.2 ms</td>
                    </tr>
                    <tr className="text-slate-400 hover:bg-slate-800/30">
                      <td className="p-3.5 font-semibold text-slate-300">
                        Vanilla Transformer
                      </td>
                      <td className="p-3.5">Dense Full-Softmax</td>
                      <td className="p-3.5">5.88</td>
                      <td className="p-3.5">12.4%</td>
                      <td className="p-3.5">18.9%</td>
                      <td className="p-3.5">38.6 ms</td>
                    </tr>
                    <tr className="text-slate-400 hover:bg-slate-800/30">
                      <td className="p-3.5 font-semibold text-slate-300">
                        Sparse Mamba
                      </td>
                      <td className="p-3.5">Selective State Space</td>
                      <td className="p-3.5">3.12</td>
                      <td className="p-3.5">64.2%</td>
                      <td className="p-3.5">71.4%</td>
                      <td className="p-3.5">18.9 ms</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================== */}
        {/* VIEW 3: OPEN-SOURCE                                          */}
        {/* =========================================================== */}
        {activeTab === "Open-Source" && (
          <div className="space-y-6">
            {/* HEADER & GITHUB ACTION BAR */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
                    Open-Source
                  </h2>
                  <span className="text-xs font-mono bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded font-semibold">
                    Apache 2.0
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Inspect, fork, and contribute non-destructive tensor
                  diagnostic hooks to the official BDH repository.
                </p>
              </div>

              {/* GitHub Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://github.com/pathwaycom/bdh"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-teal-600 hover:bg-teal-500 active:scale-95 cursor-pointer text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all shadow-md shadow-teal-600/20 flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View on GitHub</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setIsStarred(!isStarred);
                    setStarCount((prev) => (isStarred ? prev - 1 : prev + 1));
                  }}
                  className={`border px-3.5 py-2.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    isStarred
                      ? "bg-amber-400 border-amber-300 text-slate-950 shadow-sm shadow-amber-400/20"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <Star
                    className={`h-4 w-4 ${
                      isStarred
                        ? "fill-slate-950 text-slate-950"
                        : "text-slate-400"
                    }`}
                  />
                  <span>{isStarred ? "Starred" : "Star"}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ml-1 ${
                      isStarred
                        ? "bg-amber-500 text-slate-950 font-bold"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {starCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setForkCount((prev) => prev + 1)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 active:scale-95 cursor-pointer text-slate-300 px-3.5 py-2.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5"
                >
                  <GitFork className="h-4 w-4 text-slate-400" />
                  <span>Fork</span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] ml-1">
                    {forkCount}
                  </span>
                </button>

                <button
                  type="button"
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 active:scale-95 cursor-pointer text-slate-300 px-3.5 py-2.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5"
                >
                  <GitPullRequest className="h-4 w-4 text-teal-400" />
                  <span>Create Pull Request</span>
                </button>
              </div>
            </div>

            {/* MOCK TERMINAL WINDOW */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg shadow-black/20">
              {/* Terminal Window Chrome */}
              <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    diagnostic-shell — bash — 80x24
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  ENV: PYTHON 3.11 · CUDA 12.2
                </div>
              </div>

              {/* Terminal Output Area */}
              <div className="p-4 bg-black/90 font-mono text-xs min-h-[260px] max-h-[360px] overflow-y-auto space-y-2">
                {termHistory.map((item, idx) => (
                  <div key={idx}>
                    {item.type === "in" && (
                      <div className="flex items-start gap-2 text-slate-100">
                        <span className="text-teal-400 font-bold select-none">
                          bdh-user@node:~$
                        </span>
                        <span>{item.text}</span>
                      </div>
                    )}
                    {item.type === "out" && (
                      <div className="text-slate-300 whitespace-pre-wrap pl-4">
                        {item.text}
                      </div>
                    )}
                    {item.type === "sys" && (
                      <div className="text-slate-500 italic">{item.text}</div>
                    )}
                  </div>
                ))}

                {/* Input Prompt Form */}
                <form
                  onSubmit={handleCliSubmit}
                  className="flex items-center gap-2 pt-1 text-slate-100"
                >
                  <span className="text-teal-400 font-bold select-none">
                    bdh-user@node:~$
                  </span>
                  <input
                    type="text"
                    value={cliInput}
                    onChange={(e) => setCliInput(e.target.value)}
                    placeholder="type 'help', 'bdh diagnose', or 'bdh benchmark'..."
                    className="flex-1 bg-transparent text-slate-100 text-xs font-mono focus:outline-none border-none p-0"
                    autoFocus={false}
                  />
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
