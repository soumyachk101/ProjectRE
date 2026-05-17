"""
J48 Decision Tree Classifier
ML-based classification of road events using scikit-learn.
Source: Section 4.3 of RoadSurP paper (Alam et al., 2020)
"""
import pickle
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import cross_val_score
from pathlib import Path

MODEL_PATH = Path(__file__).parent / "models" / "decision_tree_v1.pkl"

EVENT_LABELS = {0: "anomaly", 1: "speed_breaker", 2: "pothole", 3: "broken_patch"}


def load_model() -> DecisionTreeClassifier | None:
    """Load trained model from disk. Returns None if not found."""
    if not MODEL_PATH.exists():
        return None
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def train_and_save(X: np.ndarray, y: np.ndarray) -> dict:
    """
    Train J48 (DecisionTreeClassifier with entropy criterion).
    Uses 10-fold cross-validation as per the paper.

    Feature vector: [z_value, z_next, z_prev, tp, speed_kmh]
    Labels: 0=anomaly, 1=speed_breaker, 2=pothole, 3=broken_patch
    """
    clf = DecisionTreeClassifier(
        criterion="entropy",  # J48 uses information gain (entropy)
        class_weight="balanced",  # handle class imbalance
        random_state=42,
    )
    cv_scores = cross_val_score(clf, X, y, cv=10, scoring="f1_macro")
    clf.fit(X, y)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(clf, f)

    return {"cv_f1_mean": float(cv_scores.mean()), "cv_f1_std": float(cv_scores.std())}


def classify_poc(
    z_value: float,
    z_next: float | None,
    z_prev: float | None,
    tp: float,
    speed_kmh: float,
) -> tuple[str, float]:
    """
    Classify a single PoC candidate.
    Returns (event_type, confidence_score)
    Falls back to rule-based if no model trained.
    """
    clf = load_model()

    if clf is None:
        # Rule-based fallback (same as current Node.js implementation)
        if z_value > 0:
            return "speed_breaker", 0.6
        elif z_value < 0:
            return "pothole", 0.6
        else:
            return "anomaly", 0.3

    features = np.array(
        [[z_value, z_next or 0.0, z_prev or 0.0, tp, speed_kmh]]
    )
    pred = clf.predict(features)[0]
    conf = float(max(clf.predict_proba(features)[0]))
    return EVENT_LABELS[pred], conf


def detect_broken_patches(
    events: list[dict], time_window_sec: float = 3.0
) -> list[list[dict]]:
    """
    Groups consecutive speed-breakers/potholes into broken patches.
    A broken patch = 3+ events within time_window_sec of each other.
    Source: Section 5.2.1 of the paper
    """
    if not events:
        return []

    events = sorted(events, key=lambda e: e.get("recorded_at", ""))
    groups = []
    i = 0
    while i < len(events):
        group = [events[i]]
        while i + 1 < len(events):
            # Simple time comparison — works with ISO strings
            t1 = events[i].get("recorded_at", "")
            t2 = events[i + 1].get("recorded_at", "")
            if t1 and t2:
                from datetime import datetime

                dt = (
                    datetime.fromisoformat(t2.replace("Z", "+00:00"))
                    - datetime.fromisoformat(t1.replace("Z", "+00:00"))
                ).total_seconds()
                if dt <= time_window_sec:
                    group.append(events[i + 1])
                    i += 1
                else:
                    break
            else:
                break
        if len(group) >= 3:
            groups.append(group)
        i += 1
    return groups
