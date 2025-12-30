"""
HealthbridgeAI - Voice Features Test Suite
Automated tests for voice-based functionality
"""
import requests
import json
import sys
from typing import Dict, Any
from datetime import timedelta

# Test configuration
API_URL = "http://localhost:8000"
TEST_ENCOUNTER_ID = "c28e8799-4b69-4e67-b275-6ee2c4a0996f"
TEST_DOCTOR_ID = "ddae6c75-d86d-45d3-8627-986a8c12ab6b"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.tests = []

    def add_pass(self, name: str, details: str = ""):
        self.passed += 1
        self.tests.append({"name": name, "status": "PASSED", "details": details})
        print(f"{Colors.GREEN}✅ PASSED{Colors.RESET}: {name}")
        if details:
            print(f"   {details}")

    def add_fail(self, name: str, details: str = ""):
        self.failed += 1
        self.tests.append({"name": name, "status": "FAILED", "details": details})
        print(f"{Colors.RED}❌ FAILED{Colors.RESET}: {name}")
        if details:
            print(f"   {details}")

    def add_warning(self, name: str, details: str = ""):
        self.warnings += 1
        self.tests.append({"name": name, "status": "WARNING", "details": details})
        print(f"{Colors.YELLOW}⚠️  WARNING{Colors.RESET}: {name}")
        if details:
            print(f"   {details}")

    def summary(self):
        total = self.passed + self.failed + self.warnings
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {total}")
        print(f"{Colors.GREEN}✅ Passed: {self.passed}{Colors.RESET}")
        print(f"{Colors.RED}❌ Failed: {self.failed}{Colors.RESET}")
        print(f"{Colors.YELLOW}⚠️  Warnings: {self.warnings}{Colors.RESET}")

        if self.failed == 0:
            print(f"\n{Colors.GREEN}🎉 ALL TESTS PASSED!{Colors.RESET}")
            return 0
        else:
            print(f"\n{Colors.RED}⚠️  SOME TESTS FAILED{Colors.RESET}")
            return 1

def generate_test_token() -> str:
    """Generate a test JWT token for the doctor"""
    # Import here to avoid circular dependencies
    import sys
    sys.path.insert(0, '/Users/satyenkansara/Projects/HealthbridgeAI/backend')

    from app.auth import create_access_token

    token_data = {
        "sub": TEST_DOCTOR_ID,
        "role": "DOCTOR"
    }
    return create_access_token(token_data, expires_delta=timedelta(hours=24))

def test_api_health(result: TestResult, headers: Dict[str, str]):
    """Test basic API health"""
    print("\n" + "=" * 80)
    print("Category: API Health")
    print("=" * 80)

    try:
        response = requests.get(f"{API_URL}/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            result.add_pass("API root endpoint", f"Version: {data.get('version')}")
        else:
            result.add_fail("API root endpoint", f"HTTP {response.status_code}")
    except Exception as e:
        result.add_fail("API root endpoint", str(e))

def test_voice_endpoints(result: TestResult, headers: Dict[str, str]):
    """Test voice feature endpoints"""
    print("\n" + "=" * 80)
    print("Category: Voice Feature Endpoints")
    print("=" * 80)

    # Test 1: Start Call
    try:
        response = requests.post(
            f"{API_URL}/api/encounters/{TEST_ENCOUNTER_ID}/start-call",
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            if "channel_name" in data and "token" in data:
                result.add_pass("POST /start-call", f"Channel: {data['channel_name']}")
            else:
                result.add_fail("POST /start-call", "Missing required fields")
        else:
            result.add_fail("POST /start-call", f"HTTP {response.status_code}")
    except Exception as e:
        result.add_fail("POST /start-call", str(e))

    # Test 2: Extract Report Fields (schema validation)
    try:
        test_payload = {"audio_base64": "dGVzdF9hdWRpb19kYXRh"}  # base64 "test_audio_data"
        response = requests.post(
            f"{API_URL}/api/encounters/{TEST_ENCOUNTER_ID}/extract-report-fields",
            headers=headers,
            json=test_payload,
            timeout=10
        )
        # We expect it to fail transcription but accept the request (schema validation passes)
        if response.status_code in [200, 500]:
            if response.status_code == 500:
                # Check if it's a transcription error (expected)
                error_msg = response.json().get("detail", "")
                if "transcription" in error_msg.lower() or "base64" in error_msg.lower():
                    result.add_pass("POST /extract-report-fields", "Schema validation passed")
                else:
                    result.add_warning("POST /extract-report-fields", "Unexpected error type")
            else:
                result.add_pass("POST /extract-report-fields", "Endpoint accepting requests")
        elif response.status_code == 422:
            result.add_fail("POST /extract-report-fields", "Schema validation failed")
        else:
            result.add_fail("POST /extract-report-fields", f"HTTP {response.status_code}")
    except Exception as e:
        result.add_fail("POST /extract-report-fields", str(e))

    # Test 3: Process Call Recording (schema validation)
    try:
        test_payload = {"audio_base64": "dGVzdF9hdWRpb19kYXRh"}
        response = requests.post(
            f"{API_URL}/api/encounters/{TEST_ENCOUNTER_ID}/process-call-recording",
            headers=headers,
            json=test_payload,
            timeout=10
        )
        if response.status_code in [200, 500]:
            if response.status_code == 500:
                error_msg = response.json().get("detail", "")
                if "transcription" in error_msg.lower() or "base64" in error_msg.lower():
                    result.add_pass("POST /process-call-recording", "Schema validation passed")
                else:
                    result.add_warning("POST /process-call-recording", "Unexpected error type")
            else:
                result.add_pass("POST /process-call-recording", "Endpoint accepting requests")
        elif response.status_code == 422:
            result.add_fail("POST /process-call-recording", "Schema validation failed")
        else:
            result.add_fail("POST /process-call-recording", f"HTTP {response.status_code}")
    except Exception as e:
        result.add_fail("POST /process-call-recording", str(e))

def test_existing_endpoints(result: TestResult, headers: Dict[str, str]):
    """Test existing endpoints to ensure no regression"""
    print("\n" + "=" * 80)
    print("Category: Existing Endpoints (Regression)")
    print("=" * 80)

    endpoints = [
        ("GET /api/doctor/profile/", "Doctor profile"),
        ("GET /api/doctor/stats", "Doctor stats"),
        ("GET /api/doctor/reports/pending", "Pending reports"),
        ("GET /api/encounters/", "Encounters list"),
        (f"GET /api/encounters/{TEST_ENCOUNTER_ID}", "Encounter detail"),
        (f"GET /api/encounters/{TEST_ENCOUNTER_ID}/summary", "Summary report"),
        ("GET /api/encounters/available-doctors", "Available doctors"),
        ("GET /api/encounters/labs", "Available labs"),
        ("GET /api/encounters/pharmacies", "Available pharmacies"),
    ]

    for endpoint, name in endpoints:
        method, path = endpoint.split(" ", 1)
        try:
            if method == "GET":
                response = requests.get(f"{API_URL}{path}", headers=headers, timeout=5)
            else:
                response = requests.request(method, f"{API_URL}{path}", headers=headers, timeout=5)

            if response.status_code == 200:
                result.add_pass(name, "")
            else:
                result.add_fail(name, f"HTTP {response.status_code}")
        except Exception as e:
            result.add_fail(name, str(e))

def test_schema_compatibility(result: TestResult):
    """Test that schema changes are backward compatible"""
    print("\n" + "=" * 80)
    print("Category: Schema Compatibility")
    print("=" * 80)

    import sys
    sys.path.insert(0, '/Users/satyenkansara/Projects/HealthbridgeAI/backend')

    try:
        from app.schemas_v2 import VoiceTranscriptionRequest

        # Check if schema has audio_base64 field
        if hasattr(VoiceTranscriptionRequest, '__fields__'):
            fields = VoiceTranscriptionRequest.__fields__
            if 'audio_base64' in fields:
                result.add_pass("VoiceTranscriptionRequest schema", "Has audio_base64 field")
            else:
                result.add_fail("VoiceTranscriptionRequest schema", "Missing audio_base64 field")
        else:
            result.add_warning("VoiceTranscriptionRequest schema", "Cannot inspect fields")
    except Exception as e:
        result.add_fail("Schema import", str(e))

def test_service_implementations(result: TestResult):
    """Test that backend services are properly implemented"""
    print("\n" + "=" * 80)
    print("Category: Service Implementations")
    print("=" * 80)

    import sys
    sys.path.insert(0, '/Users/satyenkansara/Projects/HealthbridgeAI/backend')

    # Test Agora Service
    try:
        from app.services.agora_service import agora_service

        token_data = agora_service.generate_call_token("test_channel", "test_user")
        if "channel_name" in token_data and "token" in token_data:
            result.add_pass("Agora service", "Token generation working")
        else:
            result.add_fail("Agora service", "Missing required fields")
    except Exception as e:
        result.add_fail("Agora service", str(e))

    # Test OpenAI Service methods exist
    try:
        from app.services.openai_service import openai_service

        if hasattr(openai_service, 'extract_report_fields_from_voice'):
            result.add_pass("OpenAI service - extract_report_fields_from_voice", "Method exists")
        else:
            result.add_fail("OpenAI service - extract_report_fields_from_voice", "Method not found")

        if hasattr(openai_service, 'extract_medical_info_from_conversation'):
            result.add_pass("OpenAI service - extract_medical_info_from_conversation", "Method exists")
        else:
            result.add_fail("OpenAI service - extract_medical_info_from_conversation", "Method not found")
    except Exception as e:
        result.add_fail("OpenAI service import", str(e))

def main():
    """Main test runner"""
    print(f"\n{Colors.BLUE}{'=' * 80}")
    print("HealthbridgeAI - Voice Features Automated Test Suite")
    print(f"{'=' * 80}{Colors.RESET}\n")

    result = TestResult()

    # Generate auth token
    print("Generating authentication token...")
    try:
        token = generate_test_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        print(f"{Colors.GREEN}✓ Token generated{Colors.RESET}\n")
    except Exception as e:
        print(f"{Colors.RED}✗ Failed to generate token: {e}{Colors.RESET}")
        return 1

    # Run test categories
    test_api_health(result, headers)
    test_voice_endpoints(result, headers)
    test_existing_endpoints(result, headers)
    test_schema_compatibility(result)
    test_service_implementations(result)

    # Print summary
    return result.summary()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
