import { Platform } from 'react-native';

// Android emulator needs 10.0.2.2 to access host machine's localhost
const getDevBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  // For web and iOS, use localhost
  return 'http://localhost:8000';
};

export const API_CONFIG = {
  BASE_URL: 'https://healthbridgeai.duckdns.org',
  TIMEOUT: 90000, // 90 seconds for AI/translation operations
};

export const API_ENDPOINTS = {
  // ============================================================================
  // AUTH
  // ============================================================================
  GOOGLE_LOGIN: '/api/auth/google',
  PHONE_SEND_CODE: '/api/auth/phone/send-code',
  PHONE_VERIFY: '/api/auth/phone/verify',
  PHONE_DIRECT_LOGIN: '/api/auth/phone/direct-login',

  // ============================================================================
  // PROFILE (Patient)
  // ============================================================================
  PROFILE: '/api/profile/',
  TRANSCRIBE_VOICE: '/api/profile/transcribe-voice',
  PARSE_VOICE_PROFILE: '/api/profile/parse-voice-profile',
  PATIENT_TIMELINE: '/api/profile/timeline',
  HEALTH_INSIGHTS: '/api/profile/insights',

  // ============================================================================
  // ENCOUNTERS
  // ============================================================================
  AVAILABLE_DOCTORS: '/api/encounters/available-doctors',
  ENCOUNTERS: '/api/encounters/',
  ENCOUNTER_DETAIL: (id: string) => `/api/encounters/${id}`,
  ASSIGN_DOCTOR: (id: string) => `/api/encounters/${id}/assign-doctor`,

  // Vitals
  ENCOUNTER_VITALS: (id: string) => `/api/encounters/${id}/vitals/`,

  // Lab Results
  ENCOUNTER_LAB_RESULTS: (id: string) => `/api/encounters/${id}/lab-results/`,

  // Summary Reports
  ENCOUNTER_SUMMARY: (id: string) => `/api/encounters/${id}/summary`,
  UPDATE_PATIENT_SYMPTOMS: (id: string) => `/api/encounters/${id}/summary/symptoms`,
  GENERATE_SUMMARY: (id: string) => `/api/encounters/${id}/generate-summary`,
  TRANSLATE_SUMMARY: (id: string) => `/api/encounters/${id}/translate-summary`,

  // Media Files
  ENCOUNTER_MEDIA: (id: string) => `/api/encounters/${id}/media`,
  ENCOUNTER_MEDIA_FILE: (encounterId: string, fileId: string) =>
    `/api/encounters/${encounterId}/media/${fileId}`,

  // Voice Processing
  VOICE_TRANSCRIBE: '/api/encounters/voice/transcribe',
  PROCESS_VOICE: (id: string) => `/api/encounters/${id}/process-voice`,
  VITALS_ANALYSIS: (id: string) => `/api/encounters/${id}/vitals-analysis/`,
  EXTRACT_REPORT_FIELDS: (id: string) => `/api/encounters/${id}/extract-report-fields`,
  START_CALL: (id: string) => `/api/encounters/${id}/start-call`,
  PROCESS_CALL_RECORDING: (id: string) => `/api/encounters/${id}/process-call-recording`,

  // Labs and Pharmacies
  AVAILABLE_LABS: '/api/encounters/labs',
  AVAILABLE_PHARMACIES: '/api/encounters/pharmacies',
  CREATE_LAB_ORDER: (encounterId: string) => `/api/encounters/${encounterId}/lab-orders`,
  CREATE_PRESCRIPTION: (encounterId: string) => `/api/encounters/${encounterId}/prescriptions`,

  // ============================================================================
  // DOCTOR PORTAL
  // ============================================================================
  DOCTOR_PROFILE: '/api/doctor/profile/',
  DOCTOR_MY_PATIENTS: '/api/doctor/patients/my-patients',
  DOCTOR_SEARCH_PATIENTS: '/api/doctor/patients/search',
  DOCTOR_PATIENT_PROFILE: (id: string) => `/api/doctor/patients/${id}`,
  DOCTOR_PATIENT_TIMELINE: (id: string) => `/api/doctor/patients/${id}/timeline`,
  DOCTOR_PATIENT_DOCUMENTS: (id: string) => `/api/doctor/patients/${id}/documents`,
  DOCTOR_PENDING_REPORTS: '/api/doctor/reports/pending',
  DOCTOR_REVIEWED_REPORTS: '/api/doctor/reports/my-reviewed',
  DOCTOR_STATS: '/api/doctor/stats',
  SEARCH_DOCTORS: '/api/doctor/search-public',
  CREATE_BASIC_DOCTOR: '/api/doctor/create-basic',

  // ============================================================================
  // LAB PORTAL
  // ============================================================================
  LAB_ORDERS: '/api/lab/orders',
  LAB_ORDER_DETAIL: (id: string) => `/api/lab/orders/${id}`,
  LAB_ORDER_PATIENT_INFO: (id: string) => `/api/lab/orders/${id}/patient-info`,
  LAB_STATS: '/api/lab/stats',

  // ============================================================================
  // PHARMACY PORTAL
  // ============================================================================
  PHARMACY_PRESCRIPTIONS: '/api/pharmacy/prescriptions',
  PHARMACY_PRESCRIPTION_DETAIL: (id: string) => `/api/pharmacy/prescriptions/${id}`,
  PHARMACY_PRESCRIPTION_PATIENT_INFO: (id: string) =>
    `/api/pharmacy/prescriptions/${id}/patient-info`,
  PHARMACY_STATS: '/api/pharmacy/stats',

  // ============================================================================
  // ADMIN PORTAL
  // ============================================================================
  ADMIN_CREATE_DOCTOR: '/api/admin/professionals/doctors',
  ADMIN_CREATE_LAB: '/api/admin/professionals/labs',
  ADMIN_CREATE_PHARMACY: '/api/admin/professionals/pharmacies',
  ADMIN_USERS: '/api/admin/users',
  ADMIN_USER_ACTIVATE: (id: string) => `/api/admin/users/${id}/activate`,
  ADMIN_USER_DEACTIVATE: (id: string) => `/api/admin/users/${id}/deactivate`,
  ADMIN_USER_DELETE: (id: string) => `/api/admin/users/${id}`,
  ADMIN_STATS: '/api/admin/stats',
  ADMIN_DOCTORS: '/api/admin/doctors',
  ADMIN_LABS: '/api/admin/labs',
  ADMIN_PHARMACIES: '/api/admin/pharmacies',

  // ============================================================================
  // HEALTH ASSISTANT
  // ============================================================================
  HEALTH_ASSISTANT_INTERVIEW: '/api/health-assistant/interview',
  HEALTH_ASSISTANT_REPORT_VITALS: '/api/health-assistant/report-vitals',
  BULK_VITALS_RECORD: '/api/health-assistant/bulk-vitals-record',

  // ============================================================================
  // REFERRALS (Doctor-to-Doctor)
  // ============================================================================
  REFERRALS: '/api/referrals/',
  REFERRALS_MADE: '/api/referrals/my-referrals-made',
  REFERRALS_RECEIVED: '/api/referrals/my-referrals-received',
  REFERRALS_PATIENT: '/api/referrals/my-referrals',
  REFERRAL_DETAIL: (id: string) => `/api/referrals/${id}`,
  REFERRAL_PATIENT: (patientId: string) => `/api/referrals/patient/${patientId}`,
  REFERRAL_ACCEPT: (id: string) => `/api/referrals/${id}/accept`,
  REFERRAL_DECLINE: (id: string) => `/api/referrals/${id}/decline`,
  REFERRAL_LINK_APPOINTMENT: (id: string) => `/api/referrals/${id}/link-appointment`,
  REFERRAL_COMPLETE: (id: string) => `/api/referrals/${id}/complete`,
  REFERRAL_STATS: '/api/referrals/stats/summary',
};
