import apiService from './apiService';
import {API_ENDPOINTS} from '../config/api';
import {
  PatientProfile,
  VoiceTranscriptionRequest,
  VoiceTranscriptionResponse,
} from '../types';

export const profileService = {
  /**
   * Get current patient's profile
   */
  async getProfile(): Promise<PatientProfile> {
    return await apiService.get<PatientProfile>(API_ENDPOINTS.PROFILE);
  },

  /**
   * Create patient profile
   */
  async createProfile(data: Omit<PatientProfile, 'user_id' | 'created_at' | 'updated_at'>): Promise<PatientProfile> {
    return await apiService.post<PatientProfile>(API_ENDPOINTS.PROFILE, data);
  },

  /**
   * Update patient profile
   */
  async updateProfile(
    data: Partial<Omit<PatientProfile, 'user_id' | 'created_at' | 'updated_at'>>,
  ): Promise<PatientProfile> {
    return await apiService.put<PatientProfile>(API_ENDPOINTS.PROFILE, data);
  },

  /**
   * Delete patient profile
   */
  async deleteProfile(): Promise<{message: string}> {
    return await apiService.delete<{message: string}>(API_ENDPOINTS.PROFILE);
  },

  /**
   * Transcribe voice recording (for profile creation/update)
   */
  async transcribeVoice(
    audioBase64: string,
  ): Promise<VoiceTranscriptionResponse> {
    return await apiService.post<VoiceTranscriptionResponse>(
      API_ENDPOINTS.TRANSCRIBE_VOICE,
      {audio_base64: audioBase64} as VoiceTranscriptionRequest,
    );
  },

  /**
   * Parse voice recording into profile fields
   */
  async parseVoiceProfile(audioBase64: string): Promise<{
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    gender?: string;
    general_health_issues?: string;
  }> {
    return await apiService.post(API_ENDPOINTS.PARSE_VOICE_PROFILE, {
      audio_base64: audioBase64,
    });
  },
};
