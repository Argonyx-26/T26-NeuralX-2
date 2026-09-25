"""
Phase 2 — Active Uncertainty Handler Routes.

POST /api/clarify         — generates targeted clarifying questions when confidence < threshold
POST /api/clarify/answer  — accepts answers, re-scores, escalates if still uncertain after 1 round
"""

import uuid
from fastapi import APIRouter, HTTPException
from app.models.routing import (
    ClarifyRequest, ClarifyResponse,
    ClarifyAnswerRequest, ClarifyAnswerResponse,
)
from app.models.triage import ScoreRequest, SymptomItem, VitalsInput, RiskTier
from app.core.scoring import compute_deterministic_triage
from app.core.llm_client import generate_clarifying_questions
from app.config import CONFIDENCE_THRESHOLD

router = APIRouter()

# In-memory session store for clarification chaining
# Maps session_token -> { original_request, original_score, questions }
_clarify_sessions: dict = {}

AMBIGUITY_TRIGGER_LOW_CONFIDENCE = "confidence_below_threshold"
AMBIGUITY_TRIGGER_CONFLICTING_SIGNALS = "conflicting_physiological_signals"
AMBIGUITY_TRIGGER_BOTH = "low_confidence_and_conflicting_signals"


@router.post("/clarify", response_model=ClarifyResponse, summary="Generate Clarifying Questions for Uncertain Cases")
async def generate_clarify(request: ClarifyRequest) -> ClarifyResponse:
    """
    **POST /api/clarify**

    Triggered when a scoring result has:
    - `confidence < 0.65` (CONFIDENCE_THRESHOLD), OR
    - `is_uncertain = true` due to conflicting clinical signals

    Calls the LLM to generate 1-2 targeted clinical clarifying questions.
    Returns a `session_token` to chain into POST /api/clarify/answer.
    """
    score = request.original_score

    # Validate ambiguity trigger
    if score.confidence >= CONFIDENCE_THRESHOLD and not score.is_uncertain:
        raise HTTPException(
            status_code=400,
            detail=(
                f"No ambiguity threshold triggered. "
                f"Confidence={score.confidence}, is_uncertain={score.is_uncertain}. "
                f"Only call /api/clarify when score returns is_uncertain=true or confidence < {CONFIDENCE_THRESHOLD}."
            )
        )

    # Determine trigger reason
    low_conf = score.confidence < CONFIDENCE_THRESHOLD
    conflict = score.is_uncertain and len(score.uncertainty_reasons) >= 1

    if low_conf and conflict:
        trigger = AMBIGUITY_TRIGGER_BOTH
    elif conflict:
        trigger = AMBIGUITY_TRIGGER_CONFLICTING_SIGNALS
    else:
        trigger = AMBIGUITY_TRIGGER_LOW_CONFIDENCE

    # Serialize contributing factors for LLM
    factors_for_llm = [
        {"factor": f.factor, "weight": f.weight, "value": str(f.value)}
        for f in score.contributing_factors
    ]

    patient_context = request.patient_context_summary or f"Patient scored {score.risk_tier.value} risk."

    try:
        questions = await generate_clarifying_questions(
            uncertainty_reasons=score.uncertainty_reasons,
            contributing_factors=factors_for_llm,
            patient_context=patient_context,
        )
    except Exception as e:
        # Fallback to safe default questions if LLM call fails
        questions = [
            "Has the patient experienced any sudden change in their level of consciousness or responsiveness?",
            "Can you confirm the exact blood pressure and oxygen saturation readings if a device is available?"
        ]

    # Store session
    session_token = str(uuid.uuid4())
    _clarify_sessions[session_token] = {
        "original_request": request.original_request,
        "original_score": score,
        "questions": questions,
    }

    return ClarifyResponse(
        questions=questions,
        ambiguity_trigger=trigger,
        uncertainty_reasons=score.uncertainty_reasons,
        session_token=session_token,
    )


@router.post("/clarify/answer", response_model=ClarifyAnswerResponse, summary="Submit Answers and Re-Score")
async def answer_clarification(request: ClarifyAnswerRequest) -> ClarifyAnswerResponse:
    """
    **POST /api/clarify/answer**

    Accepts answers to the clarifying questions and re-runs the deterministic scoring engine.

    - If confidence is now >= threshold: returns resolved score.
    - If still uncertain after round 1: ESCALATES — returns risk_tier="Uncertain",
      recommended_action="Escalate to human review". NO further clarification rounds.

    Hard rule: maximum ONE round of clarification. After that, escalate.
    """
    session = _clarify_sessions.get(request.session_token)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session token not found or expired. Please re-run /api/score and /api/clarify."
        )

    if request.clarify_round > 1:
        # Hard constraint: max 1 round
        raise HTTPException(
            status_code=400,
            detail="Maximum clarification round (1) exceeded. Escalate to human clinical review."
        )

    original_req: ScoreRequest = session["original_request"]

    # ── Merge answers into the original request ──────────────────────────────
    # Strategy: concatenate answer text as additional symptoms and history clues.
    # This is deliberately simple — we re-run the deterministic engine with enriched inputs.
    extra_symptoms = []
    extra_history = []

    for _idx, answer_text in request.answers.items():
        if isinstance(answer_text, str):
            answer_lower = answer_text.lower()
            # Simple heuristic: if answer mentions known comorbidities, add to history.
            comorbid_keywords = ["diabetes", "heart disease", "copd", "kidney", "asthma", "hypertension", "cancer", "transplant"]

            # BUG 3 FIX: Negation detection before adding any matched keyword.
            # Strategy: look for a negation word in the 30 characters immediately preceding
            # the keyword position. This is a word-window heuristic — NOT full clinical NLP.
            # Known limitation: doesn't handle complex sentence structure (e.g. "diabetes, but
            # no heart disease" could still add 'heart disease' if phrased ambiguously).
            # Documented here so it is not overclaimed as a complete negation solution.
            NEGATION_WORDS = ["no ", "not ", "none", "denies", "denied", "without", "negative for", "no known"]

            for kw in comorbid_keywords:
                if kw in answer_lower and kw not in [h.lower() for h in original_req.history]:
                    kw_pos = answer_lower.find(kw)
                    preceding_text = answer_lower[max(0, kw_pos - 30):kw_pos]
                    is_negated = any(neg in preceding_text for neg in NEGATION_WORDS)
                    if not is_negated:
                        extra_history.append(kw)
            # Also add the answer as a supplementary symptom description for keyword matching
            extra_symptoms.append(SymptomItem(name=answer_text[:120], details="clarification_answer"))

    merged_symptoms = list(original_req.symptoms) + extra_symptoms
    merged_history = list(original_req.history) + extra_history

    enriched_request = ScoreRequest(
        symptoms=merged_symptoms,
        vitals=original_req.vitals,
        age=original_req.age,
        history=merged_history,
        pregnancy=original_req.pregnancy,
    )

    # Re-run deterministic engine
    re_scored = compute_deterministic_triage(enriched_request)

    was_resolved = not re_scored.is_uncertain
    escalated = False
    escalation_reason = None

    if not was_resolved:
        # Hard constraint: escalate after 1 round
        escalated = True
        escalation_reason = (
            "Uncertainty not resolved after one round of clarifying questions. "
            "Conflicting clinical signals remain. Human clinical review required before dispatch."
        )
        re_scored.risk_tier = RiskTier.UNCERTAIN
        re_scored.recommended_action = "Escalate to human review — discrepant clinical signals could not be resolved automatically."

    # Clean up session after use
    del _clarify_sessions[request.session_token]

    return ClarifyAnswerResponse(
        final_score=re_scored,
        was_resolved=was_resolved,
        escalated=escalated,
        escalation_reason=escalation_reason,
        round_used=request.clarify_round,
    )
