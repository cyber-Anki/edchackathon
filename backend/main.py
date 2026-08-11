"""FastAPI app — CORS, route registration. Does not import torch directly."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from cache import (
    cached_attention_map,
    cached_benchmark,
    get_last_benchmark_ts,
    get_last_extraction_ts,
)
from extraction import CheckpointMissingError, count_causal_violations, get_runtime_info
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app = FastAPI(title="BDH//SCOPE", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _ts_iso(ts: float | None) -> str | None:
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


@app.get("/api/status")
def api_status() -> dict[str, Any]:
    info = get_runtime_info()
    info["last_extraction_ts"] = _ts_iso(get_last_extraction_ts())
    info["last_benchmark_ts"] = _ts_iso(get_last_benchmark_ts())
    return info


@app.get("/api/attention")
def api_attention(
    layer: int = Query(..., ge=0),
    head: int = Query(..., ge=0),
    seq_len: int = Query(64, ge=4, le=512),
    unmasked: bool = Query(False),
    require_checkpoint: bool = Query(False),
) -> dict[str, Any]:
    try:
        if require_checkpoint:
            from extraction import require_checkpoint

            require_checkpoint("bdh")
        matrix = cached_attention_map(seq_len, layer, head, unmasked)
        arr_list = [list(row) for row in matrix]
        violations = 0
        if not unmasked:
            import numpy as np

            violations = count_causal_violations(np.asarray(arr_list))
        return {
            "layer": layer,
            "head": head,
            "seq_len": seq_len,
            "unmasked": unmasked,
            "matrix": arr_list,
            "causal_violations": violations,
            "masked_positions": "none" if unmasked else "upper triangle",
        }
    except CheckpointMissingError as e:
        return JSONResponse(
            status_code=503,
            content={
                "error": "checkpoint_missing",
                "message": str(e),
                "expected_path": str(e.path),
                "model": e.model,
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/api/benchmark")
def api_benchmark(
    seq_lengths: str = Query("128,512,2048"),
    models: str = Query("bdh,transformer"),
    require_checkpoint: bool = Query(False),
) -> Any:
    try:
        if require_checkpoint:
            from extraction import require_checkpoint

            require_checkpoint("bdh")
        lengths = tuple(int(x.strip()) for x in seq_lengths.split(",") if x.strip())
        model_list = tuple(m.strip() for m in models.split(",") if m.strip())
        if not lengths:
            raise ValueError("seq_lengths must not be empty")
        records = cached_benchmark(lengths, model_list)
        return {
            "records": list(records),
            "seq_lengths": list(lengths),
            "models": list(model_list),
            "cached_at": _ts_iso(get_last_benchmark_ts()),
        }
    except CheckpointMissingError as e:
        return JSONResponse(
            status_code=503,
            content={
                "error": "checkpoint_missing",
                "message": str(e),
                "expected_path": str(e.path),
                "model": e.model,
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

# 3. REQUEST BODY MODEL
class ExtractRequest(BaseModel):
    prompt: str


# 4. API ENDPOINTS (Paste here)
@app.post("/api/extract")
async def extract_attention(req: ExtractRequest):
    # Your extraction logic here
    return {
        "status": "success",
        "metrics": {"entropy": 2.148, "sparsity": 82.4, "locality": 88.6},
        "heatmap_url": "http://127.0.0.1:8000/static/diagnostic_output.png",
    }


# 5. SERVER RUNNER (Keep this at the very bottom if you have it)
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    
@app.get("/api/overview")
def api_overview() -> dict[str, Any]:
    """Aggregate strip metrics for the Overview page — all live, none hardcoded."""
    info = get_runtime_info()
    # Probe a small causal map for violation count
    matrix = cached_attention_map(32, 0, 0, False)
    import numpy as np

    violations = count_causal_violations(np.asarray([list(r) for r in matrix]))
    bench_ts = get_last_benchmark_ts()
    runtime_delta_pct: float | None = None
    seq_lengths_benchmarked = 0
    try:
        # Prefer a light default benchmark if none cached yet
        records = list(cached_benchmark((128, 512), ("bdh", "transformer")))
        seq_lengths_benchmarked = len({r["seq_len"] for r in records})
        bdh_times = [r["extraction_time_ms"] for r in records if r["model"] == "bdh"]
        tf_times = [r["extraction_time_ms"] for r in records if r["model"] == "transformer"]
        if bdh_times and tf_times:
            bdh_mean = sum(bdh_times) / len(bdh_times)
            tf_mean = sum(tf_times) / len(tf_times)
            if tf_mean > 0:
                runtime_delta_pct = ((bdh_mean - tf_mean) / tf_mean) * 100.0
    except Exception:
        pass

    return {
        "causal_violations": violations,
        "layers_instrumented": info["layers"],
        "seq_lengths_benchmarked": seq_lengths_benchmarked,
        "runtime_delta_pct": runtime_delta_pct,
        "last_extraction_ts": _ts_iso(get_last_extraction_ts()),
        "last_benchmark_ts": _ts_iso(bench_ts),
        "status": info,
    }
