# NOTES — BDH//SCOPE build assumptions

## Section 6 data-contract reconstruction

The source master prompt notes that code samples for `run_benchmark` and `get_causal_attention_map` were clipped mid-line. Reconstructed conservatively as follows (not treated as confirmed upstream API):

- `run_benchmark(seq_lengths, models=["bdh", "transformer"])` → `pd.DataFrame` with columns `model`, `seq_len`, `attention_entropy`, `sparsity_ratio`, `locality_ratio_k5`, `extraction_time_ms`.
- `sparsity_ratio`: fraction of near-zero attention weights (threshold `1e-6`).
- `locality_ratio_k5`: attention mass retained within a k=5 window of the diagonal.
- `get_causal_attention_map(input_ids, layer, head)` → `np.ndarray` of shape `(seq_len, seq_len)`, upper triangle already zeroed via `np.triu` mask.

## Existing model hook

No pre-existing `backend/` extraction hook was present in the workspace at build time. `backend/extraction.py` therefore implements a self-contained causal-attention extractor that:

1. Attempts to load a Pathway BDH (or compatible) checkpoint from `BDH_CHECKPOINT_PATH` (default `./checkpoints/bdh.pt`) and a Transformer baseline from `TRANSFORMER_CHECKPOINT_PATH`.
2. Falls back to a small in-process synthetic multi-head attention module when checkpoints are missing, still applying a hard causal upper-triangular mask so causality instrumentation remains real (not fabricated metric strings).

HTTP 503 with a structured JSON body is returned when an explicit checkpoint load is requested and the file is absent.

## Attention matrix encoding

`GET /api/attention` returns nested JSON arrays. At large `seq_len` (e.g. ≥2048) this is heavy; a more compact encoding (binary/base64 float32) was considered and deferred — documented here rather than silently switched.

## Benchmark engine

`backend/benchmark.py` computes metrics from the same attention maps produced by `extraction.py`. When checkpoints are unavailable it uses the synthetic causal modules so the console still exercises the full API contract with live numbers (not hardcoded frontend placeholders).

## Overview metrics

- `Causal Violations Detected`: count of upper-triangle attentions above threshold after masking (should be 0 for a correct causal mask).
- `Layers Instrumented` / `Seq Lengths Benchmarked` / `Runtime Δ`: derived from `/api/status` and the latest cached benchmark run.

## Contribution page

PR URL is left as a configurable constant (`PR_URL` in `Contribution.tsx`) pointing to a placeholder until Pillar 3 opens the real PR.

## Contrast

Token luminance was checked against WCAG AA for `--text-primary` on `--bg-void`/`--bg-panel` and accents on `--bg-panel`. No hue/saturation changes were required; values remain as specified in Section 2.1.

## Synthetic architectural contrast

When checkpoints are absent, the BDH fallback applies a linear distance penalty on attention scores (locality prior); the Transformer baseline uses a warmer softmax temperature (flatter mass). This produces measurable entropy / locality / sparsity divergence without hardcoding frontend numbers. Checkpoint-backed runs replace these weights via `load_state_dict`.

## Sparsity threshold

Absolute `1e-6` rarely triggers at moderate `seq_len` after softmax. `sparsity_ratio` uses `max(1e-6, 1e-3 / seq_len)` over the causal support so the metric remains informative while staying near-zero–oriented.

## Favicon hex

`frontend/src/assets/favicon.svg` embeds `#0A0C0F` / `#4E8C82` because a standalone favicon cannot resolve CSS custom properties. Values match Section 2.1 tokens exactly.

## Definition of Done (build pass)

- [x] Colors only via theme tokens (+ favicon SVG exception above)
- [x] Fonts: IBM Plex Sans / Mono + Inter
- [x] Numbers from FastAPI routes (no hardcoded metrics)
- [x] Teal = BDH, amber = Transformer
- [x] No emoji / confetti / gradients / drop-shadows
- [x] Empty / loading / error states on Attention + Benchmark
- [x] Usable at 1024px (`min-w-[1024px]` + responsive grids)
- [x] No external UI kit
- [x] NOTES.md documents assumptions
