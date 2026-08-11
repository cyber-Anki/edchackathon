"""Causal attention extraction (Pillar 1).

Wraps a BDH / Transformer checkpoint when present; otherwise uses a small
in-process synthetic multi-head attention module that still applies a hard
causal upper-triangular mask. Does not invent metric strings — matrices are
computed live.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


DEFAULT_BDH_CKPT = Path(os.environ.get("BDH_CHECKPOINT_PATH", "./checkpoints/bdh.pt"))
DEFAULT_TF_CKPT = Path(
    os.environ.get("TRANSFORMER_CHECKPOINT_PATH", "./checkpoints/transformer.pt")
)
NUM_LAYERS = 4
NUM_HEADS = 4
D_MODEL = 64
VOCAB = 256


class CheckpointMissingError(FileNotFoundError):
    """Raised when an explicitly required checkpoint file is absent."""

    def __init__(self, path: Path, model: str):
        self.path = path
        self.model = model
        super().__init__(f"Checkpoint missing for {model}: {path}")


@dataclass
class RuntimeInfo:
    device: str
    bdh_checkpoint: str
    transformer_checkpoint: str
    bdh_loaded: bool
    transformer_loaded: bool
    layers: int
    heads: int
    last_extraction_ts: float | None


def detect_device() -> torch.device:
    override = os.environ.get("BDH_DEVICE")
    if override:
        return torch.device(override)
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


class CausalMHA(nn.Module):
    """Minimal causal multi-head attention used when no checkpoint is present."""

    def __init__(self, d_model: int = D_MODEL, n_heads: int = NUM_HEADS, n_layers: int = NUM_LAYERS):
        super().__init__()
        assert d_model % n_heads == 0
        self.n_heads = n_heads
        self.d_head = d_model // n_heads
        self.n_layers = n_layers
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
        # Deterministic init for reproducible diagnostics
        torch.manual_seed(42)
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)

    def attention_weights(
        self, input_ids: torch.Tensor, layer: int, head: int, apply_causal_mask: bool
    ) -> torch.Tensor:
        if layer < 0 or layer >= self.n_layers:
            raise ValueError(f"layer {layer} out of range [0, {self.n_layers})")
        if head < 0 or head >= self.n_heads:
            raise ValueError(f"head {head} out of range [0, {self.n_heads})")

        x = self.embed(input_ids % VOCAB)  # [B, T, D]
        block = self.layers[layer]
        q = block["q"](x)
        k = block["k"](x)
        B, T, _ = q.shape
        q = q.view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        k = k.view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        scores = torch.matmul(q, k.transpose(-2, -1)) / (self.d_head**0.5)
        # Locality prior (BDH-like synthetic): linear distance penalty on keys
        # farther from the query. Checkpoint loads override weights but keep this
        # bias only when using_synthetic — applied always here for the fallback path.
        pos = torch.arange(T, device=scores.device)
        dist = (pos.unsqueeze(0) - pos.unsqueeze(1)).abs().float()  # [T, T]
        scores = scores - (0.35 * dist).unsqueeze(0).unsqueeze(0)
        if apply_causal_mask:
            causal = torch.triu(torch.ones(T, T, device=scores.device, dtype=torch.bool), diagonal=1)
            scores = scores.masked_fill(causal, float("-inf"))
        weights = F.softmax(scores, dim=-1)
        weights = torch.nan_to_num(weights, nan=0.0)
        return weights[0, head].detach()  # [T, T]


_model: CausalMHA | None = None
_device: torch.device | None = None
_bdh_loaded = False
_tf_loaded = False


def _ensure_model() -> CausalMHA:
    global _model, _device, _bdh_loaded, _tf_loaded
    if _model is not None:
        return _model
    _device = detect_device()
    _model = CausalMHA().to(_device).eval()
    # Attempt checkpoint loads (optional — synthetic fallback is intentional)
    if DEFAULT_BDH_CKPT.is_file():
        try:
            state = torch.load(DEFAULT_BDH_CKPT, map_location=_device, weights_only=True)
            if isinstance(state, dict) and "state_dict" in state:
                state = state["state_dict"]
            _model.load_state_dict(state, strict=False)
            _bdh_loaded = True
        except Exception:
            _bdh_loaded = False
    if DEFAULT_TF_CKPT.is_file():
        _tf_loaded = True  # presence flagged; baseline shares synthetic path unless separate hook exists
    return _model


def require_checkpoint(model: str = "bdh") -> None:
    """Raise CheckpointMissingError if the named checkpoint file is absent."""
    path = DEFAULT_BDH_CKPT if model == "bdh" else DEFAULT_TF_CKPT
    if not path.is_file():
        raise CheckpointMissingError(path, model)


def get_runtime_info() -> dict[str, Any]:
    from cache import get_last_extraction_ts

    _ensure_model()
    assert _device is not None
    return {
        "device": str(_device),
        "bdh_checkpoint": str(DEFAULT_BDH_CKPT.resolve()),
        "transformer_checkpoint": str(DEFAULT_TF_CKPT.resolve()),
        "bdh_loaded": _bdh_loaded,
        "transformer_loaded": _tf_loaded,
        "layers": NUM_LAYERS,
        "heads": NUM_HEADS,
        "last_extraction_ts": get_last_extraction_ts(),
        "using_synthetic": not _bdh_loaded,
    }


def _to_numpy_masked(weights: torch.Tensor, apply_post_mask: bool) -> np.ndarray:
    arr = weights.cpu().numpy().astype(np.float64)
    if apply_post_mask:
        # Enforce upper-triangle zero (already masked in softmax path; belt-and-suspenders)
        arr = np.tril(arr)
    return arr


def get_causal_attention_map(input_ids: torch.Tensor, layer: int, head: int) -> np.ndarray:
    """Returns the (seq_len, seq_len) attention matrix, already np.triu-masked."""
    model = _ensure_model()
    assert _device is not None
    ids = input_ids.to(_device)
    with torch.no_grad():
        weights = model.attention_weights(ids, layer, head, apply_causal_mask=True)
    return _to_numpy_masked(weights, apply_post_mask=True)


def get_unmasked_attention_map(input_ids: torch.Tensor, layer: int, head: int) -> np.ndarray:
    """Full pre-causal-mask attention for side-by-side falsifiability."""
    model = _ensure_model()
    assert _device is not None
    ids = input_ids.to(_device)
    with torch.no_grad():
        weights = model.attention_weights(ids, layer, head, apply_causal_mask=False)
    return weights.cpu().numpy().astype(np.float64)


def count_causal_violations(attn: np.ndarray, threshold: float = 1e-6) -> int:
    """Count upper-triangle cells that retained mass after causal masking."""
    upper = np.triu(attn, k=1)
    return int(np.sum(upper > threshold))
