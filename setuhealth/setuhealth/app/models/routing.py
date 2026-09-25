from __future__ import annotations
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.models.triage import ScoreRequest, ScoreResponse, RiskTier


class ClarifyRequest(BaseModel):
    """
    Request to POST /api/clarify.
    The frontend sends the original score result + original ScoreRequest,
    so the backend can resolve ambiguity without losing context.
    """
    original_score: ScoreResponse = Field(..., description="The result from a previous /api/score call that triggered uncertainty")
    original_request: ScoreRequest = Field(..., description="The original scored patient request payload")
    patient_context_summary: Optional[str] = Field(
        None,
        description="Optional 1-2 sentence human-readable summary of the patient situation"
    )


class ClarifyResponse(BaseModel):
    """Response from POST /api/clarify — returns targeted questions."""
    questions: List[str] = Field(..., description="1-2 targeted clinical clarifying questions for the triage operator")
    ambiguity_trigger: str = Field(..., description="Which uncertainty condition triggered clarification")
    uncertainty_reasons: List[str] = Field(..., description="Explicit reasons why confidence was below threshold")
    session_token: str = Field(..., description="Opaque token to pass back in /api/clarify/answer to chain the session")


class ClarifyAnswerRequest(BaseModel):
    """
    Request to POST /api/clarify/answer.
    Patient/operator answers are submitted along with the original request payload.
    The backend merges answers into the original request and re-scores.
    """
    session_token: str = Field(..., description="session_token received from /api/clarify response")
    original_request: ScoreRequest = Field(..., description="Original ScoreRequest payload to augment")
    answers: Dict[str, Any] = Field(
        ...,
        description="Free-text answers to clarifying questions, keyed by question index (e.g. '0', '1') or symptom names"
    )
    clarify_round: int = Field(1, description="Which clarification round this is (max 1 supported)")


class ClarifyAnswerResponse(BaseModel):
    """
    Response from POST /api/clarify/answer.
    Contains the re-scored result — or escalates if still uncertain after one round.
    """
    final_score: ScoreResponse = Field(..., description="Updated ScoreResponse after incorporating clarification answers")
    was_resolved: bool = Field(..., description="Whether uncertainty was resolved after re-scoring")
    escalated: bool = Field(False, description="True if still uncertain after max clarification rounds — escalated to human review")
    escalation_reason: Optional[str] = Field(None, description="Reason for human escalation if escalated=true")
    round_used: int = Field(..., description="Which clarification round produced this result")


# ==========================================
# ROUTING MODELS (Phase 3)
# ==========================================

class RouteRequest(BaseModel):
    risk_tier: RiskTier = Field(..., description="Risk tier from the scoring engine")
    required_specialty: Optional[str] = Field(
        None,
        description="Required clinical specialty, e.g. 'cardiology', 'neurology', 'general'. Auto-inferred if blank."
    )
    patient_location: Optional[Dict[str, float]] = Field(
        None,
        description="Optional patient location {lat, lng} for distance computation. Falls back to facility rankings by load if absent."
    )


class FacilityMatch(BaseModel):
    facility_id: str
    name: str
    distance_km: float
    current_load_pct: float
    icu_beds_available: int
    specialists_on_call: List[str]
    routing_score: float = Field(..., description="Computed weighted routing score (higher = better match)")
    score_breakdown: Dict[str, float] = Field(..., description="Component scores: distance_score, load_score, specialty_score")
    eta_minutes: int = Field(..., description="Estimated ETA in minutes (distance / avg ambulance speed)")
    lat: Optional[float] = None
    lng: Optional[float] = None


class RouteResponse(BaseModel):
    recommended_facility: FacilityMatch = Field(..., description="Top-ranked recommended facility")
    ranked_list: List[FacilityMatch] = Field(..., description="Top 3 ranked facilities with full score breakdown")
    routing_rationale: str = Field(..., description="Human-readable explanation of why the top facility was chosen")
    data_source: str = Field("SIMULATED", description="Data provenance — always SIMULATED in this build")
    risk_tier: RiskTier
    required_specialty: str


# ==========================================
# REFERRAL TRACKING MODELS (Phase 4)
# ==========================================

class ReferralStatus(str):
    SENT = "sent"
    CONFIRMED = "confirmed"
    OUTCOME_KNOWN = "outcome_known"
    LOST_TO_FOLLOWUP = "lost_to_followup"

class ReferralRecord(BaseModel):
    id: str
    patient_id: str
    facility_id: str
    facility_name: str
    risk_tier: str
    predicted_tier: str
    created_at: str
    status: str
    outcome_severity: Optional[str] = None
    outcome_notes: Optional[str] = None
    confirmed_at: Optional[str] = None
    tier_mismatch: Optional[bool] = None

class CreateReferralRequest(BaseModel):
    facility_id: str
    facility_name: str
    risk_tier: str
    patient_id: Optional[str] = None
    predicted_tier: Optional[str] = None
    transport_mode: Optional[str] = "Ambulance"

class ReferralListResponse(BaseModel):
    referrals: List[ReferralRecord]
    total: int
    summary: Dict[str, int] = Field(..., description="Status breakdown counts")

class ConfirmOutcomeRequest(BaseModel):
    outcome_severity: str = Field(..., description="Actual severity on admission (Low/Medium/High/Critical)")
    outcome_notes: Optional[str] = Field(None, description="Optional clinical notes on actual presentation")

class MismatchEntry(BaseModel):
    referral_id: str
    patient_id: str
    predicted_tier: str
    actual_severity: str
    mismatch_type: str = Field(..., description="'over_triaged' | 'under_triaged'")
    facility: str
    date: str

class MismatchLogResponse(BaseModel):
    mismatches: List[MismatchEntry]
    total_mismatches: int
    total_referrals: int
    mismatch_rate_pct: float
    conceptual_note: str = Field(
        "CONCEPTUAL ONLY: This log is designed to feed manual rule-weight review. No live model retraining is implemented.",
        description="Disclaimer — no live learning is implemented"
    )
