/**
 * Video Consultation Service
 * Handles all video consultation API calls
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://healthbridgeai.duckdns.org/api';

// Get auth token
const getAuthToken = async () => {
  const token = await AsyncStorage.getItem('access_token');
  return token;
};

// Get headers with auth
const getHeaders = async () => {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export interface VideoConsultationCreate {
  doctor_id: string;
  scheduled_start_time: string; // ISO 8601 format
  duration_minutes: number;
  patient_notes?: string;
  patient_id?: string; // Required when doctor schedules for patient
  encounter_id?: string; // Link to existing encounter (e.g., from pending report)
}

export interface VideoConsultation {
  consultation_id: string;
  encounter_id: string;
  patient_id: string;
  doctor_id?: string;
  scheduled_start_time: string;
  scheduled_end_time?: string;
  duration_minutes: number;
  status: 'SCHEDULED' | 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  channel_name: string;
  recording_url?: string;
  transcription_text?: string;
  patient_notes?: string;
  doctor_notes?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface VideoCallCredentials {
  app_id: string;
  channel_name: string;
  token: string;
  uid: number;
  consultation_id: string;
  call_url: string;
}

export interface VideoConsultationStats {
  total_scheduled: number;
  total_completed: number;
  total_cancelled: number;
  total_no_show: number;
  upcoming_count: number;
  average_duration_minutes: number;
}

/**
 * Schedule a new video consultation (Patient only)
 */
export const scheduleConsultation = async (
  data: VideoConsultationCreate
): Promise<VideoConsultation> => {
  const headers = await getHeaders();
  const response = await axios.post(`${API_URL}/video-consultations/`, data, { headers });
  return response.data;
};

/**
 * Get my video consultations (Patient or Doctor)
 */
export const getMyConsultations = async (params?: {
  status_filter?: string;
  upcoming_only?: boolean;
  limit?: number;
}): Promise<VideoConsultation[]> => {
  const headers = await getHeaders();
  const response = await axios.get(`${API_URL}/video-consultations/my-consultations`, {
    headers,
    params,
  });
  return response.data;
};

/**
 * Get video consultation details by ID
 */
export const getConsultationById = async (consultationId: string): Promise<VideoConsultation> => {
  const headers = await getHeaders();
  const response = await axios.get(`${API_URL}/video-consultations/${consultationId}`, { headers });
  return response.data;
};

/**
 * Join video call - Get Agora credentials
 */
export const joinVideoCall = async (
  consultationId: string,
  userType: 'patient' | 'doctor'
): Promise<VideoCallCredentials> => {
  const headers = await getHeaders();
  const response = await axios.post(
    `${API_URL}/video-consultations/${consultationId}/join`,
    { user_type: userType },
    { headers }
  );
  return response.data;
};

/**
 * End video call
 */
export const endVideoCall = async (consultationId: string): Promise<{ message: string }> => {
  const headers = await getHeaders();
  const response = await axios.post(
    `${API_URL}/video-consultations/${consultationId}/end`,
    {},
    { headers }
  );
  return response.data;
};

/**
 * Cancel consultation
 */
export const cancelConsultation = async (
  consultationId: string,
  reason: string
): Promise<{ message: string }> => {
  const headers = await getHeaders();
  const response = await axios.post(
    `${API_URL}/video-consultations/${consultationId}/cancel`,
    { cancellation_reason: reason },
    { headers }
  );
  return response.data;
};

/**
 * Process recording (Doctor only)
 */
export const processRecording = async (
  consultationId: string,
  recordingUrl: string
): Promise<{ message: string }> => {
  const headers = await getHeaders();
  const response = await axios.post(
    `${API_URL}/video-consultations/${consultationId}/process-recording`,
    { recording_url: recordingUrl },
    { headers }
  );
  return response.data;
};

/**
 * Get consultation statistics (Doctor only)
 */
export const getMyStats = async (): Promise<VideoConsultationStats> => {
  const headers = await getHeaders();
  const response = await axios.get(`${API_URL}/video-consultations/stats/my-stats`, { headers });
  return response.data;
};
