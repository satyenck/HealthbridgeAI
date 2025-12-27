import apiService from './apiService';
import {API_ENDPOINTS} from '../config/api';
import {
  PatientProfile,
  PatientTimeline,
  SummaryReport,
  SystemStats,
  DoctorProfile,
} from '../types';

export interface PatientSearchResult {
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
}

export interface DoctorStats {
  total_patients: number;
  consultations: number;
  pending_reports: number;
  reviewed_reports: number;
}

export const doctorService = {
  /**
   * Get doctor's own profile
   */
  async getProfile(): Promise<DoctorProfile> {
    return await apiService.get<DoctorProfile>(API_ENDPOINTS.DOCTOR_PROFILE);
  },

  /**
   * Get list of patients this doctor has reviewed
   */
  async getMyPatients(): Promise<PatientProfile[]> {
    return await apiService.get<PatientProfile[]>(API_ENDPOINTS.DOCTOR_MY_PATIENTS);
  },

  /**
   * Search for patients by name
   */
  async searchPatients(query: string): Promise<PatientSearchResult[]> {
    return await apiService.get<PatientSearchResult[]>(
      `${API_ENDPOINTS.DOCTOR_SEARCH_PATIENTS}?query=${encodeURIComponent(query)}`,
    );
  },

  /**
   * Get patient profile
   */
  async getPatientProfile(patientId: string): Promise<PatientProfile> {
    return await apiService.get<PatientProfile>(
      API_ENDPOINTS.DOCTOR_PATIENT_PROFILE(patientId),
    );
  },

  /**
   * Get patient timeline with comprehensive encounter data and vitals trends
   */
  async getPatientTimeline(patientId: string): Promise<PatientTimeline> {
    return await apiService.get<PatientTimeline>(
      API_ENDPOINTS.DOCTOR_PATIENT_TIMELINE(patientId),
    );
  },

  /**
   * Get pending reports that need doctor review
   */
  async getPendingReports(): Promise<SummaryReport[]> {
    return await apiService.get<SummaryReport[]>(
      API_ENDPOINTS.DOCTOR_PENDING_REPORTS,
    );
  },

  /**
   * Get reports reviewed by current doctor
   */
  async getReviewedReports(): Promise<SummaryReport[]> {
    return await apiService.get<SummaryReport[]>(
      API_ENDPOINTS.DOCTOR_REVIEWED_REPORTS,
    );
  },

  /**
   * Get doctor statistics
   */
  async getStats(): Promise<DoctorStats> {
    return await apiService.get<DoctorStats>(API_ENDPOINTS.DOCTOR_STATS);
  },
};
