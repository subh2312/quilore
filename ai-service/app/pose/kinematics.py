"""Deterministic joint-angle and posture metrics from MediaPipe-style landmarks."""

from __future__ import annotations

import math
from typing import Any

from pydantic import BaseModel, Field

ALGORITHM_VERSION = "pose-kinematics-v1"

# MediaPipe Pose subset used for coaching heuristics.
LANDMARK_INDEX = {
    "left_shoulder": 11,
    "right_shoulder": 12,
    "left_elbow": 13,
    "right_elbow": 14,
    "left_wrist": 15,
    "right_wrist": 16,
    "left_hip": 23,
    "right_hip": 24,
    "left_knee": 25,
    "right_knee": 26,
    "left_ankle": 27,
    "right_ankle": 28,
}


class Landmark(BaseModel):
    x: float
    y: float
    z: float = 0.0
    visibility: float = 1.0


class PoseFrame(BaseModel):
    landmarks: list[Landmark] = Field(min_length=33)


class KinematicsResult(BaseModel):
    algorithm_version: str = ALGORITHM_VERSION
    angles_deg: dict[str, float]
    posture_deviations: dict[str, float]
    low_confidence: list[str]
    exercise: str | None = None


def _vec(a: Landmark, b: Landmark) -> tuple[float, float, float]:
    return (b.x - a.x, b.y - a.y, b.z - a.z)


def _dot(u: tuple[float, float, float], v: tuple[float, float, float]) -> float:
    return u[0] * v[0] + u[1] * v[1] + u[2] * v[2]


def _norm(u: tuple[float, float, float]) -> float:
    return math.sqrt(_dot(u, u))


def _angle(a: Landmark, b: Landmark, c: Landmark) -> float:
    ba = _vec(b, a)
    bc = _vec(b, c)
    denom = _norm(ba) * _norm(bc)
    if denom == 0:
        return 0.0
    cosine = max(-1.0, min(1.0, _dot(ba, bc) / denom))
    return math.degrees(math.acos(cosine))


def _cross_z(u: tuple[float, float, float], v: tuple[float, float, float]) -> float:
    return u[0] * v[1] - u[1] * v[0]


def analyze_pose(
    frame: PoseFrame,
    exercise: str | None = None,
    min_visibility: float = 0.5,
) -> KinematicsResult:
    low: list[str] = []
    angles: dict[str, float] = {}

    def get(name: str) -> Landmark | None:
        idx = LANDMARK_INDEX[name]
        lm = frame.landmarks[idx]
        if lm.visibility < min_visibility:
            low.append(name)
            return None
        return lm

    pairs = [
        ("left_elbow", "left_shoulder", "left_elbow", "left_wrist"),
        ("right_elbow", "right_shoulder", "right_elbow", "right_wrist"),
        ("left_knee", "left_hip", "left_knee", "left_ankle"),
        ("right_knee", "right_hip", "right_knee", "right_ankle"),
    ]
    for label, a, b, c in pairs:
        la, lb, lc = get(a), get(b), get(c)
        if la and lb and lc:
            angles[label] = round(_angle(la, lb, lc), 2)

    deviations: dict[str, float] = {}
    ls, rs, lh, rh = get("left_shoulder"), get("right_shoulder"), get("left_hip"), get("right_hip")
    if ls and rs and lh and rh:
        shoulder = _vec(ls, rs)
        hip = _vec(lh, rh)
        # Torso twist proxy via 2D cross against global up (0, -1) in image coords.
        up = (0.0, -1.0, 0.0)
        mid_shoulder = Landmark(x=(ls.x + rs.x) / 2, y=(ls.y + rs.y) / 2, z=(ls.z + rs.z) / 2)
        mid_hip = Landmark(x=(lh.x + rh.x) / 2, y=(lh.y + rh.y) / 2, z=(lh.z + rh.z) / 2)
        torso = _vec(mid_hip, mid_shoulder)
        deviations["spinal_round_proxy"] = round(abs(_cross_z(torso, up)), 4)
        deviations["shoulder_hip_yaw_proxy"] = round(abs(_cross_z(shoulder, hip)), 4)

    if exercise == "squat":
        # Prefer knee angles when present.
        for side in ("left_knee", "right_knee"):
            if side not in angles:
                low.append(f"missing_{side}")

    return KinematicsResult(
        angles_deg=angles,
        posture_deviations=deviations,
        low_confidence=sorted(set(low)),
        exercise=exercise,
    )


def ego_lifting_recommendation(
    peak_velocity: float,
    velocity_now: float,
    form_deviation: float,
    velocity_drop_threshold: float = 0.2,
    deviation_threshold: float = 0.15,
) -> dict[str, Any]:
    """Flag ego-lifting when concentric velocity drops sharply with form breakdown."""
    if peak_velocity <= 0:
        return {
            "flagged": False,
            "reason": "insufficient_velocity_signal",
            "load_recommendation": "hold",
            "algorithm_version": "ego-lift-v1",
        }
    drop = (peak_velocity - velocity_now) / peak_velocity
    flagged = drop >= velocity_drop_threshold and form_deviation >= deviation_threshold
    return {
        "flagged": flagged,
        "velocity_drop": round(drop, 3),
        "form_deviation": form_deviation,
        "load_recommendation": "decrease" if flagged else "hold",
        "message": (
            "Velocity loss with form breakdown — consider lowering load."
            if flagged
            else "No ego-lifting signal detected."
        ),
        "algorithm_version": "ego-lift-v1",
    }
