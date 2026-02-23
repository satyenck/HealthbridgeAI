import google.generativeai as genai
from app.config import settings
import base64
from io import BytesIO
import json
import tempfile
import os
import re


def clean_markdown_formatting(text: str) -> str:
    """
    Remove markdown formatting markers from text.
    Removes: **, *, __, _, ~~, `, #, etc.
    """
    if not text:
        return text

    # Remove bold markers (**text** or __text__)
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)

    # Remove italic markers (*text* or _text_)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)

    # Remove strikethrough (~~text~~)
    text = re.sub(r'~~(.+?)~~', r'\1', text)

    # Remove inline code (`text`)
    text = re.sub(r'`(.+?)`', r'\1', text)

    # Remove headers (# text)
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)

    # Remove remaining asterisks and underscores at word boundaries
    text = re.sub(r'\*+', '', text)
    text = re.sub(r'_+', '', text)

    return text


class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        # Use Gemini 2.5 Flash for speed, cost-efficiency, and latest features
        # Supports: audio transcription, TTS, multimodal, real-time voice
        self.text_model = genai.GenerativeModel('gemini-2.5-flash')
        self.audio_model = genai.GenerativeModel('gemini-2.5-flash')

    def transcribe_audio(self, audio_base64: str) -> str:
        """
        Transcribe audio using Gemini's audio understanding capabilities
        """
        try:
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_base64)
            audio_size = len(audio_bytes)
            print(f"[Transcription] Audio size: {audio_size} bytes ({audio_size / 1024:.2f} KB)")

            # Validate audio size
            if audio_size < 1000:
                raise Exception(f"Audio file too small ({audio_size} bytes). Recording may be empty or corrupted.")

            # Create a temporary file for the audio
            with tempfile.NamedTemporaryFile(delete=False, suffix='.m4a') as temp_audio:
                temp_audio.write(audio_bytes)
                temp_audio_path = temp_audio.name

            print(f"[Transcription] Temp file created: {temp_audio_path}")

            try:
                # Upload the audio file to Gemini
                print(f"[Transcription] Uploading to Gemini...")
                audio_file = genai.upload_file(temp_audio_path)
                print(f"[Transcription] Upload complete. File name: {audio_file.name}")

                # Use Gemini to transcribe the audio
                # IMPORTANT: Configure generation to ensure full audio is processed
                prompt = """Transcribe this entire audio file completely from beginning to end.

                CRITICAL INSTRUCTIONS:
                1. Transcribe EVERY word spoken in the ENTIRE audio file
                2. Do NOT summarize or skip any part of the audio
                3. Transcribe from the very beginning to the very end
                4. If this is a conversation, transcribe ALL dialogue from ALL speakers
                5. Maintain medical terminology accurately
                6. Only respond with 'no audio' if there is literally NO speech at all

                Provide the complete verbatim transcription:"""

                # Configure generation settings for longer audio
                generation_config = {
                    'temperature': 0.1,  # Lower temperature for more accurate transcription
                    'top_p': 0.95,
                    'top_k': 40,
                    'max_output_tokens': 8192,  # Allow longer transcriptions
                }

                print(f"[Transcription] Generating content with Gemini...")
                response = self.audio_model.generate_content(
                    [prompt, audio_file],
                    generation_config=generation_config
                )
                transcription = response.text.strip()
                print(f"[Transcription] Result length: {len(transcription)} characters")
                print(f"[Transcription] First 200 chars: '{transcription[:200]}...'")
                if len(transcription) > 200:
                    print(f"[Transcription] Last 200 chars: '...{transcription[-200:]}'")

                # Check for problematic transcriptions
                if transcription.lower() in ['silence', 'no audio', 'no speech', '']:
                    print(f"[Transcription WARNING] Got '{transcription}' - audio may be silent or unclear")
                    raise Exception(f"No speech detected in recording. Please ensure microphone is working and speak clearly during recording.")

                # Clean up the uploaded file
                genai.delete_file(audio_file.name)

                return transcription

            finally:
                # Clean up the temporary file
                if os.path.exists(temp_audio_path):
                    os.unlink(temp_audio_path)

        except Exception as e:
            print(f"[Transcription ERROR] {str(e)}")
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
    "treatment": "CONCISE bullet points (2-4 bullets) for treatment recommendations. Format: • Each point on new line",
    "tests": "CONCISE bullet points (2-4 bullets) for recommended tests. Format: • Test name - reason. Use 'None required' if not applicable",
    "prescription": "CONCISE bullet points (2-3 bullets) for medications. Format: • Medicine name - dosage - frequency. Use 'None required' if not applicable",
    "next_steps": "CONCISE bullet points (2-4 bullets) for action items. Format: • Clear action with timeline"
}}

IMPORTANT FORMATTING:
- Keep treatment, tests, prescription, and next_steps as brief bullet points
- Use • symbol for bullets
- Each bullet on a new line
- Maximum 2-4 bullets per section
- Be specific but concise
- Symptoms and diagnosis can be more detailed

Ensure all fields are filled with meaningful content or explicitly state 'None required' where applicable."""

            full_prompt = f"{system_prompt}\n\n{user_prompt}"

            response = self.text_model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.7,
                    response_mime_type="application/json"
                )
            )

            result = json.loads(response.text)

            # Clean markdown formatting from all fields
            for key in result:
                if isinstance(result[key], str):
                    result[key] = clean_markdown_formatting(result[key])

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

            full_prompt = f"{system_prompt}\n\n{user_prompt}"

            response = self.text_model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    response_mime_type="application/json"
                )
            )

            result = json.loads(response.text)
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

            system_prompt = "You are a medical triage assistant. Assess priority as HIGH (urgent), MEDIUM (prompt attention), or LOW (routine care)."
            user_prompt = f"{context}\n\nRespond with only one word: HIGH, MEDIUM, or LOW"

            full_prompt = f"{system_prompt}\n\n{user_prompt}"

            response = self.text_model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.3
                )
            )

            priority = response.text.strip().upper()
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
    "treatment": "CONCISE bullet points for treatment. Format: • Each point on new line, else null",
    "tests": "CONCISE bullet points for tests. Format: • Test name - reason, else null",
    "prescription": "CONCISE bullet points for medications. Format: • Medicine - dosage - frequency, else null",
    "next_steps": "CONCISE bullet points for action items. Format: • Clear action with timeline, else null"
}}

IMPORTANT FORMATTING:
- Keep treatment, tests, prescription, and next_steps as brief bullet points using • symbol
- Each bullet on a new line
- Maximum 2-4 bullets per section
- Be specific but concise
- Only include fields the doctor explicitly mentioned updating"""

            full_prompt = f"{system_prompt}\n\n{user_prompt}"

            response = self.text_model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    response_mime_type="application/json"
                )
            )

            result = json.loads(response.text)

            # Clean markdown formatting from all fields
            for key in result:
                if isinstance(result[key], str):
                    result[key] = clean_markdown_formatting(result[key])

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
    "treatment": "CONCISE bullet points for treatment plan. Format: • Each point on new line (or null if not discussed)",
    "tests": "CONCISE bullet points for tests. Format: • Test name - reason (or null if not discussed)",
    "prescription": "CONCISE bullet points for medications. Format: • Medicine - dosage - frequency (or null if not discussed)",
    "next_steps": "CONCISE bullet points for action items. Format: • Clear action with timeline (or null if not discussed)",
    "additional_notes": "Any other important medical notes from conversation (or null if none)"
}}

IMPORTANT FORMATTING:
- Keep treatment, tests, prescription, and next_steps as brief bullet points using • symbol
- Each bullet on a new line
- Maximum 2-4 bullets per section
- Be specific but concise
- Set to null if not mentioned in the conversation"""

            full_prompt = f"{system_prompt}\n\n{user_prompt}"

            response = self.text_model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    response_mime_type="application/json"
                )
            )

            result = json.loads(response.text)

            # Clean markdown formatting from all fields
            for key in result:
                if isinstance(result[key], str):
                    result[key] = clean_markdown_formatting(result[key])

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

            full_prompt = f"{system_prompt}\n\n{user_prompt}"

            response = self.text_model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.4,
                    response_mime_type="application/json"
                )
            )

            result = json.loads(response.text)

            # Clean markdown formatting from all string fields
            def clean_dict(obj):
                if isinstance(obj, dict):
                    return {k: clean_dict(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [clean_dict(item) for item in obj]
                elif isinstance(obj, str):
                    return clean_markdown_formatting(obj)
                return obj

            result = clean_dict(result)
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

            full_prompt = f"{system_prompt}\n\n{user_prompt}"

            response = self.text_model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    response_mime_type="application/json"
                )
            )

            result = json.loads(response.text)

            # Clean markdown formatting from all fields
            for key in result:
                if isinstance(result[key], str):
                    result[key] = clean_markdown_formatting(result[key])

            return result

        except Exception as e:
            raise Exception(f"Failed to translate consultation: {str(e)}")

    def translate_consultation_to_hindi(self, consultation_content: dict) -> dict:
        """
        Translate consultation/summary report content to Hindi while keeping medical terms in English.
        """
        try:
            system_prompt = """You are a medical translator. Translate medical consultation content to Hindi while keeping medical terms in English.

IMPORTANT RULES:
- Keep medical terms, medication names, test names, and disease names in ENGLISH
- Translate all explanations and general text to HINDI
- Use natural Hindi that patients can easily understand
- Mix English medical terms naturally within Hindi sentences"""

            user_prompt = f"""Translate this medical consultation to Hindi (keeping medical terms in English):

Symptoms: {consultation_content.get('symptoms', 'N/A')}
Diagnosis: {consultation_content.get('diagnosis', 'N/A')}
Treatment: {consultation_content.get('treatment', 'N/A')}
Tests: {consultation_content.get('tests', 'N/A')}
Prescription: {consultation_content.get('prescription', 'N/A')}
Next Steps: {consultation_content.get('next_steps', 'N/A')}

IMPORTANT: Return JSON with these exact lowercase field names:
{{
    "symptoms": "translated symptoms in Hindi",
    "diagnosis": "translated diagnosis in Hindi",
    "treatment": "translated treatment in Hindi",
    "tests": "translated tests in Hindi",
    "prescription": "translated prescription in Hindi",
    "next_steps": "translated next steps in Hindi"
}}"""

            full_prompt = f"{system_prompt}\n\n{user_prompt}"

            response = self.text_model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    response_mime_type="application/json"
                )
            )

            result = json.loads(response.text)

            # Clean markdown formatting from all fields
            for key in result:
                if isinstance(result[key], str):
                    result[key] = clean_markdown_formatting(result[key])

            return result

        except Exception as e:
            raise Exception(f"Failed to translate consultation to Hindi: {str(e)}")

    def generate_gujarati_voice_summary(self, consultation_content: dict) -> bytes:
        """
        Generate Gujarati voice audio for medical summary using Gemini TTS.
        Returns audio bytes in MP3 format.

        Args:
            consultation_content: Dictionary with symptoms, diagnosis, treatment, etc.

        Returns:
            Audio bytes (MP3 format)
        """
        try:
            # Initialize TTS model
            tts_model = genai.GenerativeModel('gemini-2.5-flash-tts')

            # Create natural Gujarati script with medical terms in English
            gujarati_script = f"""
તમારા સ્વાસ્થ્ય સંબંધી માહિતી આ છે:

લક્ષણો: {consultation_content.get('symptoms', 'કોઈ માહિતી નથી')}

નિદાન: {consultation_content.get('diagnosis', 'કોઈ માહિતી નથી')}

સારવાર: {consultation_content.get('treatment', 'કોઈ માહિતી નથી')}

પરીક્ષણો: {consultation_content.get('tests', 'કોઈ જરૂરી નથી')}

દવાઓ: {consultation_content.get('prescription', 'કોઈ જરૂરી નથી')}

આગળના પગલાં: {consultation_content.get('next_steps', 'કોઈ માહિતી નથી')}

આપનું સ્વાસ્થ્ય સારું રહે. આભાર.
"""

            # Generate audio with natural, empathetic tone
            prompt = f"""Generate natural, clear Gujarati speech for this medical summary.

Instructions:
- Speak in a warm, empathetic, professional tone
- Pronounce medical terms in English clearly
- Speak at a moderate, easy-to-understand pace
- Sound reassuring and supportive

Text to speak:
{gujarati_script}"""

            # NOTE: Gemini TTS requires Google AI Studio API with audio generation
            # which is not yet available in the current google-generativeai package
            # For now, we'll use the client-side TTS (react-native-tts) with Gujarati translation
            # which is already working in the app

            raise Exception("Server-side TTS not available. Please use the 🔊 Speaker button with Gujarati translation instead.")

        except Exception as e:
            print(f"TTS generation error: {str(e)}")
            raise Exception(f"Failed to generate Gujarati voice: {str(e)}")

    def conduct_symptom_interview(self, conversation_history: list, language: str = "en") -> dict:
        """
        Conduct an intelligent symptom interview with the patient.
        Asks follow-up questions based on previous responses (max 6 questions).

        Args:
            conversation_history: List of {role: "assistant"|"user", content: str}
            language: Language code (en, gu, hi)

        Returns:
            {
                "next_question": str (if not complete),
                "is_complete": bool,
                "summary": str (if complete)
            }
        """
        try:
            # Count how many questions have been asked
            assistant_messages = [msg for msg in conversation_history if msg.get('role') == 'assistant']
            questions_asked = len(assistant_messages)

            # Greeting messages in different languages
            greetings = {
                "en": "Thank you for contacting me. Please describe your symptoms, so I can help you.",
                "gu": "મારો સંપર્ક કરવા બદલ આભાર. કૃપા કરીને તમારા લક્ષણો વર્ણવો, જેથી હું તમને મદદ કરી શકું.",
                "hi": "मुझसे संपर्क करने के लिए धन्यवाद। कृपया अपने लक्षणों का वर्णन करें, ताकि मैं आपकी मदद कर सकूं।"
            }

            # If this is the start, return greeting
            if questions_asked == 0:
                return {
                    "next_question": greetings.get(language, greetings["en"]),
                    "is_complete": False,
                    "summary": None
                }

            # If we've asked 6 questions, generate summary
            if questions_asked >= 6:
                system_prompt = """You are a medical AI assistant. Based on the conversation with the patient,
generate a comprehensive symptoms summary that captures all relevant medical information discussed.

Be thorough but concise. Include:
- Main symptoms and their characteristics (severity, duration, location)
- Associated symptoms
- Aggravating/relieving factors
- Timeline and progression
- Any relevant patient concerns

Format the summary as a clear, professional medical description."""

                conversation_text = "\n".join([
                    f"{'Assistant' if msg['role'] == 'assistant' else 'Patient'}: {msg['content']}"
                    for msg in conversation_history
                ])

                user_prompt = f"""Based on this conversation, generate a comprehensive symptoms summary:

{conversation_text}

Provide a clear, detailed symptoms summary that a doctor can use to understand the patient's condition."""

                full_prompt = f"{system_prompt}\n\n{user_prompt}"

                response = self.text_model.generate_content(
                    full_prompt,
                    generation_config=genai.GenerationConfig(
                        temperature=0.4
                    )
                )

                summary = response.text.strip()

                return {
                    "next_question": None,
                    "is_complete": True,
                    "summary": summary
                }

            # Language instructions
            language_instructions = {
                "en": "Ask the question in English.",
                "gu": "Ask the question in Gujarati (ગુજરાતી). Keep medical terms in English but write the rest in Gujarati script.",
                "hi": "Ask the question in Hindi (हिंदी). Keep medical terms in English but write the rest in Hindi script."
            }

            # Generate intelligent follow-up question
            system_prompt = f"""You are a medical AI assistant conducting a symptom assessment interview.
Your role is to ask relevant follow-up questions to better understand the patient's condition.

Guidelines:
- Ask ONE specific, focused question at a time
- Base your question on what the patient has already shared
- Ask about important medical details like:
  * Severity and intensity
  * Duration and onset
  * Location and radiation
  * Aggravating/relieving factors
  * Associated symptoms
  * Impact on daily activities
  * Previous episodes or treatments tried
- Be empathetic and professional
- Keep questions clear and easy to understand
- Avoid medical jargon when possible

IMPORTANT: {language_instructions.get(language, language_instructions["en"])}"""

            conversation_text = "\n".join([
                f"{'You' if msg['role'] == 'assistant' else 'Patient'}: {msg['content']}"
                for msg in conversation_history
            ])

            user_prompt = f"""Based on this conversation so far, ask ONE relevant follow-up question to better understand the patient's symptoms:

{conversation_text}

This is question {questions_asked + 1} of 6. Make it count by asking about the most important missing information.

Remember: {language_instructions.get(language, language_instructions["en"])}

Provide ONLY the question, no other text."""

            full_prompt = f"{system_prompt}\n\n{user_prompt}"

            response = self.text_model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.5
                )
            )

            next_question = response.text.strip()

            return {
                "next_question": next_question,
                "is_complete": False,
                "summary": None
            }

        except Exception as e:
            raise Exception(f"Failed to conduct symptom interview: {str(e)}")

    def extract_vitals_from_conversation(self, conversation_text: str, current_date: str = None) -> dict:
        """
        Extract vital signs from patient's conversational input.
        Handles natural language like "My blood pressure was 120/80 yesterday" or
        "I measured my weight this morning, it was 75 kg".

        Args:
            conversation_text: Patient's natural language description of vitals
            current_date: Current date in YYYY-MM-DD format for relative date parsing

        Returns:
            Dictionary with:
            - vitals: List of vital measurements with dates
            - needs_clarification: Boolean indicating if AI needs more info
            - clarification_question: Question to ask patient if clarification needed
        """
        try:
            system_prompt = """You are a medical AI assistant helping patients log their vital signs.
Extract vital measurements from the patient's natural language input.

Vital signs to look for:
- Blood pressure (systolic/diastolic)
- Heart rate / Pulse
- Temperature
- Weight
- Height
- Oxygen level / SpO2
- Respiratory rate
- Blood glucose / sugar level
- BMI
- Pain level (0-10 scale)

Date handling:
- If patient mentions "today", "this morning", "tonight" - use current_date
- If patient mentions "yesterday" - use current_date minus 1 day
- If patient mentions specific dates like "December 25" or "last Monday" - calculate the actual date
- If no date mentioned, assume current_date

Be conversational and helpful. If information is unclear or incomplete, ask for clarification."""

            user_prompt = f"""Current date: {current_date}

Patient says: "{conversation_text}"

Extract all vital measurements and respond in JSON format:
{{
    "vitals": [
        {{
            "date": "YYYY-MM-DD",
            "blood_pressure_sys": 120,  // or null
            "blood_pressure_dia": 80,   // or null
            "heart_rate": 72,           // or null
            "temperature": 98.6,        // or null
            "weight": 70.5,             // or null
            "height": 170,              // or null
            "oxygen_level": 98,         // or null
            "respiratory_rate": 16,     // or null
            "glucose_level": 100,       // or null
            "pain_level": 3             // or null
        }}
    ],
    "needs_clarification": false,  // true if you need more info
    "clarification_question": null,  // question to ask if needs_clarification is true
    "friendly_confirmation": "I've recorded your blood pressure of 120/80 from yesterday."  // friendly confirmation message
}}

Guidelines:
- Extract only values explicitly mentioned
- Set null for values not mentioned
- If multiple measurements with different dates, create separate entries in vitals array
- If unclear or ambiguous, set needs_clarification to true and provide a clarification_question
- Always provide a friendly_confirmation message summarizing what was recorded"""

            full_prompt = f"{system_prompt}\n\n{user_prompt}"

            response = self.text_model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    response_mime_type="application/json"
                )
            )

            result = json.loads(response.text)
            return result

        except Exception as e:
            raise Exception(f"Failed to extract vitals from conversation: {str(e)}")


# Create singleton instance
gemini_service = GeminiService()
