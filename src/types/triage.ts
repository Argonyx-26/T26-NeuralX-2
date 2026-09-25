export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNCERTAIN';

export interface Vitals {
  heart_rate: number;
  bp_systolic: number;
  bp_diastolic: number;
  spo2: number;
  respiratory_rate: number;
  temperature: number;
}

export interface PatientHistory {
  diabetes: boolean;
  hypertension: boolean;
  asthma_copd: boolean;
  prior_cardiac_event: boolean;
  age: number;
  gender: 'M' | 'F' | 'Other';
  smoker?: boolean;
}

export interface PatientInput {
  chief_complaint: string;
  duration_hours?: number;
  vitals: Vitals;
  history: PatientHistory;
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  options: string[];
  selectedOption?: string;
  targetFactor?: string;
}

export interface Facility {
  id: string;
  name: string;
  type: 'District Hospital' | 'Community Health Center' | 'Tertiary Medical College' | 'Primary Health Clinic';
  distance_km: number;
  eta_mins: number;
  icu_beds_available: number;
  general_beds_available: number;
  oxygen_beds_available: number;
  specialist_on_duty: string;
  match_score: number; // 0 - 100
  capacity_status: 'AMPLE' | 'CONGESTED' | 'CRITICAL' | 'NO_BEDS';
  address: string;
  phone: string;
  is_simulated: boolean;
}

export interface ScoringBreakdown {
  vitals_score: number;
  symptom_score: number;
  comorbidity_score: number;
  ambiguity_index: number; // 0.0 - 1.0 (higher means conflicting/unclear)
}

export interface TriageResponse {
  case_id: string;
  tier: RiskTier;
  confidence: number; // 0.0 to 1.0
  contributing_factors: string[];
  requires_clarification: boolean;
  clarifying_questions?: ClarifyingQuestion[];
  escalate_to_human: boolean;
  escalation_reason?: string;
  recommended_facility?: Facility;
  alternative_facilities?: Facility[];
  scoring_breakdown: ScoringBreakdown;
  clinical_summary?: string;
  timestamp: string;
}

export interface ReferralLogItem {
  id: string;
  patient_id: string;
  timestamp: string;
  initial_tier: RiskTier;
  facility_name: string;
  facility_id: string;
  status: 'SENT' | 'CONFIRMED' | 'LOST_TO_FOLLOW_UP';
  actual_outcome_tier?: RiskTier;
  mismatch_flag: boolean;
  mismatch_reason?: string;
  transport_mode?: string;
  elapsed_mins: number;
  resolution_notes?: string;
}

export type AuditEventType = 
  | 'TRIAGE_SUBMITTED' 
  | 'CLARIFICATION_TRIGGERED' 
  | 'ESCALATED_HUMAN_REVIEW' 
  | 'FACILITY_ROUTED' 
  | 'REFERRAL_CONFIRMED'
  | 'WEIGHT_RECALIBRATED';

export type RaahEventType = AuditEventType; // Alias for compatibility

export interface AuditEvent {
  eventId: string;
  eventType: AuditEventType;
  timestamp: string;
  caseId: string;
  patientHash: string;
  status: 'LOGGED' | 'DISPATCHED' | 'CONFIRMED';
  latencyMs: number;
  payloadSummary: string;
  internalTraceId: string;
  metadata?: Record<string, any>;
}

export type RaahAuditEvent = AuditEvent; // Alias for compatibility

