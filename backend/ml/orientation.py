"""
Auto-Orientation Engine
Translates device accelerometer axes to vehicle reference frame using Euler angles.
Source: Section 4.1 of RoadSurP paper (Alam et al., 2020)
"""
import math


def auto_orient(ax: float, ay: float, az: float) -> tuple[float, float, float]:
    """
    Translates device accelerometer axes to vehicle reference frame.
    Z-axis of output = vertical movement (road surface detection axis).

    Args:
        ax, ay, az: Raw accelerometer values (device frame)
    Returns:
        ax_v, ay_v, az_v: Reoriented values (vehicle frame)
    """
    theta = math.atan2(ay, az)  # pitch
    beta = math.atan2(-ax, math.sqrt(ay ** 2 + az ** 2))  # roll

    ax_v = (
        ax * math.cos(beta)
        + ay * math.sin(beta) * math.sin(theta)
        + az * math.cos(theta) * math.sin(beta)
    )
    ay_v = ay * math.cos(theta) - az * math.sin(theta)
    az_v = (
        -ax * math.sin(beta)
        + ay * math.cos(beta) * math.sin(theta)
        + az * math.cos(beta) * math.cos(theta)
    )

    return ax_v, ay_v, az_v


def low_pass_filter(signal: list[float], alpha: float = 0.8) -> list[float]:
    """Extract vertical component from Z-axis noise."""
    if not signal:
        return []
    filtered = [signal[0]]
    for i in range(1, len(signal)):
        filtered.append(alpha * filtered[-1] + (1 - alpha) * signal[i])
    return filtered
