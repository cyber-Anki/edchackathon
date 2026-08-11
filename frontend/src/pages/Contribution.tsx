/**
 * Open Source PR — mock public GitHub PR view for pathway/bdh.
 * Instrument aesthetic: mono diffs, hairline borders, muted +/- signals.
 */

const PR_TITLE = "feat: Inject non-destructive attention extraction hooks and metrics";

const COMMITS = [
  {
    sha: "a3f1c92",
    message: "feat(attn): add optional attention capture hooks in BDH forward",
    files: 3,
  },
  {
    sha: "8b2e041",
    message: "feat(metrics): entropy, sparsity, locality + causal violation counters",
    files: 4,
  },
  {
    sha: "c91d7aa",
    message: "chore: wire FastAPI diagnostic endpoints without mutating weights",
    files: 2,
  },
];

const DIFF_FILES = [
  {
    path: "bdh/attention.py",
    additions: 28,
    deletions: 2,
    hunks: [
      {
        header: "@@ -84,6 +84,18 @@ class CausalSelfAttention(nn.Module):",
        lines: [
          { t: "ctx", c: "    def forward(self, x: Tensor) -> Tensor:" },
          { t: "ctx", c: "        B, T, C = x.size()" },
          { t: "ctx", c: "        q, k, v = self.c_attn(x).split(self.n_embd, dim=2)" },
          { t: "add", c: "" },
          { t: "add", c: "        # Non-destructive capture: clone for diagnostics only." },
          { t: "add", c: "        if self._scope_hooks_enabled:" },
          { t: "add", c: "            att_pre = (q @ k.transpose(-2, -1)) * self.scale" },
          { t: "add", c: "            self._last_attn_unmasked = att_pre.detach().clone()" },
          { t: "ctx", c: "        att = (q @ k.transpose(-2, -1)) * self.scale" },
          { t: "del", c: "        att = att.masked_fill(self.bias[:, :, :T, :T] == 0, float('-inf'))" },
          { t: "add", c: "        att = att.masked_fill(self.bias[:, :, :T, :T] == 0, float('-inf'))" },
          { t: "add", c: "        if self._scope_hooks_enabled:" },
          { t: "add", c: "            self._last_attn_masked = att.detach().clone()" },
          { t: "ctx", c: "        att = F.softmax(att, dim=-1)" },
        ],
      },
    ],
  },
  {
    path: "tools/diagnostics/bdh_scope/metrics.py",
    additions: 41,
    deletions: 0,
    hunks: [
      {
        header: "@@ -0,0 +1,24 @@",
        lines: [
          { t: "add", c: '"""Attention diagnostics — entropy, sparsity, locality, causality."""' },
          { t: "add", c: "" },
          { t: "add", c: "def attention_entropy(weights: Tensor) -> float:" },
          { t: "add", c: "    p = weights.clamp_min(1e-12)" },
          { t: "add", c: "    return float((-(p * p.log()).sum(dim=-1).mean()).item())" },
          { t: "add", c: "" },
          { t: "add", c: "def causal_violations(weights: Tensor) -> int:" },
          { t: "add", c: "    # Upper triangle must be ~0 after causal mask." },
          { t: "add", c: "    tri = weights.triu(diagonal=1)" },
          { t: "add", c: "    return int((tri.abs() > 1e-6).sum().item())" },
        ],
      },
    ],
  },
];

type LineKind = "ctx" | "add" | "del";

function lineClass(t: LineKind): string {
  if (t === "add") return "bg-[color-mix(in_srgb,var(--signal-teal)_12%,transparent)] text-primary";
  if (t === "del") return "bg-[color-mix(in_srgb,var(--signal-red-muted)_14%,transparent)] text-primary";
  return "text-secondary";
}

function prefix(t: LineKind): string {
  if (t === "add") return "+";
  if (t === "del") return "-";
  return " ";
}

export default function Contribution() {
  const totalAdd = DIFF_FILES.reduce((s, f) => s + f.additions, 0);
  const totalDel = DIFF_FILES.reduce((s, f) => s + f.deletions, 0);

  return (
    <div className="max-w-[960px]">
      <div className="border border-hairline bg-panel rounded-card overflow-hidden">
        {/* PR header */}
        <div className="px-5 py-4 border-b border-hairline">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-mono text-metric-sm text-teal border border-teal rounded-badge px-2 py-0.5">
              Open
            </span>
            <span className="font-mono text-metric-sm text-tertiary">
              #42 · pathway/bdh
            </span>
          </div>
          <h1 className="font-sans text-section-header text-primary m-0">{PR_TITLE}</h1>
          <p className="font-mono text-metric-sm text-secondary mt-2 mb-0">
            <span className="text-tertiary">base:</span>{" "}
            <span className="text-primary">main</span>
            <span className="text-tertiary"> ← </span>
            <span className="text-primary">feat/bdh-scope-hooks</span>
            <span className="text-tertiary"> · </span>
            {COMMITS.length} commits · {DIFF_FILES.length} files
            <span className="text-teal"> +{totalAdd}</span>
            <span className="text-red-muted"> −{totalDel}</span>
          </p>
        </div>

        {/* Commit summary */}
        <div className="px-5 py-4 border-b border-hairline">
          <div className="font-sans text-eyebrow uppercase text-secondary mb-3">Commits</div>
          <ul className="m-0 p-0 list-none space-y-2">
            {COMMITS.map((c) => (
              <li
                key={c.sha}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-metric-sm"
              >
                <span className="text-teal">{c.sha}</span>
                <span className="text-primary">{c.message}</span>
                <span className="text-tertiary">{c.files} files</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Files changed / diffs */}
        <div className="px-5 py-4">
          <div className="font-sans text-eyebrow uppercase text-secondary mb-3">
            Files changed
          </div>
          <div className="space-y-4">
            {DIFF_FILES.map((file) => (
              <div key={file.path} className="border border-hairline rounded-card overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-panel-raised border-b border-hairline">
                  <span className="font-mono text-metric-sm text-primary">{file.path}</span>
                  <span className="font-mono text-metric-sm text-teal">+{file.additions}</span>
                  <span className="font-mono text-metric-sm text-red-muted">−{file.deletions}</span>
                </div>
                {file.hunks.map((hunk) => (
                  <div key={hunk.header}>
                    <div className="font-mono text-metric-sm text-tertiary px-3 py-1 border-b border-hairline bg-void">
                      {hunk.header}
                    </div>
                    <pre className="m-0 p-0 font-mono text-metric-sm overflow-x-auto">
                      {hunk.lines.map((line, i) => (
                        <div
                          key={`${file.path}-${i}`}
                          className={`px-3 py-0.5 whitespace-pre ${lineClass(line.t as LineKind)}`}
                        >
                          <span className="inline-block w-4 select-none text-tertiary">
                            {prefix(line.t as LineKind)}
                          </span>
                          {line.c || " "}
                        </div>
                      ))}
                    </pre>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-hairline">
          <p className="font-mono text-metric-sm text-tertiary m-0">
            Hooks clone attention tensors for diagnostics only — no weight mutation, no training
            path changes.
          </p>
        </div>
      </div>
    </div>
  );
}
