"""Tests for pose kinematics, exercise mapping, and hybrid search."""

from app.exercises.mapping import map_exercise
from app.pose.kinematics import Landmark, PoseFrame, analyze_pose, ego_lifting_recommendation
from app.pose.mediapipe_contract import MEDIAPIPE_LANDMARK_COUNT, validate_mediapipe_frame
from app.rag.hybrid_search import Chunk, hybrid_search


def _frame_with_right_angle() -> PoseFrame:
    landmarks = [Landmark(x=0, y=0, z=0, visibility=1) for _ in range(33)]
    # left elbow angle 90deg around landmark 13
    landmarks[11] = Landmark(x=0, y=0, z=0, visibility=1)  # shoulder
    landmarks[13] = Landmark(x=1, y=0, z=0, visibility=1)  # elbow
    landmarks[15] = Landmark(x=1, y=1, z=0, visibility=1)  # wrist
    landmarks[23] = Landmark(x=0, y=1, z=0, visibility=1)
    landmarks[24] = Landmark(x=1, y=1, z=0, visibility=1)
    landmarks[12] = Landmark(x=2, y=0, z=0, visibility=1)
    return PoseFrame(landmarks=landmarks)


def test_joint_angles_are_deterministic():
    frame = _frame_with_right_angle()
    a = analyze_pose(frame)
    b = analyze_pose(frame)
    assert a.angles_deg == b.angles_deg
    assert a.algorithm_version == "pose-kinematics-v1"
    assert abs(a.angles_deg["left_elbow"] - 90.0) < 0.2


def test_low_confidence_landmarks_are_flagged():
    landmarks = [Landmark(x=0, y=0, z=0, visibility=0.1) for _ in range(33)]
    result = analyze_pose(PoseFrame(landmarks=landmarks), min_visibility=0.5)
    assert result.low_confidence
    assert result.angles_deg == {}


def test_ego_lifting_flags_velocity_drop_with_form_breakdown():
    flagged = ego_lifting_recommendation(1.0, 0.7, 0.2)
    assert flagged["flagged"] is True
    assert flagged["load_recommendation"] == "decrease"
    ok = ego_lifting_recommendation(1.0, 0.95, 0.01)
    assert ok["flagged"] is False


def test_mediapipe_contract_expects_33_landmarks():
    frame = PoseFrame(landmarks=[Landmark(x=0, y=0, z=0) for _ in range(MEDIAPIPE_LANDMARK_COUNT)])
    assert validate_mediapipe_frame(frame)["valid"] is True


def test_exercise_mapping_matches_aliases():
    hits = map_exercise("barbell squat")
    assert hits
    assert hits[0]["id"] == "ex_back_squat"


def test_hybrid_search_filters_and_ranks():
    chunks = [
        Chunk("1", "dalma protein bowl", {"doc_type": "nutrition"}, [1.0, 0.0, 0.0]),
        Chunk("2", "back squat cues", {"doc_type": "exercise"}, [0.0, 1.0, 0.0]),
        Chunk("3", "dalma recipe macros", {"doc_type": "nutrition"}, [0.9, 0.1, 0.0]),
    ]
    hits = hybrid_search(
        chunks,
        [1.0, 0.0, 0.0],
        keyword="dalma",
        metadata_filter={"doc_type": "nutrition"},
        limit=5,
    )
    assert len(hits) == 2
    assert hits[0]["id"] == "1"
    assert hits[0]["score"] >= hits[1]["score"]
