"""
Cognitive Impact Analyzer — Modal GPU backend
Deploy:  modal deploy modal_backend/app.py
Secrets: create a Modal secret named "huggingface-secret" with key HUGGINGFACE_TOKEN
         (needed for gated LLaMA 3.2-3B used by TribeV2)
"""
import time
import uuid

import modal
from pydantic import BaseModel

app = modal.App("cognitive-analyzer")

# Persistent key-value store for job results (free, built into Modal)
job_store = modal.Dict.from_name("cognitive-analyzer-jobs", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(["ffmpeg"])
    .pip_install(
        [
            "torch",
            "transformers>=4.40.0",
            "huggingface_hub",
            "accelerate",
            "yt-dlp",
            "numpy",
            "Pillow",
            # Add the TribeV2 package once its PyPI name is confirmed:
            # "tribe-neuroscience",
        ]
    )
)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _set(job_id: str, payload: dict) -> None:
    job_store[job_id] = payload


# ── Core inference function ───────────────────────────────────────────────────

@app.function(
    image=image,
    gpu="T4",       # Upgrade to "A10G" or "A100" if TribeV2 requires more VRAM
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
                [
                    "yt-dlp",
                    "-f", "best[ext=mp4]/best",
                    "--max-filesize", "100m",
                    "-o", video_path,
                    video_url,
                ],
                check=True,
            )
        else:
            urllib.request.urlretrieve(video_url, video_path)

        _set(job_id, {"status": "extracting_frames"})

        # Optional: extract 1-fps frames for frame-level analysis
        # frames_dir = os.path.join(tmp, "frames")
        # os.makedirs(frames_dir)
        # subprocess.run(
        #     ["ffmpeg", "-i", video_path, "-vf", "fps=1", f"{frames_dir}/%04d.jpg"],
        #     check=True,
        # )

        _set(job_id, {"status": "running_inference"})

        # ── TribeV2 integration ───────────────────────────────────────────────
        # Uncomment once the library and HF access are confirmed:
        #
        # from tribe import TribeModel
        # model = TribeModel.from_pretrained(
        #     "facebook/tribev2",
        #     token=os.environ["HUGGINGFACE_TOKEN"],
        # )
        # raw = model.predict(video_path)
        # events_df = model.get_events_dataframe(video_path)
        #
        # visual_load        = int(raw["visual"].mean() * 100)
        # auditory_engagement = int(raw["auditory"].mean() * 100)
        # linguistic_impact   = int(raw["linguistic"].mean() * 100)
        # overall             = (visual_load + auditory_engagement + linguistic_impact) // 3
        # summary             = _build_summary(visual_load, auditory_engagement, linguistic_impact)
        # ─────────────────────────────────────────────────────────────────────

        # Placeholder values until the model is wired up:
        visual_load = 84
        auditory_engagement = 62
        linguistic_impact = 71
        overall = (visual_load + auditory_engagement + linguistic_impact) // 3
        summary = (
            "This media triggers strong activation in visual processing regions (V1–V4) "
            "consistent with rapid scene changes and high-contrast imagery. Auditory cortex "
            "engagement is moderate with periodic peaks during speech segments. Linguistic "
            "pathways show above-average stimulation indicating dense narrative structure "
            "with high semantic load."
        )

        _set(job_id, {"status": "aggregating"})
        time.sleep(0.5)

        _set(
            job_id,
            {
                "status": "complete",
                "data": {
                    "visualLoad": visual_load,
                    "auditoryEngagement": auditory_engagement,
                    "linguisticImpact": linguistic_impact,
                    "overallCognitiveLoad": overall,
                    "summary": summary,
                    "processingTimeSeconds": round(time.time() - start, 1),
                },
            },
        )


# ── Web endpoints ─────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    video_url: str


@app.function()
@modal.web_endpoint(method="POST", label="analyze")
def start_analysis(req: AnalyzeRequest) -> dict:
    job_id = str(uuid.uuid4())
    _set(job_id, {"status": "queued"})
    run_analysis.spawn(job_id, req.video_url)
    return {"job_id": job_id, "status": "queued"}


@app.function()
@modal.web_endpoint(method="GET", label="status")
def get_status(job_id: str) -> dict:
    from fastapi import HTTPException

    result = job_store.get(job_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return result
