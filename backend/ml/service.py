"""
RoadSense ML Microservice
FastAPI service for road event classification and clustering.
Runs as a separate service, called by the Node.js BullMQ worker.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np

from classifier import classify_poc, detect_broken_patches, train_and_save
from clustering import cluster_and_confirm

app = FastAPI(title="RoadSense ML Service", version="1.0.0")


@app.get("/")
async def root():
    return {
        "service": "roadsense-ml",
        "version": "1.0.0",
        "endpoints": ["/health", "/classify", "/cluster", "/train", "/model/status"],
    }


# ── Request Models ──────────────────────────────────────────────────────────


class PocCandidate(BaseModel):
    z_value: float
    z_next: float | None = None
    z_prev: float | None = None
    tp: float = 0.0
    speed_kmh: float = 0.0
    lat: float = 0.0
    lng: float = 0.0
    recorded_at: str | None = None


class ClassifyRequest(BaseModel):
    candidates: list[PocCandidate]


class ClusterRequest(BaseModel):
    events: list[dict]  # {lat, lng, event_type, trip_id, recorded_at}
    total_trails: int


class TrainRequest(BaseModel):
    X: list[list[float]]  # Feature vectors: [z_value, z_next, z_prev, tp, speed]
    y: list[int]  # Labels: 0=anomaly, 1=speed_breaker, 2=pothole, 3=broken_patch


# ── Endpoints ───────────────────────────────────────────────────────────────


@app.get("/health")
async def health():
    return {"status": "ok", "service": "roadsense-ml"}


@app.post("/classify")
async def classify(req: ClassifyRequest):
    """Classify a batch of PoC candidates using the J48 Decision Tree."""
    results = []
    for poc in req.candidates:
        event_type, confidence = classify_poc(
            z_value=poc.z_value,
            z_next=poc.z_next,
            z_prev=poc.z_prev,
            tp=poc.tp,
            speed_kmh=poc.speed_kmh,
        )
        results.append(
            {
                "event_type": event_type,
                "confidence": confidence,
                "lat": poc.lat,
                "lng": poc.lng,
                "z_value": poc.z_value,
            }
        )
    return {"results": results, "count": len(results)}


@app.post("/detect-broken-patches")
async def detect_patches(req: ClassifyRequest):
    """Detect broken patches from consecutive events within time window."""
    events = [
        {
            "recorded_at": poc.recorded_at or "",
            "z_value": poc.z_value,
            "lat": poc.lat,
            "lng": poc.lng,
        }
        for poc in req.candidates
    ]
    patches = detect_broken_patches(events)
    return {"patches": patches, "count": len(patches)}


@app.post("/cluster")
async def cluster(req: ClusterRequest):
    """Cluster events and confirm using k-Medoids algorithm."""
    if not req.events:
        return {"confirmed": [], "count": 0}

    confirmed = cluster_and_confirm(req.events, req.total_trails)
    return {"confirmed": confirmed, "count": len(confirmed)}


@app.post("/train")
async def train(req: TrainRequest):
    """Train or retrain the J48 Decision Tree model."""
    if len(req.X) < 10:
        raise HTTPException(400, "Need at least 10 samples to train")

    X = np.array(req.X)
    y = np.array(req.y)

    if X.shape[1] != 5:
        raise HTTPException(400, "Feature vector must have 5 dimensions: [z_value, z_next, z_prev, tp, speed]")

    metrics = train_and_save(X, y)
    return {"message": "Model trained successfully", "metrics": metrics}


@app.get("/model/status")
async def model_status():
    """Check if a trained model exists."""
    from classifier import load_model

    model = load_model()
    if model is None:
        return {"trained": False, "message": "No model found. Using rule-based fallback."}
    return {
        "trained": True,
        "n_classes": len(model.classes_),
        "n_features": model.n_features_in_,
        "depth": model.get_depth(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
