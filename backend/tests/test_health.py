from fastapi.testclient import TestClient

from app.main import app


def test_root_returns_welcome_message():
  client = TestClient(app)
  response = client.get("/")
  assert response.status_code == 200
  assert response.json() == {"message": "Welcome to EventHorizon API"}
