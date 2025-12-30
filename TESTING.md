# HealthbridgeAI - Automated Testing Guide

## Overview

This document describes the automated test suite for HealthbridgeAI, including voice features testing, regression testing, and continuous integration.

## Test Suite Structure

```
HealthbridgeAI/
├── run_all_tests.sh              # Master test runner (runs all tests)
├── backend/
│   └── tests/
│       ├── test_voice_features.py    # Voice API tests (Python)
│       └── test_database.sh          # Database integrity tests
└── frontend/
    └── tests/
        └── verify_integration.sh     # Frontend integration tests
```

## Quick Start

### Run All Tests

```bash
cd /Users/satyenkansara/Projects/HealthbridgeAI
chmod +x run_all_tests.sh
./run_all_tests.sh
```

This will run all test suites and provide a comprehensive report.

### Run Individual Test Suites

#### 1. Voice Features API Tests (Python)
```bash
cd backend
PYTHONPATH=. python3 tests/test_voice_features.py
```

**Tests:**
- API health checks
- Voice endpoint functionality
- Schema validation
- Service implementations
- Regression tests for existing endpoints

#### 2. Database Integrity Tests
```bash
cd backend
chmod +x tests/test_database.sh
./tests/test_database.sh
```

**Tests:**
- Table existence
- Data integrity
- Schema structure
- Foreign key constraints
- Referential integrity

#### 3. Frontend Integration Tests
```bash
cd frontend
chmod +x tests/verify_integration.sh
./tests/verify_integration.sh
```

**Tests:**
- Component existence
- Navigation configuration
- API configuration
- Service layer integration
- Package dependencies

## Prerequisites

### Backend Server
The backend server must be running for API tests:
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### Database
PostgreSQL must be running with the `healthbridge_db` database:
```bash
psql -U satyenkansara -d healthbridge_db -c "SELECT 1"
```

### Metro Bundler (Optional)
For frontend tests, Metro can be running (but not required):
```bash
cd frontend
npm start
```

## Test Categories

### 1. Voice Features Tests

| Test | Description | Expected Result |
|------|-------------|-----------------|
| POST /start-call | Initialize voice call | Returns Agora credentials |
| POST /extract-report-fields | Extract fields from voice | Accepts audio_base64 |
| POST /process-call-recording | Process consultation | Accepts audio_base64 |
| Schema validation | VoiceTranscriptionRequest | Has audio_base64 field |
| Agora service | Token generation | Returns valid token |
| OpenAI service | Method existence | Methods implemented |

### 2. Regression Tests

| Test | Description | Expected Result |
|------|-------------|-----------------|
| Doctor profile | GET /api/doctor/profile/ | 200 OK |
| Doctor stats | GET /api/doctor/stats | 200 OK |
| Pending reports | GET /api/doctor/reports/pending | 200 OK |
| Encounters list | GET /api/encounters/ | 200 OK |
| Summary report | GET /api/encounters/{id}/summary | 200 OK |
| Available doctors | GET /api/encounters/available-doctors | 200 OK |
| Labs list | GET /api/encounters/labs | 200 OK |
| Pharmacies list | GET /api/encounters/pharmacies | 200 OK |

### 3. Database Integrity Tests

| Test | Description | Expected Result |
|------|-------------|-----------------|
| Core tables | Existence of all tables | All present |
| Data count | Record counts | > 0 for key tables |
| Schema structure | Column definitions | Correct types |
| Foreign keys | Constraint existence | Properly defined |
| Referential integrity | No orphaned records | Clean references |

### 4. Frontend Integration Tests

| Test | Description | Expected Result |
|------|-------------|-----------------|
| New components | File existence | All files present |
| Navigation | Screen registration | Properly configured |
| API config | Endpoint definitions | All endpoints defined |
| Service layer | Method implementations | All methods present |
| Imports | Component imports | No missing imports |

## Test Output

### Success Output
```
================================================================================
                         FINAL TEST SUMMARY
================================================================================

Total Test Suites: 3
✅ Passed: 3
❌ Failed: 0

═══════════════════════════════════════════════════════════════════════════════
                       🎉 ALL TEST SUITES PASSED! 🎉
═══════════════════════════════════════════════════════════════════════════════

System Status: ✅ HEALTHY
Voice Features: ✅ WORKING
Integration: ✅ COMPLETE
```

### Failure Output
```
================================================================================
                         FINAL TEST SUMMARY
================================================================================

Total Test Suites: 3
✅ Passed: 2
❌ Failed: 1

═══════════════════════════════════════════════════════════════════════════════
                        ⚠️  SOME TESTS FAILED ⚠️
═══════════════════════════════════════════════════════════════════════════════

Please review the failed test suites above and fix the issues.
```

## Continuous Integration

### Pre-commit Hook (Optional)

Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
cd /Users/satyenkansara/Projects/HealthbridgeAI
./run_all_tests.sh
```

### Automated Testing Schedule

Run tests automatically using cron:
```bash
# Add to crontab (crontab -e)
0 */6 * * * cd /Users/satyenkansara/Projects/HealthbridgeAI && ./run_all_tests.sh >> test_results.log 2>&1
```

## Troubleshooting

### Backend Server Not Running
```
ERROR: Cannot connect to http://localhost:8000

Solution:
cd backend
uvicorn app.main:app --reload --port 8000
```

### Database Connection Failed
```
ERROR: Cannot connect to database

Solution:
# Check PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if needed
brew services start postgresql
```

### Import Errors in Python Tests
```
ERROR: ModuleNotFoundError: No module named 'app'

Solution:
cd backend
PYTHONPATH=. python3 tests/test_voice_features.py
```

### Metro Bundler Warnings
```
WARNING: Metro bundler not running

Solution: This is optional for most tests. Start if needed:
cd frontend
npm start
```

## Test Development

### Adding New Tests

#### Backend API Tests
Add to `backend/tests/test_voice_features.py`:
```python
def test_new_feature(result: TestResult, headers: Dict[str, str]):
    """Test new feature"""
    print("\nCategory: New Feature")
    print("-" * 80)

    try:
        response = requests.get(f"{API_URL}/new-endpoint", headers=headers)
        if response.status_code == 200:
            result.add_pass("New feature test")
        else:
            result.add_fail("New feature test", f"HTTP {response.status_code}")
    except Exception as e:
        result.add_fail("New feature test", str(e))
```

#### Database Tests
Add to `backend/tests/test_database.sh`:
```bash
test_table_exists "new_table" "New table description"
```

#### Frontend Tests
Add to `frontend/tests/verify_integration.sh`:
```bash
check_file_exists "$FRONTEND_DIR/path/to/NewComponent.tsx" "NewComponent"
```

## Performance Benchmarks

| Test Suite | Expected Duration | Acceptable Range |
|------------|-------------------|------------------|
| Voice Features | 5-10 seconds | < 15 seconds |
| Database Integrity | 3-5 seconds | < 10 seconds |
| Frontend Integration | 2-4 seconds | < 8 seconds |
| **Total** | **10-20 seconds** | **< 35 seconds** |

## Test Coverage

| Area | Coverage | Tests |
|------|----------|-------|
| Voice Endpoints | 100% | 3/3 |
| Existing Endpoints | 90% | 9/10 |
| Database Tables | 100% | 10/10 |
| Frontend Components | 100% | 7/7 |
| Service Layer | 100% | 3/3 |
| Navigation | 100% | 4/4 |
| **Overall** | **~95%** | **36/37** |

## Best Practices

1. **Run tests before committing** - Catch issues early
2. **Run full suite weekly** - Ensure system health
3. **Monitor test output** - Look for warnings
4. **Update tests when adding features** - Maintain coverage
5. **Document test failures** - Help debug issues
6. **Keep tests fast** - Aim for < 30 seconds total

## Support

For questions or issues with the test suite:
1. Check this documentation
2. Review test output for specific errors
3. Verify prerequisites are met
4. Check logs in test_results.log

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-25 | Initial test suite creation |
| | | - Voice features tests |
| | | - Regression tests |
| | | - Database integrity tests |
| | | - Frontend integration tests |
| | | - Master test runner |

---

**Last Updated:** December 25, 2025
**Test Suite Version:** 1.0.0
**System Version:** 2.0.0 (with voice features)
