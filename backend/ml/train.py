"""
Training script for the J48 Decision Tree classifier.
Generates synthetic training data based on research paper constants,
then trains and saves the model.

Usage:
    python ml/train.py              # Train with synthetic data
    python ml/train.py --data ml/data/training_data.csv  # Train with real data
"""
import argparse
import numpy as np
from pathlib import Path
from classifier import train_and_save

# Feature vector: [z_value, z_next, z_prev, tp, speed_kmh]
# Labels: 0=anomaly, 1=speed_breaker, 2=pothole, 3=broken_patch

# Synthetic data generation based on paper Table 2 constants
# Speed breaker: positive z, high amplitude
# Pothole: negative z, high amplitude
# Broken patch: rapid succession of events
# Anomaly: low amplitude, irregular


def generate_synthetic_data(n_samples: int = 1000) -> tuple[np.ndarray, np.ndarray]:
    """Generate synthetic training data based on research paper constants."""
    np.random.seed(42)

    X = []
    y = []

    # Speed breaker samples (label=1)
    for _ in range(n_samples // 4):
        z = np.random.uniform(1.1, 3.5)  # Positive, above threshold
        z_next = z * np.random.uniform(0.3, 0.8)
        z_prev = z * np.random.uniform(0.2, 0.6)
        tp = np.random.uniform(5.0, 30.0)  # Time since prior event
        speed = np.random.uniform(15.0, 60.0)
        X.append([z, z_next, z_prev, tp, speed])
        y.append(1)

    # Pothole samples (label=2)
    for _ in range(n_samples // 4):
        z = np.random.uniform(-3.5, -0.8)  # Negative, below threshold
        z_next = z * np.random.uniform(0.3, 0.7)
        z_prev = z * np.random.uniform(0.2, 0.5)
        tp = np.random.uniform(5.0, 30.0)
        speed = np.random.uniform(10.0, 50.0)
        X.append([z, z_next, z_prev, tp, speed])
        y.append(2)

    # Broken patch samples (label=3) — rapid succession
    for _ in range(n_samples // 4):
        z = np.random.uniform(-2.0, 2.0)
        z_next = z * np.random.uniform(0.5, 1.2)
        z_prev = z * np.random.uniform(0.4, 1.0)
        tp = np.random.uniform(0.1, 2.0)  # Very short time between events
        speed = np.random.uniform(10.0, 40.0)
        X.append([z, z_next, z_prev, tp, speed])
        y.append(3)

    # Anomaly samples (label=0) — low amplitude noise
    for _ in range(n_samples // 4):
        z = np.random.uniform(-0.5, 0.5)  # Low amplitude
        z_next = z * np.random.uniform(0.1, 0.4)
        z_prev = z * np.random.uniform(0.1, 0.4)
        tp = np.random.uniform(1.0, 15.0)
        speed = np.random.uniform(5.0, 30.0)
        X.append([z, z_next, z_prev, tp, speed])
        y.append(0)

    return np.array(X), np.array(y)


def load_csv_data(path: str) -> tuple[np.ndarray, np.ndarray]:
    """Load training data from CSV file."""
    data = np.loadtxt(path, delimiter=",", skiprows=1)
    X = data[:, :-1]
    y = data[:, -1].astype(int)
    return X, y


def main():
    parser = argparse.ArgumentParser(description="Train RoadSense ML classifier")
    parser.add_argument("--data", type=str, help="Path to training CSV file")
    parser.add_argument("--samples", type=int, default=1000, help="Number of synthetic samples")
    args = parser.parse_args()

    if args.data:
        print(f"Loading training data from {args.data}...")
        X, y = load_csv_data(args.data)
    else:
        print(f"Generating {args.samples} synthetic training samples...")
        X, y = generate_synthetic_data(args.samples)

    print(f"Training with {len(X)} samples, {X.shape[1]} features")
    print(f"Class distribution: {dict(zip(*np.unique(y, return_counts=True)))}")

    metrics = train_and_save(X, y)

    print(f"\nModel trained and saved to ml/models/decision_tree_v1.pkl")
    print(f"10-fold CV F1: {metrics['cv_f1_mean']:.4f} (+/- {metrics['cv_f1_std']:.4f})")


if __name__ == "__main__":
    main()
