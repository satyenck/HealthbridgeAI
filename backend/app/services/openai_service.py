from openai import OpenAI
from app.config import settings
import base64
from io import BytesIO


class OpenAIService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def transcribe_audio(self, audio_base64: str) -> str:
        """
        Transcribe audio using OpenAI Whisper API
        """
        try:
            audio_bytes = base64.b64decode(audio_base64)
            audio_file = BytesIO(audio_bytes)
            audio_file.name = "audio.wav"

            transcription = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
            return transcription.text
        except Exception as e:
            raise Exception(f"Transcription failed: {str(e)}")

    def generate_summary_report(self, patient_description: str, health_history: str = "", vitals: dict = None, lab_results: dict = None) -> dict:
        """
        Generate comprehensive summary report with 7 sections for v2 architecture:
        - symptoms, diagnosis, treatment, tests, prescription, next_steps
        Enhanced with vitals and lab results context
        """
        try:
            system_prompt = """You are a medical AI assistant helping to analyze patient symptoms and provide preliminary health guidance.
Your role is to:
1. Extract and summarize symptoms from patient descriptions
2. Suggest potential diagnoses (always emphasize these are possibilities, not confirmations)
3. Recommend general treatment approaches
4. Suggest necessary tests and lab work
5. Provide prescription recommendations (if applicable)
6. Provide clear next steps

IMPORTANT: Always include disclaimers that this is not a substitute for professional medical advice and patients should consult healthcare providers for proper diagnosis and treatment."""

            # Build context with vitals and lab results if provided
            context = f"Patient Description: {patient_description}\n"
            if health_history:
                context += f"\nPatient Health History: {health_history}\n"
            if vitals:
                context += f"\nCurrent Vitals: {vitals}\n"
            if lab_results:
                context += f"\nLab Results: {lab_results}\n"

            user_prompt = f"""Based on the following patient information, generate a structured medical consultation report.

{context}

Please provide a response in the following JSON format with ALL 7 sections:
{{
    "symptoms": "Detailed list of identified symptoms with severity",
    "diagnosis": "Possible diagnoses with appropriate medical disclaimers and reasoning",
    "treatment": "General treatment recommendations and self-care measures",
    "tests": "Recommended tests, lab work, or imaging (or 'None required' if not applicable)",
    "prescription": "Prescription recommendations if applicable (or 'None required' if not applicable)",
    "next_steps": "Recommended actions including when to seek immediate medical attention and follow-up timeline"
}}

Ensure all fields are filled with meaningful content or explicitly state 'None required' where applicable."""

            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7
            )

            import json
            result = json.loads(response.choices[0].message.content)
            return result

        except Exception as e:
            raise Exception(f"Failed to generate summary report: {str(e)}")

    def analyze_vitals(self, vitals: dict, health_history: str = "") -> dict:
        """
        Analyze vital signs and provide health insights.
        Returns assessment of vital signs with recommendations.
        """
        try:
            system_prompt = """You are a medical AI assistant analyzing vital signs.
Provide clear, evidence-based assessments of vital sign patterns and flag any concerning values."""

            user_prompt = f"""Analyze the following vital signs:

{vitals}

{f"Patient Health History: {health_history}" if health_history else ""}

Provide analysis in JSON format:
{{
    "assessment": "Overall assessment of vital signs",
    "concerns": "Any concerning values or patterns",
    "recommendations": "Recommendations based on vitals"
}}"""

            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )

            import json
            result = json.loads(response.choices[0].message.content)
            return result

        except Exception as e:
            raise Exception(f"Failed to analyze vitals: {str(e)}")

    def assess_priority(self, symptoms: str, vitals: dict = None) -> str:
        """
        Assess priority level (HIGH, MEDIUM, LOW) based on symptoms and vitals.
        Returns priority level for triage.
        """
        try:
            context = f"Symptoms: {symptoms}\n"
            if vitals:
                context += f"Vitals: {vitals}\n"

            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a medical triage assistant. Assess priority as HIGH (urgent), MEDIUM (prompt attention), or LOW (routine care)."
                    },
                    {
                        "role": "user",
                        "content": f"{context}\n\nRespond with only one word: HIGH, MEDIUM, or LOW"
                    }
                ],
                temperature=0.3
            )

            priority = response.choices[0].message.content.strip().upper()
            if priority not in ["HIGH", "MEDIUM", "LOW"]:
                priority = "MEDIUM"  # Default to MEDIUM if unclear

            return priority

        except Exception as e:
            return "MEDIUM"  # Default to MEDIUM on error


openai_service = OpenAIService()
