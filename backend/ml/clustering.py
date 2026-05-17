"""
k-Medoids Clustering for Geo-Localization
Confirms road events by clustering detections from multiple trails.
Source: Section 4.4 of RoadSurP paper (Alam et al., 2020)
"""
import math
import numpy as np
from sklearn.metrics import silhouette_score


def kmedoids(coords: np.ndarray, k: int, max_iter: int = 100, seed: int = 42) -> np.ndarray:
    """Simple k-Medoids (PAM) implementation using Euclidean distance."""
    rng = np.random.RandomState(seed)
    n = len(coords)
    if k >= n:
        return np.arange(n)

    # Initialize medoids as random points
    medoid_idx = rng.choice(n, k, replace=False)

    for _ in range(max_iter):
        # Assign each point to nearest medoid
        dists = np.linalg.norm(coords[:, None] - coords[medoid_idx][None, :], axis=2)
        labels = np.argmin(dists, axis=1)

        # Update medoids
        new_medoid_idx = np.empty(k, dtype=int)
        for j in range(k):
            members = coords[labels == j]
            if len(members) == 0:
                new_medoid_idx[j] = medoid_idx[j]
                continue
            # Pick point that minimizes total distance to cluster members
            member_dists = np.linalg.norm(members[:, None] - members[None, :], axis=2)
            new_medoid_idx[j] = np.where(labels == j)[0][np.argmin(member_dists.sum(axis=1))]

        if np.array_equal(new_medoid_idx, medoid_idx):
            break
        medoid_idx = new_medoid_idx

    return labels


def find_optimal_k(coords: np.ndarray, k_max: int = 10) -> int:
    """Silhouette analysis to find optimal number of clusters."""
    if len(coords) < 4:
        return max(1, len(coords) - 1)

    best_k, best_score = 2, -1
    for k in range(2, min(k_max + 1, len(coords))):
        labels = kmedoids(coords, k)
        if len(set(labels)) < 2:
            continue
        score = silhouette_score(coords, labels)
        if score > best_score:
            best_score, best_k = score, k
    return best_k


def cluster_and_confirm(
    raw_events: list[dict], total_trails: int
) -> list[dict]:
    """
    Cluster geo-tagged road events from multiple trails.
    A confirmed event requires detection by >= ceil(NT/3) + 1 trails.
    Source: Section 5.2.2 of the paper

    Args:
        raw_events: list of {lat, lng, event_type, trip_id, recorded_at, ...}
        total_trails: NT — total number of trails in the crowdsourced data

    Returns:
        list of confirmed events with cluster center as location
    """
    if len(raw_events) < 2:
        return []

    min_members = math.ceil(total_trails / 3) + 1
    coords = np.array([[e["lat"], e["lng"]] for e in raw_events])

    optimal_k = find_optimal_k(coords)
    labels = kmedoids(coords, optimal_k)

    confirmed = []
    for cluster_id in range(optimal_k):
        members = [raw_events[i] for i, l in enumerate(labels) if l == cluster_id]

        if len(members) < min_members:
            continue  # Not enough trail agreement → discard

        center = coords[labels == cluster_id].mean(axis=0)
        event_types = [m["event_type"] for m in members]
        dominant_type = max(set(event_types), key=event_types.count)

        confirmed.append(
            {
                "lat": float(center[0]),
                "lng": float(center[1]),
                "event_type": dominant_type,
                "trail_count": len(members),
                "confidence_score": round(len(members) / total_trails, 3),
                "first_seen": min(m.get("recorded_at", "") for m in members),
                "last_seen": max(m.get("recorded_at", "") for m in members),
            }
        )

    return confirmed
