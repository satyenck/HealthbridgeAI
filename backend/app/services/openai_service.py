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
            # Use m4a extension for iOS recordings (Whisper supports multiple formats)
            audio_file.name = "audio.m4a"

            transcription = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
            return transcription.text
        except Exception as e:
            print(f"Transcription error details: {str(e)}")  # Add logging
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

    def extract_report_fields_from_voice(self, transcription: str, existing_content: dict = None) -> dict:
        """
        Extract structured report fields from doctor's voice transcription.
        AI identifies which parts belong to symptoms, diagnosis, treatment, etc.

        Args:
            transcription: Doctor's spoken updates
            existing_content: Current report content for context

        Returns:
            Dictionary with extracted fields mapped to report structure
        """
        try:
            system_prompt = """You are a medical AI assistant helping doctors update patient reports through voice.
Your job is to extract structured information from the doctor's spoken updates and map them to specific report fields.

The doctor may mention updates to any of these fields:
- symptoms
- diagnosis
- treatment
- tests
- prescription
- next_steps

Extract ONLY the information the doctor explicitly mentioned. Leave other fields as null."""

            context = f"Doctor's spoken update: {transcription}\n"
            if existing_content:
                context += f"\nCurrent report content: {existing_content}\n"

            user_prompt = f"""Extract the report field updates from the doctor's voice input.

{context}

Provide the response in JSON format with these fields (set to null if not mentioned):
{{
    "symptoms": "Updated symptoms if mentioned, else null",
    "diagnosis": "Updated diagnosis if mentioned, else null",
    "treatment": "Updated treatment if mentioned, else null",
    "tests": "Updated tests if mentioned, else null",
    "prescription": "Updated prescription if mentioned, else null",
    "next_steps": "Updated next steps if mentioned, else null"
}}

Only include fields that the doctor explicitly mentioned updating."""

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
            raise Exception(f"Failed to extract report fields: {str(e)}")

    def extract_medical_info_from_conversation(self, conversation_transcription: str) -> dict:
        """
        Extract medical information from patient-doctor conversation.
        Analyzes full dialogue to extract symptoms, diagnosis, treatment plan, etc.

        Args:
            conversation_transcription: Full conversation between patient and doctor

        Returns:
            Structured medical data extracted from conversation
        """
        try:
            system_prompt = """You are a medical AI assistant analyzing patient-doctor conversations.
Extract all relevant medical information discussed during the call and structure it appropriately.

Focus on:
- Patient symptoms mentioned
- Diagnosis discussed
- Treatment plan agreed upon
- Tests recommended
- Prescriptions mentioned
- Next steps and follow-up plans"""

            user_prompt = f"""Analyze this patient-doctor conversation and extract medical information:

Conversation:
{conversation_transcription}

Provide structured output in JSON format:
{{
    "symptoms": "Patient symptoms discussed (or null if not discussed)",
    "diagnosis": "Diagnosis or differential diagnoses discussed (or null if not discussed)",
    "treatment": "Treatment plan agreed upon (or null if not discussed)",
    "tests": "Lab tests or imaging recommended (or null if not discussed)",
    "prescription": "Medications prescribed or discussed (or null if not discussed)",
    "next_steps": "Follow-up plan and next steps (or null if not discussed)",
    "additional_notes": "Any other important medical notes from conversation (or null if none)"
}}

Only include fields that were actually discussed in the conversation. Set to null if not mentioned."""

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
            raise Exception(f"Failed to extract medical info from conversation: {str(e)}")

    def generate_health_insights(self, patient_data: dict, language: str = "English") -> dict:
        """
        Generate personalized health insights for a patient based on their complete health data.
        Returns actionable insights including health alerts, DOs/DONTs, and pending items.
        Supports multiple languages while keeping medical terms in English.
        """
        try:
            language_instruction = ""
            if language.lower() == "gujarati":
                language_instruction = """
LANGUAGE INSTRUCTION: Generate ALL responses in Gujarati (mixed with English where appropriate).
- Keep medical terms, medication names, test names, and technical medical terminology in ENGLISH
- Write all explanations, recommendations, and general text in GUJARATI
- Use natural Gujarati that patients can easily understand
- Mix English medical terms naturally within Gujarati sentences
Example: "તમારું blood pressure વધી રહ્યું છે અને તમારે doctor ને મળવું જોઈએ" (Your blood pressure is increasing and you should see a doctor)
"""

            system_prompt = f"""You are a medical AI assistant analyzing patient health data to provide personalized, actionable insights.

Your role is to:
1. Identify important health trends or changes that need attention
2. Provide practical DOs and DON'Ts based on their conditions and treatments
3. Highlight any concerning patterns in vitals or symptoms
4. Offer encouragement and practical health advice

Be empathetic, clear, and actionable. Focus on what the patient can do to improve their health.

{language_instruction}"""

            user_prompt = f"""Analyze this patient's health data and provide personalized insights:

Patient Profile:
- Name: {patient_data.get('name', 'Patient')}
- Age: {patient_data.get('age', 'Unknown')}
- Gender: {patient_data.get('gender', 'Unknown')}
- General Health Issues: {patient_data.get('general_health_issues', 'None reported')}

Recent Consultations ({len(patient_data.get('encounters', []))} total):
{patient_data.get('encounters_summary', 'No recent consultations')}

Recent Vitals Trends:
{patient_data.get('vitals_summary', 'No vitals data available')}

Current Diagnoses:
{patient_data.get('diagnoses', 'None')}

Current Treatments:
{patient_data.get('treatments', 'None')}

Please provide a JSON response with:
{{
    "health_alerts": [
        {{
            "title": "Brief alert title",
            "description": "Detailed explanation of the health concern",
            "severity": "high|medium|low",
            "action_needed": "What the patient should do"
        }}
    ],
    "dos": [
        "Specific actionable DO recommendation based on their conditions"
    ],
    "donts": [
        "Specific actionable DON'T recommendation based on their conditions"
    ],
    "positive_notes": [
        "Encouraging observations about their health progress"
    ]
}}

Provide 2-4 health alerts (or empty array if no concerns), 3-5 DOs, 3-5 DON'Ts, and 1-2 positive notes."""

            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.4
            )

            import json
            result = json.loads(response.choices[0].message.content)
            return result

        except Exception as e:
            raise Exception(f"Failed to generate health insights: {str(e)}")

    def translate_consultation_to_gujarati(self, consultation_content: dict) -> dict:
        """
        Translate consultation/summary report content to Gujarati while keeping medical terms in English.
        """
        try:
            system_prompt = """You are a medical translator. Translate medical consultation content to Gujarati while keeping medical terms in English.

IMPORTANT RULES:
- Keep medical terms, medication names, test names, and disease names in ENGLISH
- Translate all explanations and general text to GUJARATI
- Use natural Gujarati that patients can easily understand
- Mix English medical terms naturally within Gujarati sentences"""

            user_prompt = f"""Translate this medical consultation to Gujarati (keeping medical terms in English):

Symptoms: {consultation_content.get('symptoms', 'N/A')}
Diagnosis: {consultation_content.get('diagnosis', 'N/A')}
Treatment: {consultation_content.get('treatment', 'N/A')}
Tests: {consultation_content.get('tests', 'N/A')}
Prescription: {consultation_content.get('prescription', 'N/A')}
Next Steps: {consultation_content.get('next_steps', 'N/A')}

IMPORTANT: Return JSON with these exact lowercase field names:
{{
    "symptoms": "translated symptoms in Gujarati",
    "diagnosis": "translated diagnosis in Gujarati",
    "treatment": "translated treatment in Gujarati",
    "tests": "translated tests in Gujarati",
    "prescription": "translated prescription in Gujarati",
    "next_steps": "translated next steps in Gujarati"
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
            raise Exception(f"Failed to translate consultation: {str(e)}")


openai_service = OpenAIService()
