"""Pose / form-check API routes (on-device landmark analysis helpers in cloud for contracts)."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.pose.kinematics import (
    KinematicsResult,
    PoseFrame,
    analyze_pose,
    ego_lifting_recommendation,
)

router = APIRouter()


class PoseAnalyzeRequest(BaseModel):
    frame: PoseFrame
    exercise: str | None = None
    min_visibility: float = 0.5


class EgoLiftRequest(BaseModel):
    peak_velocity: float = Field(gt=0)
    velocity_now: float = Field(ge=0)
    form_deviation: float = Field(ge=0)


@router.post("/analyze")
async def analyze(body: PoseAnalyzeRequest) -> dict:
    """Heuristic joint/posture analysis from a MediaPipe-style landmark frame.

    Not a medical diagnosis. On-device MediaPipe remains partial until the RN SDK path exists.
    """
    result = analyze_pose(body.frame, exercise=body.exercise, min_visibility=body.min_visibility)
    payload = result.model_dump()
    payload["disclaimer"] = (
        "Informational coaching heuristic only — not a medical diagnosis or physical therapy advice."
    )
    payload["provenance"] = {
        "mode": "server_heuristic",
        "mediapipe": "partial_contract_only",
        "confidence_limited": True,
    }
    return payload


@router.post("/ego-lift")
async def ego_lift(body: EgoLiftRequest) -> dict:
    rec = ego_lifting_recommendation(
        peak_velocity=body.peak_velocity,
        velocity_now=body.velocity_now,
        form_deviation=body.form_deviation,
    )
    return {
        **rec,
        "disclaimer": (
            "Informational coaching heuristic only — not a medical diagnosis or physical therapy advice."
        ),
        "provenance": {"mode": "velocity_heuristic", "confidence_limited": True},
    }
