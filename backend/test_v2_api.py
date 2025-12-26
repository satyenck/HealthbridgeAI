"""
HealthbridgeAI v2 API Test Script
Tests key endpoints with seeded database data
"""
import requests
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models_v2 import User, PatientProfile, DoctorProfile, UserRole

# Base URL
BASE_URL = "http://localhost:8000"


def test_database_connection():
    """Test database connection and seeded data"""
    print("\n=== Testing Database Connection ===")
    db = SessionLocal()
    try:
        # Count users by role
        patient_count = db.query(User).filter(User.role == UserRole.PATIENT).count()
        doctor_count = db.query(User).filter(User.role == UserRole.DOCTOR).count()
        lab_count = db.query(User).filter(User.role == UserRole.LAB).count()
        pharmacy_count = db.query(User).filter(User.role == UserRole.PHARMACY).count()
        admin_count = db.query(User).filter(User.role == UserRole.ADMIN).count()

        print(f"✓ Database connected successfully")
        print(f"  - Patients: {patient_count}")
        print(f"  - Doctors: {doctor_count}")
        print(f"  - Labs: {lab_count}")
        print(f"  - Pharmacies: {pharmacy_count}")
        print(f"  - Admins: {admin_count}")
        print(f"  - Total Users: {patient_count + doctor_count + lab_count + pharmacy_count + admin_count}")

        # Get sample patient
        sample_patient = db.query(PatientProfile).first()
        if sample_patient:
            print(f"✓ Sample patient: {sample_patient.first_name} {sample_patient.last_name}")

        # Get sample doctor
        sample_doctor = db.query(DoctorProfile).first()
        if sample_doctor:
            print(f"✓ Sample doctor: Dr. {sample_doctor.first_name} {sample_doctor.last_name} ({sample_doctor.specialty})")

        return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False
    finally:
        db.close()


def test_root_endpoint():
    """Test root endpoint"""
    print("\n=== Testing Root Endpoint ===")
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Root endpoint accessible")
            print(f"  - Message: {data.get('message')}")
            print(f"  - Version: {data.get('version')}")
            print(f"  - Status: {data.get('status')}")
            return True
        else:
            print(f"✗ Root endpoint returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Root endpoint test failed: {e}")
        return False


def test_health_endpoint():
    """Test health check endpoint"""
    print("\n=== Testing Health Endpoint ===")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Health endpoint accessible")
            print(f"  - Status: {data.get('status')}")
            return True
        else:
            print(f"✗ Health endpoint returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Health endpoint test failed: {e}")
        return False


def test_docs_endpoint():
    """Test API documentation endpoint"""
    print("\n=== Testing API Docs ===")
    try:
        response = requests.get(f"{BASE_URL}/docs")
        if response.status_code == 200:
            print(f"✓ API docs accessible at {BASE_URL}/docs")
            return True
        else:
            print(f"✗ API docs returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ API docs test failed: {e}")
        return False


def test_openapi_schema():
    """Test OpenAPI schema endpoint"""
    print("\n=== Testing OpenAPI Schema ===")
    try:
        response = requests.get(f"{BASE_URL}/openapi.json")
        if response.status_code == 200:
            schema = response.json()
            print(f"✓ OpenAPI schema accessible")
            print(f"  - Title: {schema.get('info', {}).get('title')}")
            print(f"  - Version: {schema.get('info', {}).get('version')}")
            print(f"  - Endpoints: {len(schema.get('paths', {}))}")

            # List main endpoint groups
            paths = schema.get('paths', {})
            groups = {}
            for path in paths:
                if path.startswith('/api/'):
                    group = path.split('/')[2] if len(path.split('/')) > 2 else 'root'
                    groups[group] = groups.get(group, 0) + 1

            print(f"  - Endpoint groups:")
            for group, count in sorted(groups.items()):
                print(f"    - {group}: {count} endpoints")

            return True
        else:
            print(f"✗ OpenAPI schema returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ OpenAPI schema test failed: {e}")
        return False


def print_summary(results):
    """Print test summary"""
    print("\n" + "="*50)
    print("TEST SUMMARY")
    print("="*50)

    passed = sum(results.values())
    total = len(results)

    for test_name, passed_test in results.items():
        status = "✓ PASS" if passed_test else "✗ FAIL"
        print(f"{status} - {test_name}")

    print("="*50)
    print(f"Results: {passed}/{total} tests passed")
    print("="*50)

    if passed == total:
        print("\n🎉 All tests passed! HealthbridgeAI v2 is ready!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review the output above.")


def main():
    """Run all tests"""
    print("="*50)
    print("HealthbridgeAI v2 API Test Suite")
    print("="*50)

    print("\nNote: Make sure the FastAPI server is running on http://localhost:8000")
    print("Start server with: uvicorn app.main:app --reload")

    results = {}

    # Test database
    results["Database Connection"] = test_database_connection()

    # Test endpoints (only if server is running)
    results["Root Endpoint"] = test_root_endpoint()
    results["Health Endpoint"] = test_health_endpoint()
    results["API Documentation"] = test_docs_endpoint()
    results["OpenAPI Schema"] = test_openapi_schema()

    # Print summary
    print_summary(results)


if __name__ == "__main__":
    main()
