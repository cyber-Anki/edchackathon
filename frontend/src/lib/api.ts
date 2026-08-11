/**
 * Sole backend transport layer. Components must not import fetch/axios directly.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = "";

export type ApiErrorBody = {
  error?: string;
  message?: string;
  expected_path?: string;
  model?: string;
  detail?: string;
};

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || body.detail || `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text };
  }
  if (!res.ok) {
    throw new ApiError(res.status, (json as ApiErrorBody) || { message: text });
  }
  return json as T;
}

export type StatusResponse = {
  device: string;
  bdh_checkpoint: string;
  transformer_checkpoint: string;
  bdh_loaded: boolean;
  transformer_loaded: boolean;
  layers: number;
  heads: number;
  last_extraction_ts: string | null;
  last_benchmark_ts?: string | null;
  using_synthetic?: boolean;
};

export type AttentionResponse = {
  layer: number;
  head: number;
  seq_len: number;
  unmasked: boolean;
  matrix: number[][];
  causal_violations: number;
  masked_positions: string;
};

export type BenchmarkRecord = {
  model: string;
  seq_len: number;
  attention_entropy: number;
  sparsity_ratio: number;
  locality_ratio_k5: number;
  extraction_time_ms: number;
};

export type BenchmarkResponse = {
  records: BenchmarkRecord[];
  seq_lengths: number[];
  models: string[];
  cached_at: string | null;
};

export type OverviewResponse = {
  causal_violations: number;
  layers_instrumented: number;
  seq_lengths_benchmarked: number;
  runtime_delta_pct: number | null;
  last_extraction_ts: string | null;
  last_benchmark_ts: string | null;
  status: StatusResponse;
};

export function getStatus() {
  return request<StatusResponse>("/api/status");
}

export function getAttentionMap(opts: {
  layer: number;
  head: number;
  seq_len: number;
  unmasked?: boolean;
}) {
  const params = new URLSearchParams({
    layer: String(opts.layer),
    head: String(opts.head),
    seq_len: String(opts.seq_len),
    unmasked: String(Boolean(opts.unmasked)),
  });
  return request<AttentionResponse>(`/api/attention?${params}`);
}

export function runBenchmark(opts: { seq_lengths: number[]; models?: string[] }) {
  const params = new URLSearchParams({
    seq_lengths: opts.seq_lengths.join(","),
    models: (opts.models ?? ["bdh", "transformer"]).join(","),
  });
  return request<BenchmarkResponse>(`/api/benchmark?${params}`);
}

export function getOverview() {
  return request<OverviewResponse>("/api/overview");
}

export function useStatusQuery() {
  return useQuery({
    queryKey: ["status"],
    queryFn: getStatus,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useOverviewQuery(enabled = true) {
  return useQuery({
    queryKey: ["overview"],
    queryFn: getOverview,
    enabled,
    staleTime: 15_000,
  });
}

export function useAttentionQuery(
  opts: { layer: number; head: number; seq_len: number; unmasked?: boolean },
  enabled = true,
) {
  return useQuery({
    queryKey: ["attention", opts.layer, opts.head, opts.seq_len, Boolean(opts.unmasked)],
    queryFn: () => getAttentionMap(opts),
    enabled,
    staleTime: 60_000,
  });
}

export function useBenchmarkQuery(
  opts: { seq_lengths: number[]; models?: string[] },
  enabled = true,
) {
  return useQuery({
    queryKey: ["benchmark", opts.seq_lengths.join(","), (opts.models ?? ["bdh", "transformer"]).join(",")],
    queryFn: () => runBenchmark(opts),
    enabled,
    staleTime: 120_000,
  });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries();
  };
}
