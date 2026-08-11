"""In-memory cache wrappers. Routes must not call torch / model hooks directly."""

from __future__ import annotations

import time
from functools import lru_cache
from typing import Any

import numpy as np

# Mutable run metadata (not hashed into lru keys)
_last_extraction_ts: float | None = None
_last_benchmark_ts: float | None = None


def get_last_extraction_ts() -> float | None:
    return _last_extraction_ts


def get_last_benchmark_ts() -> float | None:
    return _last_benchmark_ts


def mark_extraction() -> None:
    global _last_extraction_ts
    _last_extraction_ts = time.time()


def mark_benchmark() -> None:
    global _last_benchmark_ts
    _last_benchmark_ts = time.time()


@lru_cache(maxsize=64)
def cached_attention_map(
    seq_len: int,
    layer: int,
    head: int,
    unmasked: bool,
) -> tuple[tuple[float, ...], ...]:
    """Cache attention matrices keyed on extraction arguments.

    Returns a nested tuple (JSON-serializable) so the lru_cache stays hashable.
    """
    from extraction import get_causal_attention_map, get_unmasked_attention_map
    import torch

    input_ids = torch.zeros(1, seq_len, dtype=torch.long)
    if unmasked:
        arr = get_unmasked_attention_map(input_ids, layer, head)
    else:
        arr = get_causal_attention_map(input_ids, layer, head)
    mark_extraction()
    return tuple(tuple(float(x) for x in row) for row in arr)


@lru_cache(maxsize=32)
def cached_benchmark(
    seq_lengths_key: tuple[int, ...],
    models_key: tuple[str, ...],
) -> tuple[dict[str, Any], ...]:
    """Cache benchmark runs keyed on seq lengths and model list."""
    from benchmark import run_benchmark

    df = run_benchmark(list(seq_lengths_key), list(models_key))
    mark_benchmark()
    records = df.to_dict(orient="records")
    # Normalize numpy types for JSON
    out: list[dict[str, Any]] = []
    for row in records:
        out.append(
            {
                "model": str(row["model"]),
                "seq_len": int(row["seq_len"]),
                "attention_entropy": float(row["attention_entropy"]),
                "sparsity_ratio": float(row["sparsity_ratio"]),
                "locality_ratio_k5": float(row["locality_ratio_k5"]),
                "extraction_time_ms": float(row["extraction_time_ms"]),
            }
        )
    return tuple(out)


def clear_caches() -> None:
    cached_attention_map.cache_clear()
    cached_benchmark.cache_clear()


def matrix_from_cached(cached: tuple[tuple[float, ...], ...]) -> np.ndarray:
    return np.asarray(cached, dtype=np.float64)
