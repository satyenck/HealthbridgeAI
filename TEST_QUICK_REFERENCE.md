# HealthbridgeAI - Testing Quick Reference

## 🚀 Quick Commands

### Run ALL Tests (Recommended)
```bash
cd /Users/satyenkansara/Projects/HealthbridgeAI
./run_all_tests.sh
```

### Run Individual Test Suites

#### Backend API Tests
```bash
cd backend
PYTHONPATH=. python3 tests/test_voice_features.py
```

#### Database Tests
```bash
cd backend
./tests/test_database.sh
```

#### Frontend Tests
```bash
cd frontend
./tests/verify_integration.sh
```

---

## 📊 Test Files Location

```
/Users/satyenkansara/Projects/HealthbridgeAI/
├── run_all_tests.sh                      ← Master runner
├── TESTING.md                            ← Full documentation
├── TEST_QUICK_REFERENCE.md              ← This file
├── backend/tests/
│   ├── test_voice_features.py           ← API tests (Python)
│   └── test_database.sh                 ← DB tests (Bash)
└── frontend/tests/
    └── verify_integration.sh            ← Integration tests (Bash)
```

---

## ✅ Expected Results

### All Tests Passing
```
═══════════════════════════════════════════════════════════════
                  🎉 ALL TEST SUITES PASSED! 🎉
═══════════════════════════════════════════════════════════════

System Status: ✅ HEALTHY
Voice Features: ✅ WORKING
Integration: ✅ COMPLETE
```

---

## ⚠️ Prerequisites

| Requirement | Command to Start | Port |
|-------------|-----------------|------|
| Backend Server | `cd backend && uvicorn app.main:app --reload --port 8000` | 8000 |
| PostgreSQL | `brew services start postgresql` | 5432 |
| Metro (optional) | `cd frontend && npm start` | 8081 |

---

## 🔍 Quick Troubleshooting

### Backend Not Running
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### Database Not Accessible
```bash
brew services list | grep postgresql
brew services start postgresql
```

### Tests Failing
```bash
# Check backend logs
tail -f backend/logs/app.log

# Check database connection
psql -U satyenkansara -d healthbridge_db -c "SELECT 1"

# Verify Python path
cd backend && PYTHONPATH=. python3 -c "import app; print('OK')"
```

---

## 📈 Test Coverage Summary

| Category | Tests | Coverage |
|----------|-------|----------|
| Voice Endpoints | 3 | 100% |
| Existing Endpoints | 9 | 90% |
| Database Tables | 10 | 100% |
| Frontend Components | 7 | 100% |
| Service Layer | 3 | 100% |
| Navigation | 4 | 100% |
| **Total** | **36** | **~95%** |

---

## ⏱️ Expected Duration

| Test Suite | Duration |
|------------|----------|
| Voice Features | 5-10 sec |
| Database | 3-5 sec |
| Frontend | 2-4 sec |
| **Total** | **10-20 sec** |

---

## 🎯 When to Run Tests

| Scenario | Command |
|----------|---------|
| Before committing | `./run_all_tests.sh` |
| After pulling updates | `./run_all_tests.sh` |
| After adding features | `./run_all_tests.sh` |
| Weekly health check | `./run_all_tests.sh` |
| Before deployment | `./run_all_tests.sh` |

---

## 📝 Test Output Locations

| Output | Location |
|--------|----------|
| Console | Terminal stdout/stderr |
| Logs (optional) | `test_results.log` |
| CI/CD (future) | `.github/workflows/tests.yml` |

---

## 🔗 Related Documentation

- **Full Testing Guide**: [TESTING.md](./TESTING.md)
- **API Documentation**: [backend/README.md](./backend/README.md)
- **Frontend Documentation**: [frontend/README.md](./frontend/README.md)

---

**Last Updated:** December 25, 2025
**Version:** 1.0.0
