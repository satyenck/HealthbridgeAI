import apiService from './apiService';
import {API_ENDPOINTS} from '../config/api';
import {Prescription, OrderStatus, PatientProfile} from '../types';

export interface PrescriptionWithPatient extends Prescription {
  patient_info?: PatientProfile;
}

export interface PharmacyStats {
  total_prescriptions: number;
  pending_prescriptions: number;
  completed_prescriptions: number;
  prescriptions_this_month: number;
}

export const pharmacyService = {
  /**
   * Get all prescriptions (optionally filtered by status)
   */
  async getPrescriptions(status?: OrderStatus): Promise<Prescription[]> {
    const url = status
      ? `${API_ENDPOINTS.PHARMACY_PRESCRIPTIONS}?status=${status}`
      : API_ENDPOINTS.PHARMACY_PRESCRIPTIONS;
    return await apiService.get<Prescription[]>(url);
  },

  /**
   * Get specific prescription details
   */
  async getPrescriptionDetail(prescriptionId: string): Promise<Prescription> {
    return await apiService.get<Prescription>(
      API_ENDPOINTS.PHARMACY_PRESCRIPTION_DETAIL(prescriptionId),
    );
  },

  /**
   * Get patient info for a prescription
   */
  async getPrescriptionPatientInfo(
    prescriptionId: string,
  ): Promise<PatientProfile> {
    return await apiService.get<PatientProfile>(
      API_ENDPOINTS.PHARMACY_PRESCRIPTION_PATIENT_INFO(prescriptionId),
    );
  },

  /**
   * Update prescription status
   */
  async updatePrescriptionStatus(
    prescriptionId: string,
    status: OrderStatus,
  ): Promise<Prescription> {
    return await apiService.patch<Prescription>(
      API_ENDPOINTS.PHARMACY_PRESCRIPTION_DETAIL(prescriptionId),
      {status},
    );
  },

  /**
   * Mark prescription as fulfilled
   */
  async fulfillPrescription(prescriptionId: string): Promise<Prescription> {
    return await this.updatePrescriptionStatus(
      prescriptionId,
      OrderStatus.COMPLETED,
    );
  },

  /**
   * Get pharmacy statistics
   */
  async getStats(): Promise<PharmacyStats> {
    return await apiService.get<PharmacyStats>(API_ENDPOINTS.PHARMACY_STATS);
  },
};
