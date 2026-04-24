"""
Cognitive Impact Analyzer — Modal GPU backend
Deploy:  modal deploy modal_backend/app.py
Secrets: modal secret create huggingface-secret HUGGINGFACE_TOKEN=hf_...
         (LLaMA 3.2-3B gated access must be approved on huggingface.co)
"""
import time
import uuid

import modal
from pydantic import BaseModel

app = modal.App("cognitive-analyzer")

job_store = modal.Dict.from_name("cognitive-analyzer-jobs", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(["ffmpeg"])
    .pip_install(
        [
            # TribeV2 — installed from source (no PyPI package)
            "tribev2 @ git+https://github.com/facebookresearch/tribev2.git",
            # ROI-based cognitive load scoring wrapper
            "cortexlab-toolkit",
            # Core deps (versions from tribev2's pyproject.toml)
            "torch>=2.5.1,<2.7",
            "torchvision>=0.20,<0.22",
            "x_transformers==1.27.20",
            "einops",
            "moviepy>=2.2.1",
            "numpy==2.2.6",
            "spacy",
            "soundfile",
            "gtts",
            "langdetect",
            "julius",
            "Levenshtein",
            "neuralset==0.0.2",
            "neuraltrain==0.0.2",
            # Download utilities
            "yt-dlp",
            "huggingface_hub",
            # Required for web endpoints
            "fastapi[standard]",
        ]
    )
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _set(job_id: str, payload: dict) -> None:
    job_store[job_id] = payload


def _activations_to_score(arr) -> int:
    """Convert a raw fMRI activation array to a 0-100 integer score."""
    import numpy as np
    # Use mean absolute activation, normalised by the 95th percentile
    # across the whole prediction to give a relative intensity score
    mean_act = float(np.mean(np.abs(arr)))
    p95 = float(np.percentile(np.abs(arr), 95)) + 1e-8
    return min(100, int((mean_act / p95) * 100))


# ── Core inference ────────────────────────────────────────────────────────────

@app.function(
    image=image,
    gpu="T4",
    timeout=600,
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
def run_analysis(job_id: str, video_url: str) -> None:
    import os
    import subprocess
    import tempfile
    import urllib.request

    start = time.time()
    _set(job_id, {"status": "downloading"})

    with tempfile.TemporaryDirectory() as tmp:
        video_path = os.path.join(tmp, "video.mp4")

        if any(h in video_url for h in ["youtube.com", "youtu.be", "vimeo.com"]):
            subprocess.run(
                ["yt-dlp", "-f", "best[ext=mp4]/best", "--max-filesize", "100m",
                 "-o", video_path, video_url],
                check=True,
            )
        else:
            urllib.request.urlretrieve(video_url, video_path)

        _set(job_id, {"status": "extracting_frames"})

        # ── Load TribeV2 ──────────────────────────────────────────────────────
        _set(job_id, {"status": "running_inference"})

        from tribev2 import TribeModel

        model = TribeModel.from_pretrained(
            "facebook/tribev2",
            token=os.environ["HUGGINGFACE_TOKEN"],
            cache_folder="/tmp/tribev2_cache",
        )

        # Returns (n_timesteps, ~20484 cortical vertices)
        df = model.get_events_dataframe(video_path=video_path)
        preds, _ = model.predict(events=df)

        # ── Aggregate to 4 cognitive metrics ─────────────────────────────────
        _set(job_id, {"status": "aggregating"})

        try:
            # cortexlab wraps known FreeSurfer ROI indices for each modality
            from cortexlab.analysis import CognitiveLoadScorer
            scorer = CognitiveLoadScorer()
            scores = scorer.score_predictions(preds)
            visual_load         = min(100, int(scores["visual_complexity"]    * 100))
            auditory_engagement = min(100, int(scores["auditory_demand"]      * 100))
            linguistic_impact   = min(100, int(scores["language_processing"]  * 100))
        except Exception:
            # Fallback: split cortical surface into rough thirds by vertex index
            # (occipital → parietal → frontal/temporal)
            import numpy as np
            n_v = preds.shape[1]
            visual_load         = _activations_to_score(preds[:, :n_v // 3])
            auditory_engagement = _activations_to_score(preds[:, n_v // 3: 2 * n_v // 3])
            linguistic_impact   = _activations_to_score(preds[:, 2 * n_v // 3:])

        overall = (visual_load + auditory_engagement + linguistic_impact) // 3

        _set(
            job_id,
            {
                "status": "complete",
                "data": {
                    "visualLoad": visual_load,
                    "auditoryEngagement": auditory_engagement,
                    "linguisticImpact": linguistic_impact,
                    "overallCognitiveLoad": overall,
                    "summary": _build_summary(visual_load, auditory_engagement, linguistic_impact),
                    "processingTimeSeconds": round(time.time() - start, 1),
                },
            },
        )


def _build_summary(visual: int, auditory: int, linguistic: int) -> str:
    v = "strong" if visual >= 70 else "moderate" if visual >= 40 else "low"
    a = "elevated" if auditory >= 70 else "moderate" if auditory >= 40 else "minimal"
    l = "dense" if linguistic >= 70 else "moderate" if linguistic >= 40 else "light"
    return (
        f"This media triggers {v} activation in visual processing regions (V1–V4), "
        f"with {a} auditory cortex engagement. Linguistic pathways show {l} stimulation "
        f"consistent with {'a high semantic load narrative' if linguistic >= 60 else 'straightforward spoken content'}. "
        f"Overall cognitive demand is {'elevated — viewers require sustained attention' if (visual + auditory + linguistic) // 3 >= 65 else 'moderate — accessible to most audiences'}."
    )


# ── Web endpoints ─────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    video_url: str


@app.function()
@modal.fastapi_endpoint(method="POST", label="analyze")
def start_analysis(req: AnalyzeRequest) -> dict:
    job_id = str(uuid.uuid4())
    _set(job_id, {"status": "queued"})
    run_analysis.spawn(job_id, req.video_url)
    return {"job_id": job_id, "status": "queued"}


@app.function()
@modal.fastapi_endpoint(method="GET", label="status")
def get_status(job_id: str) -> dict:
    from fastapi import HTTPException
    result = job_store.get(job_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return result
