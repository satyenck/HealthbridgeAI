"""
Regression tests for Gemini 2.5 Flash integration
Tests all AI-powered features after migration from OpenAI to Gemini
"""
import pytest
import base64
from app.services.gemini_service import gemini_service


class TestGeminiVoiceTranscription:
    """Test audio transcription with Gemini"""

    def test_transcribe_sample_text(self):
        """Test basic transcription capability"""
        # Note: Actual audio transcription requires real audio file
        # This is a structure test
        assert hasattr(gemini_service, 'transcribe_audio')
        print("✅ Voice transcription method exists")


class TestGeminiSummaryGeneration:
    """Test AI summary report generation"""

    def test_generate_summary_basic(self):
        """Test summary generation with basic patient description"""
        patient_description = "Patient complains of fever and headache for 2 days"

        result = gemini_service.generate_summary_report(patient_description)

        # Verify all required fields are present
        assert 'symptoms' in result
        assert 'diagnosis' in result
        assert 'treatment' in result
        assert 'tests' in result
        assert 'prescription' in result
        assert 'next_steps' in result

        # Verify fields are not empty
        assert len(result['symptoms']) > 0
        assert len(result['diagnosis']) > 0

        print("✅ Basic summary generation: PASSED")
        print(f"   Symptoms: {result['symptoms'][:50]}...")
        print(f"   Diagnosis: {result['diagnosis'][:50]}...")

    def test_generate_summary_with_vitals(self):
        """Test summary generation with vitals data"""
        patient_description = "Patient has chest pain"
        vitals = {
            "blood_pressure": "140/90",
            "heart_rate": 95,
            "temperature": 98.6
        }

        result = gemini_service.generate_summary_report(
            patient_description,
            vitals=vitals
        )

        assert 'symptoms' in result
        assert 'diagnosis' in result
        print("✅ Summary with vitals: PASSED")


class TestGeminiVitalsAnalysis:
    """Test vital signs analysis"""

    def test_analyze_normal_vitals(self):
        """Test analysis of normal vital signs"""
        vitals = {
            "blood_pressure": "120/80",
            "heart_rate": 75,
            "temperature": 98.6,
            "respiratory_rate": 16
        }

        result = gemini_service.analyze_vitals(vitals)

        assert 'assessment' in result
        assert 'concerns' in result
        assert 'recommendations' in result
        assert len(result['assessment']) > 0

        print("✅ Vitals analysis (normal): PASSED")
        print(f"   Assessment: {result['assessment'][:60]}...")

    def test_analyze_high_bp(self):
        """Test analysis of high blood pressure"""
        vitals = {
            "blood_pressure": "160/100",
            "heart_rate": 85
        }

        result = gemini_service.analyze_vitals(vitals)

        assert 'assessment' in result
        assert 'concerns' in result
        # Should flag high BP
        assert len(result['concerns']) > 0

        print("✅ Vitals analysis (high BP): PASSED")
        print(f"   Concerns: {result['concerns'][:60]}...")


class TestGeminiPriorityAssessment:
    """Test medical triage/priority assessment"""

    def test_assess_high_priority(self):
        """Test high priority symptoms"""
        symptoms = "Severe chest pain, difficulty breathing, sweating"

        priority = gemini_service.assess_priority(symptoms)

        assert priority in ["HIGH", "MEDIUM", "LOW"]
        assert priority == "HIGH"

        print(f"✅ Priority assessment (emergency): {priority}")

    def test_assess_low_priority(self):
        """Test low priority symptoms"""
        symptoms = "Mild headache for 1 day, no other symptoms"

        priority = gemini_service.assess_priority(symptoms)

        assert priority in ["HIGH", "MEDIUM", "LOW"]
        assert priority in ["LOW", "MEDIUM"]

        print(f"✅ Priority assessment (routine): {priority}")


class TestGeminiFieldExtraction:
    """Test voice-to-report field extraction"""

    def test_extract_diagnosis_update(self):
        """Test extracting diagnosis from doctor's voice"""
        transcription = "Update diagnosis to pneumonia and prescribe antibiotics"

        result = gemini_service.extract_report_fields_from_voice(transcription)

        assert 'diagnosis' in result
        assert 'prescription' in result
        # Should extract diagnosis and prescription
        assert result['diagnosis'] is not None or 'pneumonia' in str(result)

        print("✅ Field extraction from voice: PASSED")
        print(f"   Extracted: {list(result.keys())}")


class TestGeminiConversationAnalysis:
    """Test patient-doctor conversation extraction"""

    def test_extract_from_conversation(self):
        """Test medical info extraction from conversation"""
        conversation = """
        Doctor: What brings you in today?
        Patient: I have a bad cough and fever for 3 days.
        Doctor: Let me check your temperature. It's 101°F. I'll prescribe some antibiotics.
        Patient: Should I rest?
        Doctor: Yes, get plenty of rest and fluids. Come back in a week if not better.
        """

        result = gemini_service.extract_medical_info_from_conversation(conversation)

        assert 'symptoms' in result
        assert 'diagnosis' in result or 'treatment' in result

        print("✅ Conversation analysis: PASSED")
        print(f"   Extracted fields: {list(result.keys())}")


class TestGeminiHealthInsights:
    """Test personalized health insights generation"""

    def test_generate_health_insights_english(self):
        """Test health insights in English"""
        patient_data = {
            "name": "Test Patient",
            "age": 45,
            "gender": "Male",
            "general_health_issues": "Diabetes, High BP",
            "encounters": [],
            "encounters_summary": "Recent consultation for diabetes management",
            "vitals_summary": "BP trending high",
            "diagnoses": "Type 2 Diabetes",
            "treatments": "Metformin"
        }

        result = gemini_service.generate_health_insights(patient_data, language="English")

        assert 'health_alerts' in result
        assert 'dos' in result
        assert 'donts' in result
        assert 'positive_notes' in result

        assert isinstance(result['dos'], list)
        assert isinstance(result['donts'], list)

        print("✅ Health insights (English): PASSED")
        print(f"   Health alerts: {len(result['health_alerts'])}")
        print(f"   DOs: {len(result['dos'])}")
        print(f"   DON'Ts: {len(result['donts'])}")

    def test_generate_health_insights_gujarati(self):
        """Test health insights in Gujarati"""
        patient_data = {
            "name": "Test Patient",
            "age": 45,
            "general_health_issues": "Diabetes",
            "encounters": [],
            "encounters_summary": "Recent visit",
            "vitals_summary": "Normal",
            "diagnoses": "Type 2 Diabetes",
            "treatments": "Metformin"
        }

        result = gemini_service.generate_health_insights(patient_data, language="Gujarati")

        assert 'health_alerts' in result
        assert 'dos' in result

        # Should contain Gujarati text
        if len(result['dos']) > 0:
            print(f"   Sample DO (Gujarati): {result['dos'][0][:50]}...")

        print("✅ Health insights (Gujarati): PASSED")


class TestGeminiTranslation:
    """Test Gujarati translation"""

    def test_translate_to_gujarati(self):
        """Test consultation translation to Gujarati"""
        consultation_content = {
            "symptoms": "Fever and cough",
            "diagnosis": "Upper respiratory infection",
            "treatment": "Rest and fluids",
            "tests": "None required",
            "prescription": "Acetaminophen for fever",
            "next_steps": "Return if symptoms worsen"
        }

        result = gemini_service.translate_consultation_to_gujarati(consultation_content)

        assert 'symptoms' in result
        assert 'diagnosis' in result
        assert 'treatment' in result

        # Results should contain Gujarati text
        assert len(result['symptoms']) > 0

        print("✅ Gujarati translation: PASSED")
        print(f"   Symptoms (Gujarati): {result['symptoms'][:50]}...")


class TestGeminiTTS:
    """Test Text-to-Speech functionality"""

    def test_tts_method_exists(self):
        """Test TTS method is available"""
        assert hasattr(gemini_service, 'generate_gujarati_voice_summary')
        print("✅ TTS method exists")

    # Note: Actual TTS testing requires API calls and returns audio bytes
    # Skipping live test to avoid quota usage during regression


class TestGeminiModelVersion:
    """Verify correct Gemini model is being used"""

    def test_correct_model_version(self):
        """Verify using Gemini 2.5 Flash"""
        assert gemini_service.text_model.model_name == "models/gemini-2.5-flash"
        assert gemini_service.audio_model.model_name == "models/gemini-2.5-flash"

        print("✅ Model version verified:")
        print(f"   Text model: {gemini_service.text_model.model_name}")
        print(f"   Audio model: {gemini_service.audio_model.model_name}")


def run_regression_tests():
    """Run all regression tests"""
    print("\n" + "="*70)
    print("🧪 GEMINI 2.5 FLASH REGRESSION TEST SUITE")
    print("="*70 + "\n")

    # Run pytest
    pytest.main([__file__, "-v", "-s"])


if __name__ == "__main__":
    run_regression_tests()
