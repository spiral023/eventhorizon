from fastapi.testclient import TestClient

from app.main import app


def test_root_returns_welcome_message():
  client = TestClient(app)
  response = client.get("/")
  assert response.status_code == 200
  assert response.json() == {"message": "Welcome to EventHorizon API"}


def test_health_check_returns_ok():
  client = TestClient(app)
  response = client.get("/api/v1/health")
  assert response.status_code == 200
  assert response.json() == {"status": "ok"}


def test_openapi_and_docs_are_available():
  client = TestClient(app)
  openapi = client.get("/api/v1/openapi.json")
  assert openapi.status_code == 200
  assert "openapi" in openapi.json()

  docs = client.get("/docs")
  assert docs.status_code == 200
