# 🔬 BDH Attention Microscope

> **Dragonforge Track 02 — Model Internals & Interpretability**  
> A Quantitative Observability & Benchmarking Suite for Post-Transformer Networks (Pathway BDH)

---

## 📌 Overview & Problem Statement

Pathway's **BDH (Dragon Hatchling)** model introduces novel sparse attention mechanisms, but researchers and engineers face three major challenges when working with it:

1. **The Black-Box Bottleneck:** BDH currently lacks live, internal diagnostic tooling during inference execution.
2. **Unverified Claims:** Researchers must take theoretical claims about the model's attention efficiency and locality on faith without live empirical verification.
3. **Missing Baselines:** No standardized framework exists to quantitatively evaluate and benchmark BDH's internal mechanics directly against standard Vanilla Multi-Head Transformers.

---

## 💡 The Solution

**BDH Attention Microscope** provides real-time, non-destructive tensor observability for BDH model execution paired with an interactive diagnostic dashboard.

### Key Features
* **Non-Destructive Tensor Hooks:** Python hooks intercept $(Q \cdot K^T)$ query-key multiplications directly from the `bdh.py` inference loop with strictly bounded VRAM overhead.
* **Real-Time Mathematical Metrics:**
  * **Mean Attention Entropy:** Measures attention mass dispersion across key tokens per query.
  * **Causal Sparsity Ratio (%):** Calculates the exact share of zero/near-zero attention weights active per pass.
  * **Locality Index ($k=5$):** Quantifies attention concentration within a 5-token trailing local window.
* **Interactive Diagnostic Console:** A low-latency React dashboard featuring live prompt sequence execution, dynamic causal mask heatmaps, and side-by-side architectural benchmarking against Vanilla Transformers.
* **Open-Source Standard:** Built to easily upstream extraction hooks into the official `pathwaycom/bdh` repository.

---

## 🛠️ Tech Stack

* **Backend:** Python 3.10+, PyTorch, FastAPI, Uvicorn, NumPy
* **Frontend:** React, Tailwind CSS, Lucide Icons, Recharts
* **Target Model:** Pathway BDH (`bdh.py`) & Standard PyTorch Multi-Head Transformer

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
* Python 3.10 or higher
* Node.js v18+ & npm

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI diagnostic server (Runs on port 8000)
uvicorn main:app --reload --port 8000
```
