# BDH//SCOPE

Causal Attention Diagnostic Console for Pathway's Dragon Hatchling (BDH) architecture — StarForge Hackathon, DragonForge Track 02.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS v3 + Plotly + TanStack Query
- **Backend:** Python 3.11 + FastAPI

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Optional env:

- `BDH_CHECKPOINT_PATH` — path to BDH checkpoint (default `./checkpoints/bdh.pt`)
- `TRANSFORMER_CHECKPOINT_PATH` — baseline checkpoint
- `BDH_DEVICE` — `cpu` or `cuda` (auto-detected if unset)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to `http://localhost:8000`.

## Pages

| Route | Purpose |
|---|---|
| `/` | Overview — live metric strip + thumbnails |
| `/attention` | Attention Explorer — causal heatmap proof |
| `/benchmark` | Benchmark Suite — entropy / sparsity / locality |
| `/methodology` | Metric definitions & limitations |
| `/contribution` | Proposed diagnostics PR tree |

## Design

Locked tokens live in `frontend/src/styles/theme.css` and `frontend/src/theme/tokens.ts`. See `NOTES.md` for build assumptions.
