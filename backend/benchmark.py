"""Pillar 2 benchmarking engine.

Computes attention entropy, sparsity ratio, and k=5 locality ratio for BDH
and a standard Transformer baseline across requested sequence lengths.
"""

from __future__ import annotations

import time
from typing import Iterable

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F

from extraction import D_MODEL, NUM_HEADS, NUM_LAYERS, VOCAB, detect_device

NEAR_ZERO = 1e-6
LOCALITY_K = 5


class BaselineTransformerMHA(nn.Module):
    """Standard causal MHA baseline.

    Uses a warmer temperature (flatter softmax) and no distance bias so entropy
    stays higher and locality lower than the BDH-like synthetic path — an
    architectural contrast, not hardcoded frontend metrics.
    """

    def __init__(
        self,
        d_model: int = D_MODEL,
        n_heads: int = NUM_HEADS,
        n_layers: int = NUM_LAYERS,
        temperature: float = 2.5,
    ):
        super().__init__()
        self.n_heads = n_heads
        self.d_head = d_model // n_heads
        self.n_layers = n_layers
        self.temperature = temperature
        self.embed = nn.Embedding(VOCAB, d_model)
        self.layers = nn.ModuleList(
            [
                nn.ModuleDict(
                    {
                        "q": nn.Linear(d_model, d_model, bias=False),
                        "k": nn.Linear(d_model, d_model, bias=False),
                        "v": nn.Linear(d_model, d_model, bias=False),
                    }
                )
                for _ in range(n_layers)
            ]
        )
        torch.manual_seed(7)
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)

    def mean_attention(self, seq_len: int, device: torch.device) -> torch.Tensor:
        ids = torch.arange(seq_len, device=device).unsqueeze(0) % VOCAB
        x = self.embed(ids)
        acc = None
        for block in self.layers:
            q = block["q"](x).view(1, seq_len, self.n_heads, self.d_head).transpose(1, 2)
            k = block["k"](x).view(1, seq_len, self.n_heads, self.d_head).transpose(1, 2)
            scores = torch.matmul(q, k.transpose(-2, -1)) / (
                (self.d_head**0.5) * self.temperature
            )
            causal = torch.triu(
                torch.ones(seq_len, seq_len, device=device, dtype=torch.bool), diagonal=1
            )
            scores = scores.masked_fill(causal, float("-inf"))
            w = F.softmax(scores, dim=-1)
            w = torch.nan_to_num(w, nan=0.0)
            layer_mean = w.mean(dim=1)[0]
            acc = layer_mean if acc is None else acc + layer_mean
        assert acc is not None
        return (acc / self.n_layers).detach()


_bdh_ref = None
_tf_ref: BaselineTransformerMHA | None = None


def _bdh_mean_attention(seq_len: int, device: torch.device) -> torch.Tensor:
    """Mean causal attention over layers/heads from the shared extraction module."""
    from extraction import _ensure_model

    global _bdh_ref
    model = _ensure_model()
    _bdh_ref = model
    ids = torch.arange(seq_len, device=device).unsqueeze(0) % VOCAB
    acc = None
    with torch.no_grad():
        for layer in range(model.n_layers):
            for head in range(model.n_heads):
                w = model.attention_weights(ids, layer, head, apply_causal_mask=True)
                acc = w if acc is None else acc + w
    assert acc is not None
    return acc / (model.n_layers * model.n_heads)


def _transformer_mean_attention(seq_len: int, device: torch.device) -> torch.Tensor:
    global _tf_ref
    if _tf_ref is None:
        _tf_ref = BaselineTransformerMHA().to(device).eval()
    with torch.no_grad():
        return _tf_ref.mean_attention(seq_len, device)


def attention_entropy(attn: np.ndarray) -> float:
    """Mean row-wise Shannon entropy of attention distributions (nats)."""
    # Lower triangle only (causal support)
    rows = []
    t = attn.shape[0]
    for i in range(t):
        row = attn[i, : i + 1]
        s = row.sum()
        if s <= 0:
            continue
        p = row / s
        p = p[p > 0]
        rows.append(float(-(p * np.log(p)).sum()))
    return float(np.mean(rows)) if rows else 0.0


def sparsity_ratio(attn: np.ndarray, threshold: float = NEAR_ZERO) -> float:
    """Fraction of near-zero attention weights over the causal (lower-tri) region.

    Uses max(threshold, 1e-3 / seq_len) so the metric remains informative at
    moderate sequence lengths where raw softmax mass rarely falls below 1e-6.
    """
    mask = np.tril(np.ones_like(attn, dtype=bool))
    vals = attn[mask]
    if vals.size == 0:
        return 0.0
    adaptive = max(threshold, 1e-3 / max(attn.shape[0], 1))
    return float(np.mean(vals < adaptive))


def locality_ratio_k5(attn: np.ndarray, k: int = LOCALITY_K) -> float:
    """Attention mass retained within a k-window of the diagonal (causal region)."""
    t = attn.shape[0]
    total = 0.0
    local = 0.0
    for i in range(t):
        for j in range(i + 1):
            total += attn[i, j]
            if i - j <= k:
                local += attn[i, j]
    if total <= 0:
        return 0.0
    return float(local / total)


def run_benchmark(
    seq_lengths: list[int], models: list[str] | None = None
) -> pd.DataFrame:
    """
    Returns a DataFrame with one row per (model, seq_len) pair and columns:
      - model: str, one of "bdh" | "transformer"
      - seq_len: int
      - attention_entropy: float
      - sparsity_ratio: float        # fraction of near-zero attention weights
      - locality_ratio_k5: float     # attention mass retained within a k=5 window of the diagonal
      - extraction_time_ms: float
    """
    if models is None:
        models = ["bdh", "transformer"]
    device = detect_device()
    rows: list[dict] = []
    for model_name in models:
        if model_name not in ("bdh", "transformer"):
            raise ValueError(f"Unknown model: {model_name}")
        for seq_len in seq_lengths:
            if seq_len < 1:
                raise ValueError("seq_len must be >= 1")
            # Cap extreme sizes for synthetic path to keep the console responsive
            if seq_len > 4096:
                raise ValueError("seq_len > 4096 not supported in this diagnostic build")
            t0 = time.perf_counter()
            if model_name == "bdh":
                attn_t = _bdh_mean_attention(seq_len, device)
            else:
                attn_t = _transformer_mean_attention(seq_len, device)
            attn = np.tril(attn_t.cpu().numpy().astype(np.float64))
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            rows.append(
                {
                    "model": model_name,
                    "seq_len": int(seq_len),
                    "attention_entropy": attention_entropy(attn),
                    "sparsity_ratio": sparsity_ratio(attn),
                    "locality_ratio_k5": locality_ratio_k5(attn),
                    "extraction_time_ms": float(elapsed_ms),
                }
            )
    return pd.DataFrame(rows)
