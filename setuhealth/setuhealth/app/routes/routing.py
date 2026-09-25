"""
Phase 3 — Capacity-Aware Smart Routing Routes.

POST /api/route — takes risk_tier + required_specialty, returns ranked facility list.

Routing Score Formula:
    score = (W_DISTANCE * distance_score) + (W_LOAD * load_score) + (W_SPECIALTY * specialty_score)

All weights are named constants — no magic numbers.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict
from app.models.routing import RouteRequest, RouteResponse, FacilityMatch
from app.models.triage import RiskTier
from app.data.facilities import FACILITIES

router = APIRouter()

# ==========================================
# ROUTING WEIGHTS — tunable named constants
# ==========================================
W_DISTANCE = 0.35    # Distance is important but not dominant — closer is better
W_LOAD = 0.40        # Load/capacity is most important — an overloaded unit is worse than a distant one
W_SPECIALTY = 0.25   # Specialty match matters, especially for Critical/High tiers

# Distance normalization ceiling (km) — beyond this, score is 0 on distance axis
MAX_DISTANCE_KM = 50.0

# Average ambulance/emergency vehicle speed for ETA calculation (km/h)
AVG_SPEED_KMH = 40.0

# Minimum ICU beds for Critical tier routing (prefer facilities with >= this)
MIN_ICU_BEDS_CRITICAL = 3

# Specialty synonym map — normalize common specialty names
SPECIALTY_SYNONYMS: Dict[str, List[str]] = {
    "cardiology": ["cardiology", "cardiac_surgery", "cardiovascular"],
    "neurology": ["neurology", "neurosurgery", "stroke"],
    "trauma": ["trauma_surgery", "orthopedics", "general_surgery"],
    "obstetrics": ["obstetrics", "maternity", "gynecology"],
    "pediatrics": ["pediatrics", "neonatology"],
    "critical_care": ["critical_care", "icu", "intensive_care"],
    "nephrology": ["nephrology", "dialysis"],
    "general": ["general_medicine", "general_surgery"],
}


def normalize_specialty(specialty: Optional[str]) -> Optional[str]:
    if not specialty:
        return None
    specialty_lower = specialty.lower().replace(" ", "_")
    for canonical, synonyms in SPECIALTY_SYNONYMS.items():
        if specialty_lower in synonyms or specialty_lower == canonical:
            return canonical
    return specialty_lower


def infer_specialty_from_tier(tier: RiskTier) -> str:
    """Auto-infer required specialty if not provided, based on risk tier."""
    if tier in (RiskTier.CRITICAL, RiskTier.HIGH):
        return "critical_care"
    return "general"


def compute_specialty_score(facility_specialists: List[str], required_specialty: str) -> float:
    """Returns 1.0 if exact/synonym match, 0.5 if critical_care available, else 0.0."""
    synonyms = SPECIALTY_SYNONYMS.get(required_specialty, [required_specialty])
    for specialist in facility_specialists:
        if specialist in synonyms or specialist == required_specialty:
            return 1.0
    if "critical_care" in facility_specialists:
        return 0.5  # Partial match — can handle high acuity even without specialty
    return 0.0


def score_and_rank_facilities(
    risk_tier: RiskTier,
    required_specialty: str,
    top_n: int = 3,
) -> List[FacilityMatch]:
    """
    Computes routing score for each facility and returns top_n sorted by score (descending).
    
    Score formula:
        distance_score = 1 - (distance_km / MAX_DISTANCE_KM)  [0-1, higher = closer]
        load_score     = 1 - (current_load_pct / 100)          [0-1, higher = less loaded]
        specialty_score = 0 | 0.5 | 1.0                        [full/partial/no match]
        
        routing_score = W_DISTANCE * distance_score + W_LOAD * load_score + W_SPECIALTY * specialty_score
    """
    ranked: List[FacilityMatch] = []

    for fac in FACILITIES:
        dist = float(fac["distance_km"])
        load = float(fac["current_load_pct"])
        icu = int(fac["icu_beds_available"])

        # Hard filter: for Critical tier, require at least MIN_ICU_BEDS_CRITICAL
        if risk_tier == RiskTier.CRITICAL and icu < MIN_ICU_BEDS_CRITICAL:
            continue

        # Score components (all normalized to [0,1])
        dist_score = max(0.0, 1.0 - (dist / MAX_DISTANCE_KM))
        load_score = max(0.0, 1.0 - (load / 100.0))
        spec_score = compute_specialty_score(fac["specialists_on_call"], required_specialty)

        routing_score = round(
            (W_DISTANCE * dist_score) + (W_LOAD * load_score) + (W_SPECIALTY * spec_score),
            4
        )

        # ETA = distance / speed (in minutes)
        eta_minutes = int(round((dist / AVG_SPEED_KMH) * 60))

        ranked.append(FacilityMatch(
            facility_id=fac["facility_id"],
            name=fac["name"],
            distance_km=dist,
            current_load_pct=load,
            icu_beds_available=icu,
            specialists_on_call=fac["specialists_on_call"],
            routing_score=routing_score,
            score_breakdown={
                "distance_score": round(dist_score * W_DISTANCE, 4),
                "load_score": round(load_score * W_LOAD, 4),
                "specialty_score": round(spec_score * W_SPECIALTY, 4),
            },
            eta_minutes=eta_minutes,
            lat=fac.get("lat"),
            lng=fac.get("lng"),
        ))

    ranked.sort(key=lambda x: x.routing_score, reverse=True)
    return ranked[:top_n]


def build_routing_rationale(best: FacilityMatch, specialty: str, tier: RiskTier) -> str:
    """Generates a plain-language explanation of why the top facility was chosen."""
    lines = [
        f"{best.name} was selected as the optimal referral destination for a {tier.value}-risk patient",
        f"requiring {specialty.replace('_', ' ')} care.",
        f"It offers the best balance of proximity ({best.distance_km} km, ~{best.eta_minutes} min ETA),",
        f"current bed availability (current load: {best.current_load_pct}%, {best.icu_beds_available} ICU beds free),",
        f"and specialist match (on-call: {', '.join(best.specialists_on_call[:3])}).",
    ]
    return " ".join(lines)


@router.post("/route", response_model=RouteResponse, summary="Capacity-Aware Smart Facility Routing")
async def route_patient(request: RouteRequest) -> RouteResponse:
    """
    **POST /api/route**

    Routes a patient to the best-matched facility based on:
    - Distance (35% weight) — proximity for minimal transport time
    - Current load (40% weight) — avoid sending to overwhelmed facilities
    - Specialty match (25% weight) — ensure right clinical expertise

    Returns top 3 ranked facilities with full score breakdowns for frontend "why this one?" display.
    
    ⚠️ Data source: SIMULATED — clearly flagged in response body as `"data_source": "SIMULATED"`.
    """
    if request.risk_tier == RiskTier.UNCERTAIN:
        raise HTTPException(
            status_code=422,
            detail="Cannot route an Uncertain-tier patient. Resolve ambiguity via /api/clarify first or escalate to human review."
        )

    specialty = normalize_specialty(request.required_specialty) or infer_specialty_from_tier(request.risk_tier)

    ranked = score_and_rank_facilities(
        risk_tier=request.risk_tier,
        required_specialty=specialty,
    )

    if not ranked:
        # Edge case: no facility has enough ICU beds for Critical tier
        raise HTTPException(
            status_code=503,
            detail="No suitable facilities with sufficient ICU capacity found for Critical-tier routing. Escalate via emergency services."
        )

    best = ranked[0]
    rationale = build_routing_rationale(best, specialty, request.risk_tier)

    return RouteResponse(
        recommended_facility=best,
        ranked_list=ranked,
        routing_rationale=rationale,
        data_source="SIMULATED",
        risk_tier=request.risk_tier,
        required_specialty=specialty,
    )
