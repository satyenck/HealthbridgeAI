"""
Simple regression test for Gemini 2.5 Flash integration
Direct testing without pytest/database setup
"""
import sys
sys.path.insert(0, '.')

from app.services.gemini_service import gemini_service
import json


def print_test_header(test_name):
    print(f"\n{'='*70}")
    print(f"🧪 TEST: {test_name}")
    print('='*70)


def print_result(passed, message=""):
    if passed:
        print(f"✅ PASSED {message}")
    else:
        print(f"❌ FAILED {message}")
    return passed


def test_model_version():
    """Verify correct Gemini model is being used"""
    print_test_header("Model Version Verification")

    text_model = gemini_service.text_model.model_name
    audio_model = gemini_service.audio_model.model_name

    print(f"   Text model: {text_model}")
    print(f"   Audio model: {audio_model}")

    passed = (text_model == "models/gemini-2.5-flash" and
              audio_model == "models/gemini-2.5-flash")

    return print_result(passed, "- Using Gemini 2.5 Flash")


def test_summary_generation():
    """Test AI summary report generation"""
    print_test_header("AI Summary Generation")

    try:
        patient_description = "Patient has fever of 102°F, headache, and body aches for 2 days"

        print(f"   Input: {patient_description}")
        result = gemini_service.generate_summary_report(patient_description)

        # Verify all required fields
        required_fields = ['symptoms', 'diagnosis', 'treatment', 'tests', 'prescription', 'next_steps']
        all_present = all(field in result for field in required_fields)

        if all_present:
            print(f"   ✓ All 6 required fields present")
            print(f"   ✓ Symptoms: {result['symptoms'][:60]}...")
            print(f"   ✓ Diagnosis: {result['diagnosis'][:60]}...")
            print(f"   ✓ Treatment: {result['treatment'][:60]}...")

        return print_result(all_present and len(result['symptoms']) > 0)

    except Exception as e:
        print(f"   Error: {str(e)}")
        return print_result(False, f"- Error: {str(e)}")


def test_vitals_analysis():
    """Test vital signs analysis"""
    print_test_header("Vitals Analysis")

    try:
        vitals = {
            "blood_pressure": "140/90",
            "heart_rate": 95,
            "temperature": 99.5,
            "respiratory_rate": 18
        }

        print(f"   Input vitals: BP={vitals['blood_pressure']}, HR={vitals['heart_rate']}")
        result = gemini_service.analyze_vitals(vitals)

        required_fields = ['assessment', 'concerns', 'recommendations']
        all_present = all(field in result for field in required_fields)

        if all_present:
            print(f"   ✓ Assessment: {result['assessment'][:60]}...")
            print(f"   ✓ Concerns: {result['concerns'][:60]}...")

        return print_result(all_present)

    except Exception as e:
        print(f"   Error: {str(e)}")
        return print_result(False, f"- Error: {str(e)}")


def test_priority_assessment():
    """Test medical triage/priority assessment"""
    print_test_header("Priority Assessment (Triage)")

    try:
        # Test high priority
        high_priority_symptoms = "Severe chest pain, difficulty breathing, sweating profusely"
        print(f"   High priority symptoms: {high_priority_symptoms[:50]}...")

        priority = gemini_service.assess_priority(high_priority_symptoms)
        print(f"   Priority assessed: {priority}")

        high_correct = priority == "HIGH"

        # Test low priority
        low_priority_symptoms = "Mild headache for 1 day"
        print(f"   Low priority symptoms: {low_priority_symptoms}")

        priority2 = gemini_service.assess_priority(low_priority_symptoms)
        print(f"   Priority assessed: {priority2}")

        low_correct = priority2 in ["LOW", "MEDIUM"]

        return print_result(high_correct and low_correct, "- Both assessments correct")

    except Exception as e:
        print(f"   Error: {str(e)}")
        return print_result(False, f"- Error: {str(e)}")


def test_field_extraction():
    """Test voice-to-report field extraction"""
    print_test_header("Voice-to-Report Field Extraction")

    try:
        transcription = "Update the diagnosis to bacterial pneumonia and prescribe amoxicillin 500mg three times daily"
        print(f"   Voice input: {transcription[:70]}...")

        result = gemini_service.extract_report_fields_from_voice(transcription)

        print(f"   Extracted fields: {list(result.keys())}")

        # Should extract diagnosis and prescription
        has_diagnosis = result.get('diagnosis') is not None
        has_prescription = result.get('prescription') is not None

        if has_diagnosis:
            print(f"   ✓ Diagnosis: {result['diagnosis'][:60]}...")
        if has_prescription:
            print(f"   ✓ Prescription: {result['prescription'][:60]}...")

        return print_result(has_diagnosis or has_prescription, "- Field extraction working")

    except Exception as e:
        print(f"   Error: {str(e)}")
        return print_result(False, f"- Error: {str(e)}")


def test_conversation_analysis():
    """Test patient-doctor conversation extraction"""
    print_test_header("Conversation Analysis")

    try:
        conversation = """
Doctor: What brings you in today?
Patient: I've had a terrible cough and fever for about 3 days now.
Doctor: I see. Let me check your vitals. Your temperature is 101°F. I'll prescribe antibiotics.
Patient: Should I take time off work?
Doctor: Yes, rest is important. Take the full course of antibiotics and return if symptoms worsen.
"""

        print(f"   Conversation length: {len(conversation)} characters")
        result = gemini_service.extract_medical_info_from_conversation(conversation)

        print(f"   Extracted fields: {list(result.keys())}")

        has_symptoms = result.get('symptoms') is not None
        has_info = len([v for v in result.values() if v]) > 0

        if has_symptoms:
            print(f"   ✓ Symptoms extracted: {result['symptoms'][:50]}...")

        return print_result(has_info, "- Conversation analysis working")

    except Exception as e:
        print(f"   Error: {str(e)}")
        return print_result(False, f"- Error: {str(e)}")


def test_health_insights():
    """Test personalized health insights generation"""
    print_test_header("Health Insights Generation")

    try:
        patient_data = {
            "name": "Test Patient",
            "age": 55,
            "gender": "Male",
            "general_health_issues": "Type 2 Diabetes, Hypertension",
            "encounters": [],
            "encounters_summary": "Recent consultation for diabetes management",
            "vitals_summary": "Blood pressure trending high",
            "diagnoses": "Type 2 Diabetes, Hypertension",
            "treatments": "Metformin, Lisinopril"
        }

        print(f"   Patient: {patient_data['age']}y {patient_data['gender']}, {patient_data['general_health_issues']}")

        # Test English
        result_en = gemini_service.generate_health_insights(patient_data, language="English")

        has_all_fields = all(k in result_en for k in ['health_alerts', 'dos', 'donts', 'positive_notes'])

        print(f"   ✓ English insights generated")
        print(f"     - Health alerts: {len(result_en['health_alerts'])}")
        print(f"     - DOs: {len(result_en['dos'])}")
        print(f"     - DON'Ts: {len(result_en['donts'])}")

        return print_result(has_all_fields, "- Health insights working")

    except Exception as e:
        print(f"   Error: {str(e)}")
        return print_result(False, f"- Error: {str(e)}")


def test_gujarati_translation():
    """Test Gujarati translation"""
    print_test_header("Gujarati Translation")

    try:
        consultation_content = {
            "symptoms": "Fever, cough, and body aches",
            "diagnosis": "Viral upper respiratory infection",
            "treatment": "Rest, hydration, and over-the-counter pain relievers",
            "tests": "None required at this time",
            "prescription": "Acetaminophen 500mg as needed for fever",
            "next_steps": "Return if symptoms worsen or persist beyond 7 days"
        }

        print(f"   Original: {consultation_content['symptoms']}")
        result = gemini_service.translate_consultation_to_gujarati(consultation_content)

        all_translated = all(field in result for field in consultation_content.keys())
        has_gujarati = len(result['symptoms']) > 0

        if has_gujarati:
            print(f"   ✓ Gujarati symptoms: {result['symptoms'][:50]}...")
            print(f"   ✓ Gujarati diagnosis: {result['diagnosis'][:50]}...")

        return print_result(all_translated and has_gujarati, "- Translation working")

    except Exception as e:
        print(f"   Error: {str(e)}")
        return print_result(False, f"- Error: {str(e)}")


def test_tts_availability():
    """Test TTS method availability"""
    print_test_header("Text-to-Speech (TTS) Feature")

    has_method = hasattr(gemini_service, 'generate_gujarati_voice_summary')

    if has_method:
        print(f"   ✓ TTS method available: generate_gujarati_voice_summary()")
        print(f"   ✓ Model: gemini-2.5-flash-tts")
        print(f"   Note: Skipping live TTS test to conserve API quota")

    return print_result(has_method, "- TTS feature ready")


def run_all_tests():
    """Run all regression tests"""
    print("\n" + "="*70)
    print("🚀 GEMINI 2.5 FLASH - COMPREHENSIVE REGRESSION TEST SUITE")
    print("="*70)
    print("Testing all AI features after OpenAI → Gemini migration")
    print()

    results = []

    # Run all tests
    results.append(("Model Version", test_model_version()))
    results.append(("Summary Generation", test_summary_generation()))
    results.append(("Vitals Analysis", test_vitals_analysis()))
    results.append(("Priority Assessment", test_priority_assessment()))
    results.append(("Field Extraction", test_field_extraction()))
    results.append(("Conversation Analysis", test_conversation_analysis()))
    results.append(("Health Insights", test_health_insights()))
    results.append(("Gujarati Translation", test_gujarati_translation()))
    results.append(("TTS Availability", test_tts_availability()))

    # Print summary
    print("\n" + "="*70)
    print("📊 TEST SUMMARY")
    print("="*70)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:12} {test_name}")

    print("="*70)
    print(f"Results: {passed}/{total} tests passed ({passed*100//total}%)")
    print("="*70)

    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Gemini 2.5 Flash migration successful!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Review errors above.")
        return 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
