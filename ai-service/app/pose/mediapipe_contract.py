"""MediaPipe Pose integration notes + landmark schema contract.

On-device MediaPipe Pose extracts 33 3D landmarks per frame (docs/Quilore.md §2.8).
This module documents the expected landmark payload and validates frame shape so
cloud-side kinematics stay compatible with on-device extraction.
"""

from app.pose.kinematics import LANDMARK_INDEX, Landmark, PoseFrame

MEDIAPIPE_LANDMARK_COUNT = 33


def empty_frame() -> PoseFrame:
    landmarks = [Landmark(x=0, y=0, z=0, visibility=0) for _ in range(MEDIAPIPE_LANDMARK_COUNT)]
    return PoseFrame(landmarks=landmarks)


def validate_mediapipe_frame(frame: PoseFrame) -> dict:
    ok = len(frame.landmarks) == MEDIAPIPE_LANDMARK_COUNT
    return {
        "valid": ok,
        "landmarkCount": len(frame.landmarks),
        "expected": MEDIAPIPE_LANDMARK_COUNT,
        "trackedJoints": sorted(LANDMARK_INDEX.keys()),
        "integration": "on-device MediaPipe Pose → landmark JSON → /ai/pose/analyze",
    }
