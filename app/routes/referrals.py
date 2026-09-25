"""
Phase 4 — Closed-Loop Outcome Tracking.

Endpoints:
  GET  /api/referrals           — list referrals with status
  POST /api/referrals/:id/confirm — mark outcome
  GET  /api/mismatch-log        — cases where predicted tier != actual outcome severity

In-memory store seeded with synthetic historical referrals.
CONCEPTUAL NOTE: The mismatch-log is designed to feed human rule-weight review. 
No live model retraining is implemented.
"""

import uuid
from typing import Dict, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from app.models.routing import (
    ReferralRecord, ReferralListResponse,
    ConfirmOutcomeRequest, MismatchEntry, MismatchLogResponse
)

router = APIRouter()

# ==========================================
# SYNTHETIC HISTORICAL REFERRAL SEED DATA
# ~18 referrals — realistic mix of statuses, tiers, facilities
# ==========================================
def _days_ago(n: int) -> str:
    return (datetime.utcnow() - timedelta(days=n)).strftime("%Y-%m-%dT%H:%M:%SZ")


_SEED_REFERRALS: Dict[str, dict] = {
    "REF-001": {
        "id": "REF-001", "patient_id": "PAT-0012",
        "facility_id": "FAC-001", "facility_name": "AIIMS New Delhi Trauma Centre",
        "risk_tier": "Critical", "predicted_tier": "Critical",
        "created_at": _days_ago(18), "status": "outcome_known",
        "outcome_severity": "Critical", "outcome_notes": "Confirmed STEMI, cath lab activated on arrival.",
        "confirmed_at": _days_ago(17), "tier_mismatch": False,
    },
    "REF-002": {
        "id": "REF-002", "patient_id": "PAT-0025",
        "facility_id": "FAC-009", "facility_name": "Sir Ganga Ram Hospital",
        "risk_tier": "High", "predicted_tier": "High",
        "created_at": _days_ago(15), "status": "confirmed",
        "outcome_severity": None, "outcome_notes": None,
        "confirmed_at": _days_ago(15), "tier_mismatch": None,
    },
    "REF-003": {
        "id": "REF-003", "patient_id": "PAT-0031",
        "facility_id": "FAC-002", "facility_name": "Ram Manohar Lohia Hospital",
        "risk_tier": "Medium", "predicted_tier": "Medium",
        "created_at": _days_ago(12), "status": "lost_to_followup",
        "outcome_severity": None, "outcome_notes": "Patient not traceable after referral.",
        "confirmed_at": None, "tier_mismatch": None,
    },
    "REF-004": {
        "id": "REF-004", "patient_id": "PAT-0044",
        "facility_id": "FAC-007", "facility_name": "Indraprastha Apollo Hospital",
        "risk_tier": "Critical", "predicted_tier": "Critical",
        "created_at": _days_ago(10), "status": "outcome_known",
        "outcome_severity": "High", "outcome_notes": "ICU admission, sepsis managed, discharged D+5.",
        "confirmed_at": _days_ago(9), "tier_mismatch": True,
    },
    "REF-005": {
        "id": "REF-005", "patient_id": "PAT-0057",
        "facility_id": "FAC-010", "facility_name": "Maulana Azad Medical College",
        "risk_tier": "Low", "predicted_tier": "Low",
        "created_at": _days_ago(9), "status": "confirmed",
        "outcome_severity": None, "outcome_notes": None,
        "confirmed_at": _days_ago(9), "tier_mismatch": None,
    },
    "REF-006": {
        "id": "REF-006", "patient_id": "PAT-0063",
        "facility_id": "FAC-001", "facility_name": "AIIMS New Delhi Trauma Centre",
        "risk_tier": "High", "predicted_tier": "High",
        "created_at": _days_ago(8), "status": "outcome_known",
        "outcome_severity": "Critical", "outcome_notes": "Haemorrhagic stroke confirmed on CT. Initially assessed as High, severity upgraded on imaging.",
        "confirmed_at": _days_ago(7), "tier_mismatch": True,
    },
    "REF-007": {
        "id": "REF-007", "patient_id": "PAT-0078",
        "facility_id": "FAC-005", "facility_name": "GTB Hospital",
        "risk_tier": "Medium", "predicted_tier": "Medium",
        "created_at": _days_ago(7), "status": "sent",
        "outcome_severity": None, "outcome_notes": None,
        "confirmed_at": None, "tier_mismatch": None,
    },
    "REF-008": {
        "id": "REF-008", "patient_id": "PAT-0089",
        "facility_id": "FAC-004", "facility_name": "Fortis Escorts Heart Institute",
        "risk_tier": "Critical", "predicted_tier": "Critical",
        "created_at": _days_ago(6), "status": "outcome_known",
        "outcome_severity": "Critical", "outcome_notes": "Aortic dissection Type A, emergency surgery.",
        "confirmed_at": _days_ago(5), "tier_mismatch": False,
    },
    "REF-009": {
        "id": "REF-009", "patient_id": "PAT-0094",
        "facility_id": "FAC-006", "facility_name": "Lok Nayak Jai Prakash Hospital",
        "risk_tier": "Low", "predicted_tier": "Low",
        "created_at": _days_ago(5), "status": "outcome_known",
        "outcome_severity": "Medium", "outcome_notes": "Viral pneumonia found on chest X-ray. Admitted for IV antibiotics.",
        "confirmed_at": _days_ago(4), "tier_mismatch": True,
    },
    "REF-010": {
        "id": "REF-010", "patient_id": "PAT-0101",
        "facility_id": "FAC-009", "facility_name": "Sir Ganga Ram Hospital",
        "risk_tier": "High", "predicted_tier": "High",
        "created_at": _days_ago(4), "status": "confirmed",
        "outcome_severity": None, "outcome_notes": None,
        "confirmed_at": _days_ago(4), "tier_mismatch": None,
    },
    "REF-011": {
        "id": "REF-011", "patient_id": "PAT-0115",
        "facility_id": "FAC-012", "facility_name": "Janakpuri Super Speciality Hospital",
        "risk_tier": "Medium", "predicted_tier": "Medium",
        "created_at": _days_ago(3), "status": "outcome_known",
        "outcome_severity": "Medium", "outcome_notes": "Acute kidney injury, dialysis initiated.",
        "confirmed_at": _days_ago(2), "tier_mismatch": False,
    },
    "REF-012": {
        "id": "REF-012", "patient_id": "PAT-0127",
        "facility_id": "FAC-002", "facility_name": "Ram Manohar Lohia Hospital",
        "risk_tier": "High", "predicted_tier": "High",
        "created_at": _days_ago(2), "status": "sent",
        "outcome_severity": None, "outcome_notes": None,
        "confirmed_at": None, "tier_mismatch": None,
    },
    "REF-013": {
        "id": "REF-013", "patient_id": "PAT-0133",
        "facility_id": "FAC-007", "facility_name": "Indraprastha Apollo Hospital",
        "risk_tier": "Critical", "predicted_tier": "Critical",
        "created_at": _days_ago(2), "status": "confirmed",
        "outcome_severity": None, "outcome_notes": None,
        "confirmed_at": _days_ago(2), "tier_mismatch": None,
    },
    "REF-014": {
        "id": "REF-014", "patient_id": "PAT-0141",
        "facility_id": "FAC-008", "facility_name": "Deen Dayal Upadhyay Hospital",
        "risk_tier": "Low", "predicted_tier": "Low",
        "created_at": _days_ago(1), "status": "outcome_known",
        "outcome_severity": "Low", "outcome_notes": "URI, discharged with prescription.",
        "confirmed_at": _days_ago(1), "tier_mismatch": False,
    },
    "REF-015": {
        "id": "REF-015", "patient_id": "PAT-0158",
        "facility_id": "FAC-001", "facility_name": "AIIMS New Delhi Trauma Centre",
        "risk_tier": "High", "predicted_tier": "Medium",
        "created_at": _days_ago(1), "status": "outcome_known",
        "outcome_severity": "High", "outcome_notes": "Pulmonary embolism confirmed. Initially scored Medium due to incomplete vitals.",
        "confirmed_at": _days_ago(0), "tier_mismatch": True,
    },
    "REF-016": {
        "id": "REF-016", "patient_id": "PAT-0165",
        "facility_id": "FAC-003", "facility_name": "Safdarjung Hospital",
        "risk_tier": "Medium", "predicted_tier": "Medium",
        "created_at": _days_ago(1), "status": "sent",
        "outcome_severity": None, "outcome_notes": None,
        "confirmed_at": None, "tier_mismatch": None,
    },
    "REF-017": {
        "id": "REF-017", "patient_id": "PAT-0174",
        "facility_id": "FAC-011", "facility_name": "Hindu Rao Hospital",
        "risk_tier": "Low", "predicted_tier": "Low",
        "created_at": _days_ago(0), "status": "sent",
        "outcome_severity": None, "outcome_notes": None,
        "confirmed_at": None, "tier_mismatch": None,
    },
    "REF-018": {
        "id": "REF-018", "patient_id": "PAT-0182",
        "facility_id": "FAC-012", "facility_name": "Janakpuri Super Speciality Hospital",
        "risk_tier": "Critical", "predicted_tier": "Critical",
        "created_at": _days_ago(0), "status": "sent",
        "outcome_severity": None, "outcome_notes": None,
        "confirmed_at": None, "tier_mismatch": None,
    },
}

# Mutable in-memory store
_REFERRAL_STORE: Dict[str, dict] = dict(_SEED_REFERRALS)


@router.get("/referrals", response_model=ReferralListResponse, summary="List All Referrals with Status")
async def list_referrals() -> ReferralListResponse:
    """
    **GET /api/referrals**

    Returns all referral records including synthetic historical seed data.
    Includes status breakdown summary.
    """
    records = list(_REFERRAL_STORE.values())
    summary: Dict[str, int] = {}
    for r in records:
        summary[r["status"]] = summary.get(r["status"], 0) + 1

    return ReferralListResponse(
        referrals=[ReferralRecord(**r) for r in records],
        total=len(records),
        summary=summary,
    )


@router.post("/referrals/{referral_id}/confirm", response_model=ReferralRecord, summary="Mark Referral Outcome")
async def confirm_referral(referral_id: str, body: ConfirmOutcomeRequest) -> ReferralRecord:
    """
    **POST /api/referrals/{referral_id}/confirm**

    Marks a referral's actual clinical outcome, updating status to 'outcome_known'.
    Computes whether predicted tier matches actual outcome severity (for mismatch log).
    """
    if referral_id not in _REFERRAL_STORE:
        raise HTTPException(status_code=404, detail=f"Referral ID {referral_id} not found.")

    ref = _REFERRAL_STORE[referral_id]
    ref["status"] = "outcome_known"
    ref["outcome_severity"] = body.outcome_severity
    ref["outcome_notes"] = body.outcome_notes
    ref["confirmed_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # Compute mismatch
    tier_order = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
    pred_ord = tier_order.get(ref["predicted_tier"], 0)
    actual_ord = tier_order.get(body.outcome_severity, 0)
    ref["tier_mismatch"] = (pred_ord != actual_ord)

    _REFERRAL_STORE[referral_id] = ref
    return ReferralRecord(**ref)


@router.get("/mismatch-log", response_model=MismatchLogResponse, summary="Tier Prediction vs Actual Outcome Mismatch Log")
async def get_mismatch_log() -> MismatchLogResponse:
    """
    **GET /api/mismatch-log**

    Returns cases where the predicted risk tier did not match the actual outcome severity.
    Labelled conceptually as input for rule-weight review.
    
    ⚠️ CONCEPTUAL ONLY: No live model retraining is implemented. 
    This log is designed to feed human auditor review of rule weights.
    """
    mismatches = []
    total_with_outcome = 0

    tier_order = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}

    for ref in _REFERRAL_STORE.values():
        if ref["outcome_severity"] is not None:
            total_with_outcome += 1
            pred_ord = tier_order.get(ref["predicted_tier"], 0)
            actual_ord = tier_order.get(ref["outcome_severity"], 0)

            if pred_ord != actual_ord:
                mismatch_type = "under_triaged" if actual_ord > pred_ord else "over_triaged"
                mismatches.append(MismatchEntry(
                    referral_id=ref["id"],
                    patient_id=ref["patient_id"],
                    predicted_tier=ref["predicted_tier"],
                    actual_severity=ref["outcome_severity"],
                    mismatch_type=mismatch_type,
                    facility=ref["facility_name"],
                    date=ref["confirmed_at"] or ref["created_at"],
                ))

    mismatch_rate = round((len(mismatches) / total_with_outcome * 100), 1) if total_with_outcome > 0 else 0.0

    return MismatchLogResponse(
        mismatches=mismatches,
        total_mismatches=len(mismatches),
        total_referrals=total_with_outcome,
        mismatch_rate_pct=mismatch_rate,
        conceptual_note="CONCEPTUAL ONLY: This log is designed to feed manual rule-weight review. No live model retraining is implemented.",
    )
