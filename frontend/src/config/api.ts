export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'http://localhost:8000'
    : 'https://your-production-api.com',
  TIMEOUT: 30000,
};

export const API_ENDPOINTS = {
  // ============================================================================
  // AUTH
  // ============================================================================
  GOOGLE_LOGIN: '/api/auth/google',
  PHONE_SEND_CODE: '/api/auth/phone/send-code',
  PHONE_VERIFY: '/api/auth/phone/verify',

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
  ENCOUNTER_MEDIA: (id: string) => `/api/encounters/${id}/media/`,
  ENCOUNTER_MEDIA_FILE: (encounterId: string, fileId: string) =>
    `/api/encounters/${encounterId}/media/${fileId}/`,

  // Voice Processing
  VOICE_TRANSCRIBE: '/api/encounters/voice/transcribe/',
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
  DOCTOR_PENDING_REPORTS: '/api/doctor/reports/pending',
  DOCTOR_REVIEWED_REPORTS: '/api/doctor/reports/my-reviewed',
  DOCTOR_STATS: '/api/doctor/stats',

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
};
