"""
Dynamic Threshold Engine
Speed-adaptive thresholds for road event detection.
Source: Section 4.2 of RoadSurP paper (Alam et al., 2020)
"""

# Initial thresholds (in g-force) — derived from empirical experiments
# Source: Table 2 of the paper
INITIAL_THRESHOLDS = {
    "speed_breaker": {
        "two_wheeler": {"mounter": 1.8, "pocket": 1.57},
        "three_wheeler": {"mounter": 1.47, "pocket": None},
        "four_wheeler": {"mounter": 1.08, "pocket": None},
    },
    "pothole": {
        "two_wheeler": {"mounter": 0.714, "pocket": 0.612},
        "three_wheeler": {"mounter": 0.612, "pocket": None},
        "four_wheeler": {"mounter": 0.41, "pocket": None},
    },
}

# Tuning constants
THRESHOLD_CONFIG = {
    "B": 20.0,  # Base point: min speed for dynamic mode (km/h)
    "L": 20.0,  # Lower adaptation limit (km/h)
    "S": 0.3,   # Scaling factor: threshold increase per km/h above L
}


def get_base_threshold(
    event_type: str, vehicle_type: str, placement: str
) -> float | None:
    """Get base threshold T0 for given event type, vehicle, and placement."""
    return INITIAL_THRESHOLDS.get(event_type, {}).get(vehicle_type, {}).get(placement)


def compute_threshold(
    T0: float,
    speed_history: list[float],
    event_type: str = "speed_breaker",
    cfg: dict = THRESHOLD_CONFIG,
) -> float:
    """
    Computes dynamic threshold Tt based on vehicle speed history.

    For speed-breakers: threshold INCREASES with speed (positive S)
    For potholes: threshold DECREASES with speed (negative S)
    """
    if not speed_history:
        return T0

    avg_speed = sum(speed_history) / len(speed_history)

    if avg_speed > cfg["B"]:
        S = cfg["S"] if event_type == "speed_breaker" else -cfg["S"]
        return T0 + (avg_speed - cfg["L"]) * S

    return T0
