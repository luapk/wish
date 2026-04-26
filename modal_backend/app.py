"""
Cognitive Impact Analyzer — Modal GPU backend
Deploy:  modal deploy modal_backend/app.py
Secrets: modal secret create huggingface-secret HUGGINGFACE_TOKEN=hf_...
         modal secret create anthropic-secret ANTHROPIC_API_KEY=sk-ant-...
"""
import time
import uuid

import modal
from pydantic import BaseModel

app = modal.App("cognitive-analyzer")

job_store = modal.Dict.from_name("cognitive-analyzer-jobs", create_if_missing=True)


def _compute_verdict(score: int) -> str:
    if score >= 80: return "Critical Cognitive Load"
    if score >= 65: return "High Cognitive Impact"
    if score >= 45: return "Moderate Cognitive Demand"
    return "Low Cognitive Load"

endpoint_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(["fastapi[standard]", "pydantic"])
)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(["ffmpeg", "git"])
    .pip_install(
        [
            "tribev2 @ git+https://github.com/facebookresearch/tribev2.git",
            "cortexlab-toolkit",
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
            "yt-dlp",
            "huggingface_hub",
            "fastapi[standard]",
            # Vision analysis for contextual moments
            "anthropic>=0.40.0",
            "Pillow",
        ]
    )
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _set(job_id: str, payload: dict) -> None:
    job_store[job_id] = payload


def _activations_to_score(arr) -> int:
    import numpy as np
    mean_act = float(np.mean(np.abs(arr)))
    p95 = float(np.percentile(np.abs(arr), 95)) + 1e-8
    return min(100, int((mean_act / p95) * 100))


def _score_with_ci(arr) -> tuple[int, dict]:
    """Return (score 0-100, {"low": int, "high": int}) from activation array (n_timesteps, n_vertices)."""
    import numpy as np
    frame_means = np.mean(np.abs(arr), axis=1)
    p95 = np.percentile(frame_means, 95) + 1e-8
    normed = np.clip(frame_means / p95, 0, 1) * 100
    score = min(100, int(np.mean(normed)))
    spread = max(5, min(15, int(np.std(normed) * 0.5)))
    return score, {"low": max(0, score - spread), "high": min(100, score + spread)}


# ── Frame extraction ──────────────────────────────────────────────────────────

def extract_keyframes(video_path: str, max_frames: int = 24) -> list[tuple[float, bytes]]:
    """
    Extract up to max_frames frames spaced evenly through the video.
    Returns list of (timestamp_seconds, jpeg_bytes).
    """
    import subprocess
    import json
    import os
    import tempfile

    # Get video duration
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", video_path],
        capture_output=True, text=True
    )
    duration = float(json.loads(probe.stdout).get("format", {}).get("duration", 60))

    interval = max(1.0, duration / max_frames)
    timestamps = [round(i * interval, 1) for i in range(int(duration / interval))][:max_frames]

    frames: list[tuple[float, bytes]] = []
    with tempfile.TemporaryDirectory() as tmp:
        for ts in timestamps:
            out_path = os.path.join(tmp, f"frame_{ts:.1f}.jpg")
            result = subprocess.run(
                ["ffmpeg", "-ss", str(ts), "-i", video_path,
                 "-frames:v", "1", "-q:v", "5", "-vf", "scale=480:-1",
                 out_path, "-y"],
                capture_output=True
            )
            if result.returncode == 0 and os.path.exists(out_path):
                with open(out_path, "rb") as f:
                    frames.append((ts, f.read()))

    return frames


# ── Vision-based moment detection ────────────────────────────────────────────

def detect_moments_with_vision(
    frames: list[tuple[float, bytes]],
    duration: float,
) -> list[dict]:
    """
    Send video frames to Claude vision to get scene-specific moment annotations.
    Returns list of ContextualMoment dicts.
    """
    import base64
    import json
    import os
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return []

    client = anthropic.Anthropic(api_key=api_key)

    # Build the image content blocks (sample up to 12 frames for the API call)
    step = max(1, len(frames) // 12)
    sampled = frames[::step][:12]

    image_blocks = []
    frame_labels = []
    for ts, jpeg_bytes in sampled:
        b64 = base64.standard_b64encode(jpeg_bytes).decode()
        image_blocks.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": b64},
        })
        frame_labels.append(f"Frame at {ts:.1f}s")

    timestamp_list = ", ".join(f"{ts:.1f}s" for ts, _ in sampled)

    prompt = f"""You are analysing frames from a video advertisement or media clip. The frames shown are at timestamps: {timestamp_list}.

For each frame, identify what is happening visually and narratively. Then select the 5-7 most cognitively significant moments in the full {duration:.0f}-second video.

For each moment return:
- t: timestamp in seconds (integer, must match one of the frame timestamps provided)
- dur: how long the moment lasts (2–5 seconds)
- label: a short title (2–5 words, describing what is literally happening — e.g. "Dog close-up", "Product packshot", "Endline appears")
- detail: 1-2 sentences explaining (a) what is happening on screen and (b) the specific cognitive/emotional response this triggers and which brain networks activate
- regions: array of 1-4 of these exact strings: ["visual","auditory","linguistic","attention","emotion","memory","executive"]
- intensity: activation strength 0.0–1.0

Respond ONLY with valid JSON in this exact format:
{{
  "moments": [
    {{"t": 2, "dur": 3, "label": "...", "detail": "...", "regions": ["visual","attention"], "intensity": 0.82}},
    ...
  ]
}}"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            messages=[{
                "role": "user",
                "content": image_blocks + [{"type": "text", "text": prompt}],
            }],
        )
        raw = response.content[0].text.strip()
        # Extract JSON even if wrapped in markdown fences
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        return data.get("moments", [])
    except Exception as e:
        print(f"Vision analysis failed: {e}")
        return []


# ── Temporal activation from TribeV2 predictions ─────────────────────────────

def build_temporal_data(preds, duration: float) -> list[dict]:
    """
    Down-sample TribeV2 per-timestep predictions into per-second regional activations.
    preds shape: (n_timesteps, n_vertices)
    """
    import numpy as np

    n_t, n_v = preds.shape
    # Simple anatomical vertex splits (thirds: occipital / parietal-temporal / frontal)
    third     = n_v // 7
    v_visual    = preds[:, :third]
    v_auditory  = preds[:, third:2*third]
    v_linguistic= preds[:, 2*third:3*third]
    v_attention = preds[:, 3*third:4*third]
    v_emotion   = preds[:, 4*third:5*third]
    v_memory    = preds[:, 5*third:6*third]
    v_executive = preds[:, 6*third:]

    def norm_series(arr):
        means = np.mean(np.abs(arr), axis=1)
        p95 = np.percentile(means, 95) + 1e-8
        return np.clip(means / p95, 0, 1).tolist()

    vis = norm_series(v_visual)
    aud = norm_series(v_auditory)
    lin = norm_series(v_linguistic)
    att = norm_series(v_attention)
    emo = norm_series(v_emotion)
    mem = norm_series(v_memory)
    exe = norm_series(v_executive)

    # Resample to 1 sample per second
    frames = []
    n_out  = int(duration)
    for sec in range(n_out):
        idx = min(int(sec / duration * n_t), n_t - 1)
        frames.append({
            "t":         sec,
            "visual":    round(vis[idx], 3),
            "auditory":  round(aud[idx], 3),
            "linguistic":round(lin[idx], 3),
            "attention": round(att[idx], 3),
            "emotion":   round(emo[idx], 3),
            "memory":    round(mem[idx], 3),
            "executive": round(exe[idx], 3),
        })
    return frames


# ── Core inference ────────────────────────────────────────────────────────────

@app.function(
    image=image,
    gpu="T4",
    timeout=600,
    secrets=[
        modal.Secret.from_name("huggingface-secret"),
        modal.Secret.from_name("anthropic-secret"),
    ],
)
def run_analysis(job_id: str, video_url: str, audience: str = "all") -> None:
    import os
    import json
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

        # Get video duration
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", video_path],
            capture_output=True, text=True
        )
        duration = float(json.loads(probe.stdout).get("format", {}).get("duration", 60))

        _set(job_id, {"status": "extracting_frames"})

        # Extract keyframes for vision analysis (runs in parallel with inference)
        keyframes = extract_keyframes(video_path, max_frames=20)

        # ── TribeV2 inference ─────────────────────────────────────────────────
        _set(job_id, {"status": "running_inference"})

        from tribev2 import TribeModel
        model = TribeModel.from_pretrained(
            "facebook/tribev2",
            token=os.environ["HUGGINGFACE_TOKEN"],
            cache_folder="/tmp/tribev2_cache",
        )
        df   = model.get_events_dataframe(video_path=video_path)
        preds, _ = model.predict(events=df)

        _set(job_id, {"status": "aggregating"})

        # ── Aggregate scores + confidence bands ───────────────────────────────
        import numpy as np
        n_v = preds.shape[1]
        vis_arr = preds[:, :n_v // 3]
        aud_arr = preds[:, n_v // 3: 2 * n_v // 3]
        lin_arr = preds[:, 2 * n_v // 3:]

        try:
            from cortexlab.analysis import CognitiveLoadScorer
            scorer = CognitiveLoadScorer()
            scores = scorer.score_predictions(preds)
            visual_load         = min(100, int(scores["visual_complexity"]   * 100))
            auditory_engagement = min(100, int(scores["auditory_demand"]     * 100))
            linguistic_impact   = min(100, int(scores["language_processing"] * 100))
            _, vis_ci = _score_with_ci(vis_arr)
            _, aud_ci = _score_with_ci(aud_arr)
            _, lin_ci = _score_with_ci(lin_arr)
        except Exception:
            visual_load,         vis_ci = _score_with_ci(vis_arr)
            auditory_engagement, aud_ci = _score_with_ci(aud_arr)
            linguistic_impact,   lin_ci = _score_with_ci(lin_arr)

        overall = (visual_load + auditory_engagement + linguistic_impact) // 3
        overall_ci = {
            "low":  (vis_ci["low"]  + aud_ci["low"]  + lin_ci["low"])  // 3,
            "high": (vis_ci["high"] + aud_ci["high"] + lin_ci["high"]) // 3,
        }

        # ── Temporal activation data ──────────────────────────────────────────
        temporal_data = build_temporal_data(preds, duration)

        # ── Vision-based contextual moments ──────────────────────────────────
        moments = detect_moments_with_vision(keyframes, duration)

        _set(job_id, {
            "status": "complete",
            "data": {
                "visualLoad":           visual_load,
                "auditoryEngagement":   auditory_engagement,
                "linguisticImpact":     linguistic_impact,
                "overallCognitiveLoad": overall,
                "verdict":              _compute_verdict(overall),
                "audience":             audience,
                "summary":              _build_summary(visual_load, auditory_engagement, linguistic_impact),
                "processingTimeSeconds":round(time.time() - start, 1),
                "confidence": {
                    "visualLoad":           vis_ci,
                    "auditoryEngagement":   aud_ci,
                    "linguisticImpact":     lin_ci,
                    "overallCognitiveLoad": overall_ci,
                },
                "temporalData":         temporal_data,
                "moments":              moments,
            },
        })


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
    audience: str = "all"


@app.function(image=endpoint_image)
@modal.fastapi_endpoint(method="POST", label="analyze")
def start_analysis(req: AnalyzeRequest) -> dict:
    job_id = str(uuid.uuid4())
    _set(job_id, {"status": "queued"})
    run_analysis.spawn(job_id, req.video_url, req.audience)
    return {"job_id": job_id, "status": "queued"}


@app.function(image=endpoint_image)
@modal.fastapi_endpoint(method="GET", label="status")
def get_status(job_id: str) -> dict:
    from fastapi import HTTPException
    result = job_store.get(job_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return result
