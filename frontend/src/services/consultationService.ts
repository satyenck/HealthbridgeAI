import apiService from './apiService';
import {API_ENDPOINTS} from '../config/api';

export interface Consultation {
  id: number;
  user_id: number;
  patient_description: string;
  symptoms?: string;
  potential_diagnosis?: string;
  potential_treatment?: string;
  next_steps?: string;
  created_at: string;
}

export interface ConsultationCreateData {
  patient_description: string;
}

export const consultationService = {
  async createConsultation(
    data: ConsultationCreateData,
  ): Promise<Consultation> {
    return await apiService.post<Consultation>(
      API_ENDPOINTS.CONSULTATIONS,
      data,
    );
  },

  async getConsultations(): Promise<Consultation[]> {
    return await apiService.get<Consultation[]>(API_ENDPOINTS.CONSULTATIONS);
  },

  async getConsultation(id: number): Promise<Consultation> {
    return await apiService.get<Consultation>(
      `${API_ENDPOINTS.CONSULTATIONS}/${id}`,
    );
  },

  async transcribeDescription(
    audioBase64: string,
  ): Promise<{transcription: string}> {
    return await apiService.post(API_ENDPOINTS.TRANSCRIBE_DESCRIPTION, {
      audio_base64: audioBase64,
    });
  },
};
