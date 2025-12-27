#!/bin/bash

# ============================================================================
# HealthbridgeAI - Frontend Integration Verification
# Verifies voice features are properly integrated
# ============================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

FRONTEND_DIR="/Users/satyenkansara/Projects/HealthbridgeAI/frontend/src"

echo -e "${BLUE}========================================================================"
echo "HealthbridgeAI - Frontend Integration Verification"
echo -e "========================================================================${NC}"
echo ""

check_file_exists() {
    local file_path=$1
    local display_name=$2

    echo -n "Testing: $display_name exists... "
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

check_file_contains() {
    local file_path=$1
    local search_term=$2
    local display_name=$3

    echo -n "Testing: $display_name... "
    if [ -f "$file_path" ]; then
        if grep -q "$search_term" "$file_path"; then
            echo -e "${GREEN}✅ PASSED${NC}"
            ((PASSED++))
            return 0
        else
            echo -e "${RED}❌ FAILED${NC} (Pattern not found)"
            ((FAILED++))
            return 1
        fi
    else
        echo -e "${RED}❌ FAILED${NC} (File not found)"
        ((FAILED++))
        return 1
    fi
}

check_import_exists() {
    local file_path=$1
    local import_name=$2
    local display_name=$3

    echo -n "Testing: $display_name import... "
    if [ -f "$file_path" ]; then
        if grep -q "import.*$import_name" "$file_path"; then
            echo -e "${GREEN}✅ PASSED${NC}"
            ((PASSED++))
            return 0
        else
            echo -e "${RED}❌ FAILED${NC}"
            ((FAILED++))
            return 1
        fi
    else
        echo -e "${RED}❌ FAILED${NC} (File not found)"
        ((FAILED++))
        return 1
    fi
}

echo "Category: New Components"
echo "------------------------------------------------------------------------"
check_file_exists "$FRONTEND_DIR/screens/VoiceCallScreen.tsx" "VoiceCallScreen"
check_file_exists "$FRONTEND_DIR/screens/doctor/CallReviewScreen.tsx" "CallReviewScreen"
check_file_exists "$FRONTEND_DIR/components/FieldReviewCard.tsx" "FieldReviewCard"
check_file_exists "$FRONTEND_DIR/components/VoiceReportEditorModal.tsx" "VoiceReportEditorModal"
echo ""

echo "Category: Existing Components (Regression)"
echo "------------------------------------------------------------------------"
check_file_exists "$FRONTEND_DIR/screens/doctor/DashboardScreen.tsx" "DashboardScreen"
check_file_exists "$FRONTEND_DIR/screens/doctor/ReviewReportScreen.tsx" "ReviewReportScreen"
check_file_exists "$FRONTEND_DIR/screens/doctor/PendingReportsScreen.tsx" "PendingReportsScreen"
check_file_exists "$FRONTEND_DIR/components/VoiceRecorder.tsx" "VoiceRecorder"
echo ""

echo "Category: Navigation Configuration"
echo "------------------------------------------------------------------------"
check_import_exists "$FRONTEND_DIR/navigation/DoctorNavigator.tsx" "VoiceCallScreen" "VoiceCallScreen"
check_import_exists "$FRONTEND_DIR/navigation/DoctorNavigator.tsx" "CallReviewScreen" "CallReviewScreen"
check_file_contains "$FRONTEND_DIR/navigation/DoctorNavigator.tsx" 'name="VoiceCall"' "VoiceCall screen registered"
check_file_contains "$FRONTEND_DIR/navigation/DoctorNavigator.tsx" 'name="CallReview"' "CallReview screen registered"
echo ""

echo "Category: API Configuration"
echo "------------------------------------------------------------------------"
check_file_contains "$FRONTEND_DIR/config/api.ts" "START_CALL" "START_CALL endpoint"
check_file_contains "$FRONTEND_DIR/config/api.ts" "PROCESS_CALL_RECORDING" "PROCESS_CALL_RECORDING endpoint"
check_file_contains "$FRONTEND_DIR/config/api.ts" "EXTRACT_REPORT_FIELDS" "EXTRACT_REPORT_FIELDS endpoint"
echo ""

echo "Category: Service Layer"
echo "------------------------------------------------------------------------"
check_file_contains "$FRONTEND_DIR/services/encounterService.ts" "processCallRecording" "processCallRecording method"
check_file_contains "$FRONTEND_DIR/services/encounterService.ts" "extractReportFieldsFromVoice" "extractReportFieldsFromVoice method"
check_file_contains "$FRONTEND_DIR/services/voiceService.ts" "audioToBase64" "audioToBase64 method"
echo ""

echo "Category: Component Integration"
echo "------------------------------------------------------------------------"
check_file_contains "$FRONTEND_DIR/screens/doctor/ReviewReportScreen.tsx" "VoiceReportEditorModal" "VoiceReportEditorModal usage"
check_file_contains "$FRONTEND_DIR/screens/doctor/ReviewReportScreen.tsx" "Start Voice Consultation" "Voice consultation button"
check_file_contains "$FRONTEND_DIR/screens/VoiceCallScreen.tsx" "VoiceRecorder" "VoiceRecorder usage"
check_file_contains "$FRONTEND_DIR/screens/doctor/CallReviewScreen.tsx" "FieldReviewCard" "FieldReviewCard usage"
echo ""

echo "Category: TypeScript Exports"
echo "------------------------------------------------------------------------"
check_file_contains "$FRONTEND_DIR/screens/VoiceCallScreen.tsx" "export.*VoiceCallScreen" "VoiceCallScreen export"
check_file_contains "$FRONTEND_DIR/screens/doctor/CallReviewScreen.tsx" "export.*CallReviewScreen" "CallReviewScreen export"
check_file_contains "$FRONTEND_DIR/components/FieldReviewCard.tsx" "export.*FieldReviewCard" "FieldReviewCard export"
check_file_contains "$FRONTEND_DIR/components/VoiceReportEditorModal.tsx" "export.*VoiceReportEditorModal" "VoiceReportEditorModal export"
echo ""

echo "Category: Package Dependencies"
echo "------------------------------------------------------------------------"
echo -n "Testing: react-native-agora installed... "
if grep -q "react-native-agora" "$FRONTEND_DIR/../package.json"; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING${NC}"
    ((WARNINGS++))
fi
echo ""

echo "Category: Metro Bundler Status"
echo "------------------------------------------------------------------------"
echo -n "Testing: Metro bundler reachable... "
if curl -s http://localhost:8081/ >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (Not running)"
    ((WARNINGS++))
fi
echo ""

echo "========================================================================"
echo "FRONTEND VERIFICATION SUMMARY"
echo "========================================================================"
echo "Total Tests: $((PASSED + FAILED + WARNINGS))"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL FRONTEND TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  SOME TESTS FAILED${NC}"
    exit 1
fi
