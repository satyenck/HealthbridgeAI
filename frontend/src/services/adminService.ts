import apiService from './apiService';
import {API_ENDPOINTS} from '../config/api';
import {
  User,
  DoctorProfile,
  LabProfile,
  PharmacyProfile,
  SystemStats,
} from '../types';

export interface CreateDoctorRequest {
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  address: string;
  hospital_name?: string;
  specialty?: string;
  degree?: string;
  last_degree_year?: number;
}

export interface CreateLabRequest {
  email: string;
  phone: string;
  business_name: string;
  address: string;
  license_year?: number;
}

export interface CreatePharmacyRequest {
  email: string;
  phone: string;
  business_name: string;
  address: string;
  license_year?: number;
}

export const adminService = {
  // ============================================================================
  // CREATE PROFESSIONALS
  // ============================================================================

  /**
   * Create a new doctor account
   */
  async createDoctor(data: CreateDoctorRequest): Promise<DoctorProfile> {
    return await apiService.post<DoctorProfile>(
      API_ENDPOINTS.ADMIN_CREATE_DOCTOR,
      data,
    );
  },

  /**
   * Create a new lab account
   */
  async createLab(data: CreateLabRequest): Promise<LabProfile> {
    return await apiService.post<LabProfile>(
      API_ENDPOINTS.ADMIN_CREATE_LAB,
      data,
    );
  },

  /**
   * Create a new pharmacy account
   */
  async createPharmacy(data: CreatePharmacyRequest): Promise<PharmacyProfile> {
    return await apiService.post<PharmacyProfile>(
      API_ENDPOINTS.ADMIN_CREATE_PHARMACY,
      data,
    );
  },

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  /**
   * Get all users (optionally filtered by role and active status)
   */
  async getUsers(role?: string, isActive?: boolean): Promise<User[]> {
    let url = API_ENDPOINTS.ADMIN_USERS;
    const params: string[] = [];
    if (role) params.push(`role=${role}`);
    if (isActive !== undefined) params.push(`is_active=${isActive}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return await apiService.get<User[]>(url);
  },

  /**
   * Activate a user
   */
  async activateUser(userId: string): Promise<User> {
    return await apiService.post<User>(
      API_ENDPOINTS.ADMIN_USER_ACTIVATE(userId),
      {},
    );
  },

  /**
   * Deactivate a user
   */
  async deactivateUser(userId: string): Promise<User> {
    return await apiService.post<User>(
      API_ENDPOINTS.ADMIN_USER_DEACTIVATE(userId),
      {},
    );
  },

  /**
   * Delete a user permanently
   */
  async deleteUser(userId: string): Promise<{message: string}> {
    return await apiService.delete<{message: string}>(
      API_ENDPOINTS.ADMIN_USER_DELETE(userId),
    );
  },

  // ============================================================================
  // VIEW PROFESSIONALS
  // ============================================================================

  /**
   * Get all doctors
   */
  async getDoctors(): Promise<DoctorProfile[]> {
    return await apiService.get<DoctorProfile[]>(API_ENDPOINTS.ADMIN_DOCTORS);
  },

  /**
   * Get all labs
   */
  async getLabs(): Promise<LabProfile[]> {
    return await apiService.get<LabProfile[]>(API_ENDPOINTS.ADMIN_LABS);
  },

  /**
   * Get all pharmacies
   */
  async getPharmacies(): Promise<PharmacyProfile[]> {
    return await apiService.get<PharmacyProfile[]>(
      API_ENDPOINTS.ADMIN_PHARMACIES,
    );
  },

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get system-wide statistics
   */
  async getSystemStats(): Promise<SystemStats> {
    return await apiService.get<SystemStats>(API_ENDPOINTS.ADMIN_STATS);
  },
};
