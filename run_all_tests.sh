#!/bin/bash

# ============================================================================
# HealthbridgeAI - Master Test Runner
# Runs all automated test suites
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="/Users/satyenkansara/Projects/HealthbridgeAI"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo -e "${CYAN}"
echo "================================================================================"
echo "   _   _            _ _   _     _          _     _              _    _____ "
echo "  | | | | ___  __ _| | |_| |__ | |__  _ __(_) __| | __ _  ___  / \\  |_   _|"
echo "  | |_| |/ _ \\/ _\` | | __| '_ \\| '_ \\| '__| |/ _\` |/ _\` |/ _ \\/  _ \\   | |  "
echo "  |  _  |  __/ (_| | | |_| | | | |_) | |  | | (_| | (_| |  __/ ___ \\  | |  "
echo "  |_| |_|\\___|\\__,_|_|\\__|_| |_|_.__/|_|  |_|\\__,_|\\__, |\\___|_/   \\_\\ |_|  "
echo "                                                   |___/                     "
echo ""
echo "                     Automated Test Suite Runner"
echo "================================================================================"
echo -e "${NC}"
echo ""

TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

run_test_suite() {
    local suite_name=$1
    local command=$2

    ((TOTAL_SUITES++))

    echo ""
    echo -e "${BLUE}================================================================================"
    echo "Running: $suite_name"
    echo -e "================================================================================${NC}"
    echo ""

    if eval "$command"; then
        echo ""
        echo -e "${GREEN}✅ $suite_name: PASSED${NC}"
        ((PASSED_SUITES++))
        return 0
    else
        echo ""
        echo -e "${RED}❌ $suite_name: FAILED${NC}"
        ((FAILED_SUITES++))
        return 1
    fi
}

# Pre-flight checks
echo -e "${YELLOW}Pre-flight Checks${NC}"
echo "--------------------------------------------------------------------------------"

echo -n "Checking backend directory... "
if [ -d "$BACKEND_DIR" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    exit 1
fi

echo -n "Checking frontend directory... "
if [ -d "$FRONTEND_DIR" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    exit 1
fi

echo -n "Checking database connection... "
if psql -U satyenkansara -d healthbridge_db -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Cannot connect${NC}"
    exit 1
fi

echo -n "Checking backend server... "
if curl -s http://localhost:8000/ >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${YELLOW}⚠ Not running${NC}"
    echo ""
    echo -e "${YELLOW}WARNING: Backend server is not running!${NC}"
    echo "Please start the backend server with:"
    echo "  cd $BACKEND_DIR && uvicorn app.main:app --reload --port 8000"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

# Run test suites
echo -e "${CYAN}Starting Test Execution${NC}"
echo "================================================================================"
echo ""

# Test Suite 1: Database Integrity
run_test_suite \
    "Database Integrity Tests" \
    "bash $BACKEND_DIR/tests/test_database.sh"

# Test Suite 2: Voice Features (Python)
run_test_suite \
    "Voice Features API Tests" \
    "cd $BACKEND_DIR && PYTHONPATH=. python3 tests/test_voice_features.py"

# Test Suite 3: Frontend Integration
run_test_suite \
    "Frontend Integration Tests" \
    "bash $FRONTEND_DIR/tests/verify_integration.sh"

# Final Summary
echo ""
echo ""
echo -e "${CYAN}================================================================================"
echo "                         FINAL TEST SUMMARY"
echo -e "================================================================================${NC}"
echo ""
echo "Total Test Suites: $TOTAL_SUITES"
echo -e "${GREEN}✅ Passed: $PASSED_SUITES${NC}"
echo -e "${RED}❌ Failed: $FAILED_SUITES${NC}"
echo ""

if [ $FAILED_SUITES -eq 0 ]; then
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════"
    echo "                       🎉 ALL TEST SUITES PASSED! 🎉"
    echo "═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "System Status: ✅ HEALTHY"
    echo "Voice Features: ✅ WORKING"
    echo "Integration: ✅ COMPLETE"
    echo ""
    echo "The system is ready for production deployment!"
    echo ""
    exit 0
else
    echo -e "${RED}═══════════════════════════════════════════════════════════════════════════════"
    echo "                        ⚠️  SOME TESTS FAILED ⚠️"
    echo "═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Please review the failed test suites above and fix the issues."
    echo ""
    exit 1
fi
