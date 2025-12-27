import apiService from './apiService';
import {API_ENDPOINTS} from '../config/api';
import {LabOrder, OrderStatus, PatientProfile} from '../types';

export interface LabOrderWithPatient extends LabOrder {
  patient_info?: PatientProfile;
}

export interface LabStats {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  orders_this_month: number;
}

export const labService = {
  /**
   * Get all lab orders (optionally filtered by status)
   */
  async getOrders(status?: OrderStatus): Promise<LabOrder[]> {
    const url = status
      ? `${API_ENDPOINTS.LAB_ORDERS}?status=${status}`
      : API_ENDPOINTS.LAB_ORDERS;
    return await apiService.get<LabOrder[]>(url);
  },

  /**
   * Get specific lab order details
   */
  async getOrderDetail(orderId: string): Promise<LabOrder> {
    return await apiService.get<LabOrder>(
      API_ENDPOINTS.LAB_ORDER_DETAIL(orderId),
    );
  },

  /**
   * Get patient info for a lab order
   */
  async getOrderPatientInfo(orderId: string): Promise<PatientProfile> {
    return await apiService.get<PatientProfile>(
      API_ENDPOINTS.LAB_ORDER_PATIENT_INFO(orderId),
    );
  },

  /**
   * Update lab order status
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<LabOrder> {
    return await apiService.patch<LabOrder>(
      API_ENDPOINTS.LAB_ORDER_DETAIL(orderId),
      {status},
    );
  },

  /**
   * Upload lab results for an order
   * This typically involves updating the encounter's lab results
   */
  async uploadResults(
    orderId: string,
    metrics: Record<string, any>,
  ): Promise<{message: string}> {
    // Note: This would typically involve:
    // 1. Getting the encounter_id from the order
    // 2. Posting lab results to that encounter
    // 3. Updating the order status to COMPLETED
    return await apiService.post(
      `${API_ENDPOINTS.LAB_ORDER_DETAIL(orderId)}/upload-results`,
      {metrics},
    );
  },

  /**
   * Get lab statistics
   */
  async getStats(): Promise<LabStats> {
    return await apiService.get<LabStats>(API_ENDPOINTS.LAB_STATS);
  },
};
