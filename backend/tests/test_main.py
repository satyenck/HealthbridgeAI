"""
Test main application endpoints
"""
import pytest
from fastapi.testclient import TestClient


def test_root_endpoint(client):
    """Test root endpoint returns welcome message"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "Welcome to HealthbridgeAI API" in data["message"]
    assert data["status"] == "active"


def test_health_check(client):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
