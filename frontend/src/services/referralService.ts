/**
 * Referral Service
 *
 * Handles all API calls related to doctor-to-doctor patient referrals
 */

import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

export interface Referral {
  referral_id: string;
  patient_id: string;
  patient_name: string;
  patient_phone?: string;
  referring_doctor_id: string;
  referring_doctor_name: string;
  referring_doctor_specialty?: string;
  referred_to_doctor_id: string;
  referred_to_doctor_name: string;
  reason: string;
  clinical_notes?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  specialty_needed?: string;
  status: 'PENDING' | 'ACCEPTED' | 'APPOINTMENT_SCHEDULED' | 'COMPLETED' | 'DECLINED' | 'CANCELLED';
  appointment_scheduled_time?: string;
  appointment_completed_time?: string;
  referred_doctor_notes?: string;
  declined_reason?: string;
  patient_viewed: boolean;
  referred_doctor_viewed: boolean;
  created_at: string;
  updated_at: string;
  has_appointment: boolean;
  appointment_encounter_id?: string;
  source_encounter_id?: string;
}

export interface ReferralCreate {
  patient_id: string;
  referred_to_doctor_id: string;
  reason: string;
  clinical_notes?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  specialty_needed?: string;
  source_encounter_id?: string;
}

export interface ReferralStats {
  total_pending: number;
  total_accepted: number;
  total_completed: number;
  unread_count: number;
}

class ReferralService {
  /**
   * Create a new referral (Doctor DA refers patient to Doctor DB)
   */
  async createReferral(data: ReferralCreate): Promise<Referral> {
    const response = await apiService.post(API_ENDPOINTS.REFERRALS, data);
    return response.data;
  }

  /**
   * Get all referrals made by current doctor (Doctor DA's view)
   */
  async getReferralsMade(): Promise<Referral[]> {
    const response = await apiService.get(API_ENDPOINTS.REFERRALS_MADE);
    return response.data;
  }

  /**
   * Get all referrals received by current doctor (Doctor DB's view)
   */
  async getReferralsReceived(): Promise<Referral[]> {
    const response = await apiService.get(API_ENDPOINTS.REFERRALS_RECEIVED);
    return response.data;
  }

  /**
   * Get all referrals for current patient
   */
  async getMyReferrals(): Promise<Referral[]> {
    const response = await apiService.get(API_ENDPOINTS.REFERRALS_PATIENT);
    return response.data;
  }

  /**
   * Get all referrals for a specific patient (for doctors)
   */
  async getPatientReferrals(patientId: string): Promise<Referral[]> {
    const response = await apiService.get(API_ENDPOINTS.REFERRAL_PATIENT(patientId));
    return response.data;
  }

  /**
   * Get detailed information about a specific referral
   */
  async getReferralDetail(referralId: string): Promise<Referral> {
    const response = await apiService.get(API_ENDPOINTS.REFERRAL_DETAIL(referralId));
    return response.data;
  }

  /**
   * Accept a referral (Doctor DB accepts referral)
   */
  async acceptReferral(referralId: string, notes?: string): Promise<void> {
    await apiService.patch(API_ENDPOINTS.REFERRAL_ACCEPT(referralId), { notes });
  }

  /**
   * Decline a referral (Doctor DB declines referral)
   */
  async declineReferral(referralId: string, reason: string): Promise<void> {
    await apiService.patch(API_ENDPOINTS.REFERRAL_DECLINE(referralId), { reason });
  }

  /**
   * Link an appointment/encounter to a referral
   */
  async linkAppointment(
    referralId: string,
    encounterId: string,
    scheduledTime: string
  ): Promise<void> {
    await apiService.patch(API_ENDPOINTS.REFERRAL_LINK_APPOINTMENT(referralId), {
      encounter_id: encounterId,
      scheduled_time: scheduledTime,
    });
  }

  /**
   * Mark referral as completed
   */
  async completeReferral(referralId: string): Promise<void> {
    await apiService.patch(API_ENDPOINTS.REFERRAL_COMPLETE(referralId));
  }

  /**
   * Get referral statistics for notifications
   */
  async getReferralStats(): Promise<ReferralStats> {
    const response = await apiService.get(API_ENDPOINTS.REFERRAL_STATS);
    return response.data;
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: Referral['status']): string {
    switch (status) {
      case 'PENDING':
        return '#FFA500'; // Orange
      case 'ACCEPTED':
        return '#4CAF50'; // Green
      case 'APPOINTMENT_SCHEDULED':
        return '#2196F3'; // Blue
      case 'COMPLETED':
        return '#4CAF50'; // Green
      case 'DECLINED':
        return '#F44336'; // Red
      case 'CANCELLED':
        return '#9E9E9E'; // Gray
      default:
        return '#757575'; // Default gray
    }
  }

  /**
   * Get status display text
   */
  getStatusText(status: Referral['status']): string {
    switch (status) {
      case 'PENDING':
        return 'Pending Response';
      case 'ACCEPTED':
        return 'Accepted';
      case 'APPOINTMENT_SCHEDULED':
        return 'Appointment Scheduled';
      case 'COMPLETED':
        return 'Completed';
      case 'DECLINED':
        return 'Declined';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  /**
   * Get priority color for UI
   */
  getPriorityColor(priority: Referral['priority']): string {
    switch (priority) {
      case 'HIGH':
        return '#F44336'; // Red
      case 'MEDIUM':
        return '#FF9800'; // Orange
      case 'LOW':
        return '#4CAF50'; // Green
      default:
        return '#757575'; // Gray
    }
  }
}

export default new ReferralService();
