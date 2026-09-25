from __future__ import annotations
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

class ConsciousnessLevel(str, Enum):
    ALERT = "Alert"
    VOICE = "Voice"
    PAIN = "Pain"
    UNRESPONSIVE = "Unresponsive"
    CONFUSED = "Confused"

class RiskTier(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"
    UNCERTAIN = "Uncertain"

class SymptomItem(BaseModel):
    name: str = Field(..., description="Standardized or descriptive symptom name (e.g. 'chest_pain', 'dyspnea')")
    severity: Optional[str] = Field("moderate", description="Mild, moderate, severe, or critical")
    duration_hours: Optional[float] = Field(None, description="Duration in hours if known")
    details: Optional[str] = Field(None, description="Specific qualifying clinical details, e.g., 'radiating to left jaw'")

class VitalsInput(BaseModel):
    respiratory_rate: Optional[int] = Field(None, ge=4, le=80, description="Breaths per minute (RR)")
    spo2: Optional[float] = Field(None, ge=40.0, le=100.0, description="Oxygen saturation %")
    supplemental_oxygen: Optional[bool] = Field(False, description="Whether patient is currently on supplemental O2")
    systolic_bp: Optional[int] = Field(None, ge=40, le=300, description="Systolic blood pressure (mmHg)")
    diastolic_bp: Optional[int] = Field(None, ge=20, le=200, description="Diastolic blood pressure (mmHg)")
    heart_rate: Optional[int] = Field(None, ge=20, le=300, description="Heart rate (bpm)")
    # BUG 2 FIX: Default changed from ConsciousnessLevel.ALERT to None.
    # A missing consciousness_level means "not recorded", not "the patient is Alert".
    # Scoring logic uses `if vitals.consciousness_level:` so None → no vitals_count increment,
    # no score contribution — which correctly models missing data, not a safe clinical assumption.
    consciousness_level: Optional[ConsciousnessLevel] = Field(None, description="Consciousness level (AVPU) — omit if not assessed")
    temperature: Optional[float] = Field(None, ge=25.0, le=45.0, description="Body temperature in Celsius")

class ScoreRequest(BaseModel):
    symptoms: List[Union[SymptomItem, str]] = Field(default_factory=list, description="List of symptoms")
    vitals: Optional[VitalsInput] = Field(default_factory=VitalsInput, description="Patient vital signs")
    age: Optional[int] = Field(None, ge=0, le=130, description="Patient age in years")
    history: List[str] = Field(default_factory=list, description="Prior medical history and comorbidities")
    pregnancy: Optional[bool] = Field(False, description="Whether the patient is pregnant")

class ContributingFactor(BaseModel):
    factor: str = Field(..., description="Descriptive name of the clinical finding")
    weight: float = Field(..., description="Numerical risk points contributed")
    value: Any = Field(..., description="Observed clinical value")
    category: str = Field("vitals", description="Category: 'vitals', 'symptoms', 'history', 'age', 'red_flag'")
    rationale: Optional[str] = Field(None, description="Auditable explanation of rule trigger")

class ScoreBreakdown(BaseModel):
    physiological_score: float = Field(..., description="Points derived from physiological vital signs")
    symptom_score: float = Field(..., description="Points derived from symptom presentation and red flags")
    comorbidity_score: float = Field(..., description="Points derived from past medical history and age")
    total_raw_score: float = Field(..., description="Total aggregate deterministic score")

class ScoreResponse(BaseModel):
    risk_tier: RiskTier = Field(..., description="Categorical risk tier: Low, Medium, High, Critical, or Uncertain")
    contributing_factors: List[ContributingFactor] = Field(..., description="List of auditable factors influencing the score")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Data completeness and signal consistency confidence score (0-1)")
    recommended_action: str = Field(..., description="Immediate clinical escalation or care guideline")
    score_breakdown: ScoreBreakdown = Field(..., description="Detailed point allocation breakdown")
    is_uncertain: bool = Field(False, description="Flag indicating whether active uncertainty threshold was met")
    uncertainty_reasons: List[str] = Field(default_factory=list, description="Explicit reasons triggering uncertainty")

# Extraction Models
class ExtractRequest(BaseModel):
    patient_text: str = Field(..., description="Free-text narrative of patient symptoms, timeline, and history")
    raw_vitals: Optional[Dict[str, Any]] = Field(None, description="Optional raw vitals provided alongside text")
    raw_history: Optional[List[str]] = Field(None, description="Optional preexisting comorbidities provided directly")

class ExtractResponse(BaseModel):
    symptoms: List[SymptomItem] = Field(default_factory=list, description="Extracted structured symptoms")
    vitals: VitalsInput = Field(default_factory=VitalsInput, description="Extracted and normalized vitals")
    age: Optional[int] = Field(None, description="Extracted age")
    history: List[str] = Field(default_factory=list, description="Extracted comorbidities and risk factors")
    pregnancy: bool = Field(False, description="Extracted pregnancy indicator")
    extraction_summary: str = Field(..., description="Human-readable clinical summary of the extracted narrative")
    ready_for_scoring: ScoreRequest = Field(..., description="Direct payload ready to send into POST /api/score")
