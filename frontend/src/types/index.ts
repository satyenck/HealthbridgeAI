/**
 * HealthbridgeAI v2 - Type Definitions
 * Matches backend schemas_v2.py
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  LAB = 'LAB',
  PHARMACY = 'PHARMACY',
  ADMIN = 'ADMIN',
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other',
  PREFER_NOT_TO_SAY = 'Prefer Not to Say',
}

export enum EncounterType {
  REMOTE_CONSULT = 'REMOTE_CONSULT',
  LIVE_VISIT = 'LIVE_VISIT',
  INITIAL_LOG = 'INITIAL_LOG',
}

export enum InputMethod {
  VOICE = 'VOICE',
  MANUAL = 'MANUAL',
}

export enum ReportStatus {
  GENERATED = 'GENERATED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  REVIEWED = 'REVIEWED',
}

export enum Priority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum OrderStatus {
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
  COMPLETED = 'COMPLETED',
}

export enum AccessLevel {
  FULL_HISTORY = 'FULL_HISTORY',
  SINGLE_ENCOUNTER = 'SINGLE_ENCOUNTER',
}

// ============================================================================
// USER & PROFILE TYPES
// ============================================================================

export interface User {
  user_id: string;
  email?: string;
  phone_number?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface PatientProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender;
  general_health_issues?: string;
  created_at: string;
  updated_at?: string;
}

export interface DoctorProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  hospital_name?: string;
  specialty?: string;
  degree?: string;
  last_degree_year?: number;
  created_at: string;
  updated_at?: string;
}

export interface LabProfile {
  user_id: string;
  business_name: string;
  email: string;
  phone: string;
  address: string;
  license_year?: number;
  created_at: string;
}

export interface PharmacyProfile {
  user_id: string;
  business_name: string;
  email: string;
  phone: string;
  address: string;
  license_year?: number;
  created_at: string;
}

// ============================================================================
// ENCOUNTER & MEDICAL DATA TYPES
// ============================================================================

export interface Encounter {
  encounter_id: string;
  patient_id: string;
  doctor_id?: string;
  encounter_type: EncounterType;
  input_method?: InputMethod;
  created_at: string;
}

export interface Vitals {
  vital_id: string;
  encounter_id: string;
  blood_pressure_sys?: number;
  blood_pressure_dia?: number;
  heart_rate?: number;
  oxygen_level?: number;
  weight?: number;
  temperature?: number;
  recorded_at: string;
}

export interface LabResults {
  log_id: string;
  encounter_id: string;
  metrics: Record<string, any>;
  recorded_at: string;
}

export interface SummaryReportContent {
  symptoms: string;
  diagnosis: string;
  treatment: string;
  tests?: string;
  prescription?: string;
  next_steps: string;
}

export interface SummaryReport {
  report_id: string;
  encounter_id: string;
  status: ReportStatus;
  priority?: Priority;
  content: SummaryReportContent;
  created_at: string;
  updated_at?: string;
}

export interface LabOrder {
  order_id: string;
  encounter_id: string;
  lab_id: string;
  instructions: string;
  status: OrderStatus;
  created_at: string;
  updated_at?: string;
}

export interface Prescription {
  prescription_id: string;
  encounter_id: string;
  pharmacy_id: string;
  instructions: string;
  status: OrderStatus;
  created_at: string;
  updated_at?: string;
}

export interface MediaFile {
  file_id: string;
  encounter_id: string;
  file_type: string;
  filename: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}

// ============================================================================
// COMPREHENSIVE TYPES
// ============================================================================

export interface ComprehensiveEncounter {
  encounter: Encounter;
  vitals?: Vitals[];
  lab_results?: LabResults[];
  summary_report?: SummaryReport;
  lab_orders?: LabOrder[];
  prescriptions?: Prescription[];
  media_files?: MediaFile[];
  patient_info?: PatientProfile;
  doctor_info?: DoctorProfile;
}

export interface PatientTimeline {
  patient: PatientProfile;
  encounters: ComprehensiveEncounter[];
  vitals_trend?: {
    blood_pressure_sys: (number | null)[];
    blood_pressure_dia: (number | null)[];
    heart_rate: (number | null)[];
    oxygen_level: (number | null)[];
    weight: (number | null)[];
    temperature: (number | null)[];
    timestamps: string[];
  };
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: UserRole;
}

export interface CreateEncounterRequest {
  patient_id: string;
  doctor_id?: string;
  encounter_type: EncounterType;
  input_method?: InputMethod;
}

export interface CreateVitalsRequest {
  encounter_id: string;
  blood_pressure_sys?: number;
  blood_pressure_dia?: number;
  heart_rate?: number;
  oxygen_level?: number;
  weight?: number;
  temperature?: number;
}

export interface CreateLabResultsRequest {
  encounter_id: string;
  metrics: Record<string, any>;
}

export interface CreateSummaryReportRequest {
  encounter_id: string;
  status?: ReportStatus;
  priority?: Priority;
  content: SummaryReportContent;
}

export interface UpdateSummaryReportRequest {
  status?: ReportStatus;
  priority?: Priority;
  content?: SummaryReportContent;
}

export interface VoiceTranscriptionRequest {
  audio_base64: string;
}

export interface VoiceTranscriptionResponse {
  transcribed_text: string;
  confidence?: number;
  duration_seconds?: number;
}

export interface SystemStats {
  total_patients: number;
  total_doctors: number;
  total_labs: number;
  total_pharmacies: number;
  total_encounters: number;
  pending_reports: number;
  reviewed_reports: number;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface AppState {
  isAuthenticated: boolean;
  user?: User;
  userRole?: UserRole;
  profile?: PatientProfile | DoctorProfile | LabProfile | PharmacyProfile;
}

export interface EncounterFilters {
  patient_id?: string;
  encounter_type?: EncounterType;
  date_from?: string;
  date_to?: string;
}
