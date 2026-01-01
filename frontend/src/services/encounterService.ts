import apiService from './apiService';
import {API_ENDPOINTS} from '../config/api';
import {
  Encounter,
  ComprehensiveEncounter,
  CreateEncounterRequest,
  CreateVitalsRequest,
  Vitals,
  CreateLabResultsRequest,
  LabResults,
  SummaryReport,
  CreateSummaryReportRequest,
  UpdateSummaryReportRequest,
  MediaFile,
  VoiceTranscriptionRequest,
  VoiceTranscriptionResponse,
  DoctorProfile,
  LabProfile,
  PharmacyProfile,
  LabOrder,
  Prescription,
} from '../types';

export const encounterService = {
  /**
   * Get list of available doctors for consultation
   */
  async getAvailableDoctors(specialty?: string): Promise<DoctorProfile[]> {
    const url = specialty
      ? `${API_ENDPOINTS.AVAILABLE_DOCTORS}?specialty=${specialty}`
      : API_ENDPOINTS.AVAILABLE_DOCTORS;
    return await apiService.get<DoctorProfile[]>(url);
  },

  /**
   * Create a new encounter
   */
  async createEncounter(data: CreateEncounterRequest): Promise<Encounter> {
    return await apiService.post<Encounter>(API_ENDPOINTS.ENCOUNTERS, data);
  },

  /**
   * Get list of encounters (optionally filtered by patient_id)
   */
  async getEncounters(patientId?: string): Promise<Encounter[]> {
    const url = patientId
      ? `${API_ENDPOINTS.ENCOUNTERS}?patient_id=${patientId}`
      : API_ENDPOINTS.ENCOUNTERS;
    return await apiService.get<Encounter[]>(url);
  },

  /**
   * Get comprehensive encounter details with all related data
   */
  async getEncounterDetail(
    encounterId: string,
  ): Promise<ComprehensiveEncounter> {
    return await apiService.get<ComprehensiveEncounter>(
      API_ENDPOINTS.ENCOUNTER_DETAIL(encounterId),
    );
  },

  /**
   * Assign a doctor to an encounter
   */
  async assignDoctor(
    encounterId: string,
    doctorId: string,
  ): Promise<Encounter> {
    return await apiService.patch<Encounter>(
      API_ENDPOINTS.ASSIGN_DOCTOR(encounterId),
      { doctor_id: doctorId },
    );
  },

  /**
   * Update encounter basic info
   */
  async updateEncounter(
    encounterId: string,
    data: Partial<Encounter>,
  ): Promise<Encounter> {
    return await apiService.patch<Encounter>(
      API_ENDPOINTS.ENCOUNTER_DETAIL(encounterId),
      data,
    );
  },

  /**
   * Delete an encounter
   */
  async deleteEncounter(encounterId: string): Promise<{message: string}> {
    return await apiService.delete<{message: string}>(
      API_ENDPOINTS.ENCOUNTER_DETAIL(encounterId),
    );
  },

  // ============================================================================
  // VITALS
  // ============================================================================

  /**
   * Add vitals to an encounter
   */
  async addVitals(data: CreateVitalsRequest): Promise<Vitals> {
    return await apiService.post<Vitals>(
      API_ENDPOINTS.ENCOUNTER_VITALS(data.encounter_id),
      data,
    );
  },

  /**
   * Get all vitals for an encounter
   */
  async getVitals(encounterId: string): Promise<Vitals[]> {
    return await apiService.get<Vitals[]>(
      API_ENDPOINTS.ENCOUNTER_VITALS(encounterId),
    );
  },

  // ============================================================================
  // LAB RESULTS
  // ============================================================================

  /**
   * Add lab results to an encounter
   */
  async addLabResults(data: CreateLabResultsRequest): Promise<LabResults> {
    return await apiService.post<LabResults>(
      API_ENDPOINTS.ENCOUNTER_LAB_RESULTS(data.encounter_id),
      data,
    );
  },

  /**
   * Get all lab results for an encounter
   */
  async getLabResults(encounterId: string): Promise<LabResults[]> {
    return await apiService.get<LabResults[]>(
      API_ENDPOINTS.ENCOUNTER_LAB_RESULTS(encounterId),
    );
  },

  // ============================================================================
  // SUMMARY REPORTS
  // ============================================================================

  /**
   * Create a summary report
   */
  async createSummaryReport(
    data: CreateSummaryReportRequest,
  ): Promise<SummaryReport> {
    return await apiService.post<SummaryReport>(
      API_ENDPOINTS.ENCOUNTER_SUMMARY(data.encounter_id),
      data,
    );
  },

  /**
   * Get summary report for an encounter
   */
  async getSummaryReport(encounterId: string): Promise<SummaryReport> {
    return await apiService.get<SummaryReport>(
      API_ENDPOINTS.ENCOUNTER_SUMMARY(encounterId),
    );
  },

  /**
   * Update summary report (typically by doctor)
   */
  async updateSummaryReport(
    encounterId: string,
    data: UpdateSummaryReportRequest,
  ): Promise<SummaryReport> {
    return await apiService.patch<SummaryReport>(
      API_ENDPOINTS.ENCOUNTER_SUMMARY(encounterId),
      data,
    );
  },

  /**
   * Update patient's own symptoms
   */
  async updatePatientSymptoms(
    encounterId: string,
    symptoms: string,
  ): Promise<SummaryReport> {
    return await apiService.patch<SummaryReport>(
      API_ENDPOINTS.UPDATE_PATIENT_SYMPTOMS(encounterId),
      { symptoms },
    );
  },

  /**
   * Generate AI summary report
   */
  async generateSummary(
    encounterId: string,
    patientDescription: string,
  ): Promise<SummaryReport> {
    return await apiService.post<SummaryReport>(
      API_ENDPOINTS.GENERATE_SUMMARY(encounterId),
      {patient_description: patientDescription},
    );
  },

  /**
   * Translate summary report to another language
   */
  async translateSummary(
    encounterId: string,
    language: string,
  ): Promise<SummaryReport> {
    return await apiService.post<SummaryReport>(
      API_ENDPOINTS.TRANSLATE_SUMMARY(encounterId),
      {language},
    );
  },

  // ============================================================================
  // MEDIA FILES
  // ============================================================================

  /**
   * Upload media files to an encounter
   */
  async uploadMedia(
    encounterId: string,
    files: Array<{uri: string; type: string; name: string}>,
  ): Promise<MediaFile[]> {
    return await apiService.uploadFile<MediaFile[]>(
      API_ENDPOINTS.ENCOUNTER_MEDIA(encounterId),
      files,
    );
  },

  /**
   * Get all media files for an encounter
   */
  async getMediaFiles(encounterId: string): Promise<MediaFile[]> {
    return await apiService.get<MediaFile[]>(
      API_ENDPOINTS.ENCOUNTER_MEDIA(encounterId),
    );
  },

  /**
   * Delete a media file
   */
  async deleteMediaFile(
    encounterId: string,
    fileId: string,
  ): Promise<{message: string}> {
    return await apiService.delete<{message: string}>(
      API_ENDPOINTS.ENCOUNTER_MEDIA_FILE(encounterId, fileId),
    );
  },

  // ============================================================================
  // VOICE PROCESSING
  // ============================================================================

  /**
   * Transcribe voice audio (standalone)
   */
  async transcribeVoice(
    audioBase64: string,
  ): Promise<VoiceTranscriptionResponse> {
    return await apiService.post<VoiceTranscriptionResponse>(
      API_ENDPOINTS.VOICE_TRANSCRIBE,
      {audio_base64: audioBase64} as VoiceTranscriptionRequest,
    );
  },

  /**
   * Process voice for an encounter (transcribe + generate summary)
   */
  async processVoiceEncounter(
    encounterId: string,
    audioBase64: string,
  ): Promise<{
    transcription: VoiceTranscriptionResponse;
    summary_report: SummaryReport;
  }> {
    return await apiService.post(API_ENDPOINTS.PROCESS_VOICE(encounterId), {
      audio_base64: audioBase64,
    });
  },

  /**
   * Analyze vitals with AI
   */
  async analyzeVitals(
    encounterId: string,
  ): Promise<{
    assessment: string;
    concerns: string[];
    recommendations: string[];
  }> {
    return await apiService.post(
      API_ENDPOINTS.VITALS_ANALYSIS(encounterId),
      {},
    );
  },

  /**
   * Extract report fields from doctor's voice recording
   */
  async extractReportFieldsFromVoice(
    encounterId: string,
    audioBase64: string,
  ): Promise<{
    transcription: string;
    extracted_fields: Partial<SummaryReportContent>;
    existing_content: SummaryReportContent | null;
  }> {
    return await apiService.post(
      API_ENDPOINTS.EXTRACT_REPORT_FIELDS(encounterId),
      {audio_base64: audioBase64},
    );
  },

  /**
   * Process call recording - transcribe and extract medical info
   */
  async processCallRecording(
    encounterId: string,
    audioBase64: string,
  ): Promise<{
    transcription: string;
    extracted_data: Partial<SummaryReportContent>;
  }> {
    return await apiService.post(
      API_ENDPOINTS.PROCESS_CALL_RECORDING(encounterId),
      {audio_base64: audioBase64},
    );
  },

  // ============================================================================
  // LABS AND PHARMACIES
  // ============================================================================

  /**
   * Get list of available labs
   */
  async getAvailableLabs(): Promise<LabProfile[]> {
    return await apiService.get<LabProfile[]>(API_ENDPOINTS.AVAILABLE_LABS);
  },

  /**
   * Get list of available pharmacies
   */
  async getAvailablePharmacies(): Promise<PharmacyProfile[]> {
    return await apiService.get<PharmacyProfile[]>(
      API_ENDPOINTS.AVAILABLE_PHARMACIES,
    );
  },

  /**
   * Create a lab order for an encounter
   */
  async createLabOrder(
    encounterId: string,
    labId: string,
    instructions: string,
  ): Promise<LabOrder> {
    return await apiService.post<LabOrder>(
      API_ENDPOINTS.CREATE_LAB_ORDER(encounterId),
      {
        lab_id: labId,
        instructions,
      },
    );
  },

  /**
   * Create a prescription for an encounter
   */
  async createPrescription(
    encounterId: string,
    pharmacyId: string,
    instructions: string,
  ): Promise<Prescription> {
    return await apiService.post<Prescription>(
      API_ENDPOINTS.CREATE_PRESCRIPTION(encounterId),
      {
        pharmacy_id: pharmacyId,
        instructions,
      },
    );
  },

};
