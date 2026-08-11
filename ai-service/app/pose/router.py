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


@router.post("/analyze", response_model=KinematicsResult)
async def analyze(body: PoseAnalyzeRequest) -> KinematicsResult:
    """Calculate joint angles / posture deviations from a MediaPipe-style landmark frame."""
    return analyze_pose(body.frame, exercise=body.exercise, min_visibility=body.min_visibility)


@router.post("/ego-lift")
async def ego_lift(body: EgoLiftRequest) -> dict:
    return ego_lifting_recommendation(
        peak_velocity=body.peak_velocity,
        velocity_now=body.velocity_now,
        form_deviation=body.form_deviation,
    )
