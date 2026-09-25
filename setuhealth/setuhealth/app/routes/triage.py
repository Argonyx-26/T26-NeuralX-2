"""
SetuHealth API Routes — Phase 1: Scoring & Extraction
Endpoints: POST /api/extract, POST /api/score
"""

from fastapi import APIRouter, HTTPException
from app.models.triage import (
    ScoreRequest, ScoreResponse,
    ExtractRequest, ExtractResponse,
    SymptomItem, VitalsInput,
)
from app.core.scoring import compute_deterministic_triage
from app.core.llm_client import extract_structured_data

router = APIRouter()


@router.post("/score", response_model=ScoreResponse, summary="Deterministic Clinical Risk Score")
async def score_patient(request: ScoreRequest) -> ScoreResponse:
    """
    **POST /api/score**

    Runs the deterministic, auditable clinical risk scoring engine.
    
    - Risk score and tier are NEVER computed by an LLM.
    - Scoring is a transparent weighted rule engine.
    - Returns all contributing factors, confidence, and recommended action in a single response.

    Send the structured payload directly (or use /api/extract first to parse free text).
    """
    try:
        result = compute_deterministic_triage(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring engine error: {str(e)}")


@router.post("/extract", response_model=ExtractResponse, summary="LLM-Powered Symptom Extraction")
async def extract_symptoms(request: ExtractRequest) -> ExtractResponse:
    """
    **POST /api/extract**

    Sends the patient's free-text narrative to Claude (Anthropic API) to extract
    structured symptoms, vitals, history, and age into a normalized JSON payload.
    
    - The LLM ONLY extracts structure — it does NOT score or classify risk.
    - Returns `ready_for_scoring` — a pre-built ScoreRequest payload to feed directly into POST /api/score.
    - Returns `extraction_summary` — a human-readable narrative summary.
    """
    try:
        parsed = await extract_structured_data(
            patient_text=request.patient_text,
            raw_vitals=request.raw_vitals,
            raw_history=request.raw_history,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"LLM API error: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"LLM extraction parse failure: {str(e)}")

    # Safely construct SymptomItem objects from LLM output
    symptoms_raw = parsed.get("symptoms", [])
    symptoms = []
    for s in symptoms_raw:
        if isinstance(s, dict):
            symptoms.append(SymptomItem(
                name=s.get("name", "unspecified symptom"),
                severity=s.get("severity"),
                duration_hours=s.get("duration_hours"),
                details=s.get("details"),
            ))
        elif isinstance(s, str):
            symptoms.append(SymptomItem(name=s))

    # Build vitals from LLM output with safe fallbacks
    vitals_raw = parsed.get("vitals", {}) or {}
    vitals = VitalsInput(
        respiratory_rate=vitals_raw.get("respiratory_rate"),
        spo2=vitals_raw.get("spo2"),
        supplemental_oxygen=bool(vitals_raw.get("supplemental_oxygen", False)),
        systolic_bp=vitals_raw.get("systolic_bp"),
        diastolic_bp=vitals_raw.get("diastolic_bp"),
        heart_rate=vitals_raw.get("heart_rate"),
        consciousness_level=vitals_raw.get("consciousness_level"),
        temperature=vitals_raw.get("temperature"),
    )

    age = parsed.get("age")
    history = parsed.get("history", []) or []
    pregnancy = bool(parsed.get("pregnancy", False))
    extraction_summary = parsed.get("extraction_summary", "No summary generated.")

    # Build the ScoreRequest payload ready for /api/score
    ready_for_scoring = ScoreRequest(
        symptoms=symptoms,
        vitals=vitals,
        age=age,
        history=history,
        pregnancy=pregnancy,
    )

    return ExtractResponse(
        symptoms=symptoms,
        vitals=vitals,
        age=age,
        history=history,
        pregnancy=pregnancy,
        extraction_summary=extraction_summary,
        ready_for_scoring=ready_for_scoring,
    )
