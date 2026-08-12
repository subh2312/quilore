"""API smoke tests for pose and exercise mapping endpoints."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_pose_analyze_endpoint():
    landmarks = [{"x": 0, "y": 0, "z": 0, "visibility": 1} for _ in range(33)]
    landmarks[11] = {"x": 0, "y": 0, "z": 0, "visibility": 1}
    landmarks[13] = {"x": 1, "y": 0, "z": 0, "visibility": 1}
    landmarks[15] = {"x": 1, "y": 1, "z": 0, "visibility": 1}
    payload = {"frame": {"landmarks": landmarks}, "exercise": "squat"}
    response = client.post("/ai/pose/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "angles_deg" in data
    assert data["algorithm_version"] == "pose-kinematics-v1"


def test_exercise_map_endpoint():
    response = client.post("/ai/exercises/map", json={"query": "deadlift"})
    assert response.status_code == 200
    assert response.json()["candidates"][0]["id"] == "ex_deadlift"
