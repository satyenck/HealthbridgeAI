#!/bin/bash

# ============================================================================
# HealthbridgeAI - Database Integrity Test Suite
# Tests database schema and data integrity
# ============================================================================

set -e

DB_NAME="healthbridge_db"
DB_USER="satyenkansara"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

echo -e "${BLUE}========================================================================"
echo "HealthbridgeAI - Database Integrity Test Suite"
echo -e "========================================================================${NC}"
echo ""

test_table_exists() {
    local table_name=$1
    local display_name=$2

    echo -n "Testing: $display_name table exists... "
    if psql -U "$DB_USER" -d "$DB_NAME" -c "\dt $table_name" 2>/dev/null | grep -q "$table_name"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

test_table_count() {
    local table_name=$1
    local display_name=$2
    local min_count=$3

    echo -n "Testing: $display_name has data... "
    count=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table_name" 2>/dev/null | tr -d ' ')

    if [ -n "$count" ] && [ "$count" -ge "$min_count" ]; then
        echo -e "${GREEN}✅ PASSED${NC} ($count records)"
        ((PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠️  WARNING${NC} ($count records, expected >= $min_count)"
        return 1
    fi
}

test_column_exists() {
    local table_name=$1
    local column_name=$2
    local display_name=$3

    echo -n "Testing: $display_name... "
    if psql -U "$DB_USER" -d "$DB_NAME" -c "\d $table_name" 2>/dev/null | grep -q "$column_name"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

test_constraint_exists() {
    local table_name=$1
    local constraint_type=$2
    local display_name=$3

    echo -n "Testing: $display_name... "
    if psql -U "$DB_USER" -d "$DB_NAME" -c "\d $table_name" 2>/dev/null | grep -q "$constraint_type"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

echo "Category: Core Tables"
echo "------------------------------------------------------------------------"
test_table_exists "users" "Users"
test_table_exists "patient_profiles" "Patient profiles"
test_table_exists "doctor_profiles" "Doctor profiles"
test_table_exists "lab_profiles" "Lab profiles"
test_table_exists "pharmacy_profiles" "Pharmacy profiles"
test_table_exists "encounters" "Encounters"
test_table_exists "summary_reports" "Summary reports"
test_table_exists "vitals_logs" "Vitals logs"
test_table_exists "lab_results_logs" "Lab results logs"
test_table_exists "media_files" "Media files"
echo ""

echo "Category: Data Integrity"
echo "------------------------------------------------------------------------"
test_table_count "users" "Users" 1
test_table_count "doctor_profiles" "Doctor profiles" 1
test_table_count "encounters" "Encounters" 1
echo ""

echo "Category: Schema Integrity"
echo "------------------------------------------------------------------------"
test_column_exists "users" "user_id" "Users.user_id column"
test_column_exists "users" "role" "Users.role column"
test_column_exists "encounters" "encounter_id" "Encounters.encounter_id column"
test_column_exists "encounters" "patient_id" "Encounters.patient_id column"
test_column_exists "encounters" "doctor_id" "Encounters.doctor_id column"
test_column_exists "summary_reports" "report_id" "Summary_reports.report_id column"
test_column_exists "summary_reports" "content" "Summary_reports.content column (JSONB)"
echo ""

echo "Category: Foreign Key Constraints"
echo "------------------------------------------------------------------------"
test_constraint_exists "encounters" "FOREIGN KEY" "Encounters foreign keys"
test_constraint_exists "summary_reports" "FOREIGN KEY" "Summary reports foreign keys"
test_constraint_exists "doctor_profiles" "FOREIGN KEY" "Doctor profiles foreign keys"
echo ""

echo "Category: Referential Integrity"
echo "------------------------------------------------------------------------"
echo -n "Testing: Orphaned encounters... "
orphaned=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM encounters e
    WHERE e.patient_id NOT IN (SELECT user_id FROM users WHERE role = 'PATIENT')
" 2>/dev/null | tr -d ' ')

if [ "$orphaned" = "0" ]; then
    echo -e "${GREEN}✅ PASSED${NC} (No orphaned records)"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC} ($orphaned orphaned encounters)"
    ((FAILED++))
fi

echo -n "Testing: Orphaned summary reports... "
orphaned=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM summary_reports sr
    WHERE sr.encounter_id NOT IN (SELECT encounter_id FROM encounters)
" 2>/dev/null | tr -d ' ')

if [ "$orphaned" = "0" ]; then
    echo -e "${GREEN}✅ PASSED${NC} (No orphaned records)"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC} ($orphaned orphaned reports)"
    ((FAILED++))
fi
echo ""

echo "Category: Database Connection"
echo "------------------------------------------------------------------------"
echo -n "Testing: Database connection... "
if psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
fi

echo -n "Testing: Database version... "
version=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version()" 2>/dev/null | head -1)
if [ -n "$version" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    echo "   $version"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
fi
echo ""

echo "========================================================================"
echo "DATABASE TEST SUMMARY"
echo "========================================================================"
echo "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL DATABASE TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  SOME TESTS FAILED${NC}"
    exit 1
fi
