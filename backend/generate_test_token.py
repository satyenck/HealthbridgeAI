#!/usr/bin/env python3
"""Generate a test auth token for testing"""
import sys
from datetime import timedelta
from app.auth import create_access_token

if __name__ == "__main__":
    doctor_id = "ddae6c75-d86d-45d3-8627-986a8c12ab6b"
    token_data = {
        "sub": doctor_id,
        "role": "DOCTOR"
    }
    token = create_access_token(token_data, expires_delta=timedelta(hours=24))
    print(token)
