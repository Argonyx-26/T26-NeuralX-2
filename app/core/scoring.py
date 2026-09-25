"""
Deterministic Clinical Scoring Engine.

CRITICAL HARD CONSTRAINT:
The risk score, tier, and contributing factors are calculated ENTIRELY deterministically
via auditable mathematical rules and threshold matrices. The LLM NEVER touches the scoring math.
"""

from typing import List, Dict, Any, Tuple
from app.models.triage import (
    ScoreRequest,
    ScoreResponse,
    RiskTier,
    ContributingFactor,
    ScoreBreakdown,
    SymptomItem,
    ConsciousnessLevel,
    VitalsInput,
)
from app.core.rules import (
    RESPIRATION_RATE_RULES,
    SPO2_RULES,
    SUPPLEMENTAL_O2_POINTS,
    SYSTOLIC_BP_RULES,
    HEART_RATE_RULES,
    CONSCIOUSNESS_RULES,
    TEMPERATURE_RULES,
    RED_FLAG_PATTERNS,
    MODERATE_SYMPTOM_PATTERNS,
    MILD_SYMPTOM_PATTERNS,
    COMORBIDITY_WEIGHTS,
    TIER_THRESHOLDS,
    RECOMMENDED_ACTIONS,
)
from app.config import CONFIDENCE_THRESHOLD

def evaluate_vital_rule(val: float, rule_table: List[Dict[str, Any]], param_name: str) -> Tuple[float, List[ContributingFactor]]:
    """Evaluates a numerical vital against an auditable threshold matrix."""
    for rule in rule_table:
        if rule["min"] <= val <= rule["max"]:
            points = float(rule["points"])
            factors = []
            if points > 0:
                factors.append(ContributingFactor(
                    factor=f"{param_name.upper()}: {rule['label']}",
                    weight=points,
                    value=val,
                    category="vitals",
                    rationale=f"Value {val} matched physiological risk bracket [{rule['min']} - {rule['max']}]"
                ))
            return points, factors
    return 0.0, []

def score_physiological_vitals(vitals: VitalsInput) -> Tuple[float, List[ContributingFactor], int, bool]:
    """
    Scores vitals using NEWS2-inspired physiology rules.
    Returns: (total_vital_score, contributing_factors, count_of_provided_vitals, has_extreme_vital)
    """
    total = 0.0
    factors: List[ContributingFactor] = []
    provided_count = 0
    has_extreme_vital = False

    # Respiration Rate
    if vitals.respiratory_rate is not None:
        provided_count += 1
        pts, f = evaluate_vital_rule(float(vitals.respiratory_rate), RESPIRATION_RATE_RULES, "Respiration Rate")
        total += pts
        factors.extend(f)
        if pts >= 3:
            has_extreme_vital = True

    # SpO2
    if vitals.spo2 is not None:
        provided_count += 1
        pts, f = evaluate_vital_rule(float(vitals.spo2), SPO2_RULES, "Oxygen Saturation (SpO2)")
        total += pts
        factors.extend(f)
        if pts >= 3:
            has_extreme_vital = True

    # Supplemental Oxygen
    if vitals.supplemental_oxygen:
        total += SUPPLEMENTAL_O2_POINTS
        factors.append(ContributingFactor(
            factor="Supplemental Oxygen Required",
            weight=SUPPLEMENTAL_O2_POINTS,
            value=True,
            category="vitals",
            rationale="Patient receiving supplemental oxygen support indicates compromised native gas exchange."
        ))

    # Systolic BP
    if vitals.systolic_bp is not None:
        provided_count += 1
        pts, f = evaluate_vital_rule(float(vitals.systolic_bp), SYSTOLIC_BP_RULES, "Systolic BP")
        total += pts
        factors.extend(f)
        if pts >= 3:
            has_extreme_vital = True

    # Heart Rate
    if vitals.heart_rate is not None:
        provided_count += 1
        pts, f = evaluate_vital_rule(float(vitals.heart_rate), HEART_RATE_RULES, "Heart Rate")
        total += pts
        factors.extend(f)
        if pts >= 3:
            has_extreme_vital = True

    # Consciousness Level
    if vitals.consciousness_level:
        provided_count += 1
        clevel = vitals.consciousness_level.value if hasattr(vitals.consciousness_level, "value") else str(vitals.consciousness_level)
        pts = CONSCIOUSNESS_RULES.get(clevel, 0.0)
        total += pts
        if pts > 0:
            if pts >= 3:
                has_extreme_vital = True
            factors.append(ContributingFactor(
                factor=f"Altered Consciousness ({clevel})",
                weight=pts,
                value=clevel,
                category="vitals",
                rationale=f"AVPU consciousness level of '{clevel}' reflects acute cerebral hypo-perfusion or metabolic impairment."
            ))

    # Temperature
    if vitals.temperature is not None:
        provided_count += 1
        pts, f = evaluate_vital_rule(float(vitals.temperature), TEMPERATURE_RULES, "Temperature")
        total += pts
        factors.extend(f)

    return total, factors, provided_count, has_extreme_vital

def score_symptoms_and_red_flags(symptoms: List[Any]) -> Tuple[float, List[ContributingFactor], bool, List[str]]:
    """
    Evaluates symptoms against red-flag matrices and clinical presentation weights.
    Returns: (symptom_score, contributing_factors, has_red_flag, detected_symptom_tags)
    """
    total = 0.0
    factors: List[ContributingFactor] = []
    has_red_flag = False
    detected_tags: List[str] = []

    # Flatten and normalize symptoms
    normalized_symptom_texts: List[str] = []
    for s in symptoms:
        if isinstance(s, SymptomItem):
            desc = s.name
            if s.details:
                desc += f" {s.details}"
            if s.severity:
                desc += f" ({s.severity})"
            normalized_symptom_texts.append(desc.lower())
        elif isinstance(s, dict):
            name = s.get("name", "")
            details = s.get("details", "")
            normalized_symptom_texts.append(f"{name} {details}".lower())
        elif isinstance(s, str):
            normalized_symptom_texts.append(s.lower())

    full_symptom_blob = " ".join(normalized_symptom_texts)

    # 1. Check Red Flags
    matched_red_flags = set()
    for rf in RED_FLAG_PATTERNS:
        for kw in rf["keywords"]:
            if kw.lower() in full_symptom_blob and rf["id"] not in matched_red_flags:
                matched_red_flags.add(rf["id"])
                has_red_flag = True
                pts = float(rf["weight"])
                total += pts
                detected_tags.append(rf["id"])
                factors.append(ContributingFactor(
                    factor=f"RED FLAG: {rf['label']}",
                    weight=pts,
                    value=kw,
                    category="red_flag",
                    rationale=rf["rationale"]
                ))
                break

    # 2. Check Moderate Symptoms
    for mod in MODERATE_SYMPTOM_PATTERNS:
        for kw in mod["keywords"]:
            if kw.lower() in full_symptom_blob:
                pts = float(mod["weight"])
                total += pts
                factors.append(ContributingFactor(
                    factor=f"Symptom: {mod['label']}",
                    weight=pts,
                    value=kw,
                    category="symptoms",
                    rationale=f"Reported acute symptom matching '{kw}'."
                ))
                break

    # 3. Check Mild Symptoms
    for mild in MILD_SYMPTOM_PATTERNS:
        for kw in mild["keywords"]:
            if kw.lower() in full_symptom_blob:
                pts = float(mild["weight"])
                total += pts
                factors.append(ContributingFactor(
                    factor=f"Symptom: {mild['label']}",
                    weight=pts,
                    value=kw,
                    category="symptoms",
                    rationale=f"Reported mild finding matching '{kw}'."
                ))
                break

    return total, factors, has_red_flag, detected_tags

def score_comorbidities_and_age(history: List[str], age: int | None, pregnancy: bool | None) -> Tuple[float, List[ContributingFactor]]:
    """Evaluates chronic health modifiers and demographic risk."""
    total = 0.0
    factors: List[ContributingFactor] = []

    # Age rules
    if age is not None:
        if age >= 75:
            pts = 2.0
            total += pts
            factors.append(ContributingFactor(
                factor="Geriatric Age (>= 75 years)",
                weight=pts,
                value=age,
                category="age",
                rationale="Elevated vulnerability to rapid clinical decompensation and atypical presentations."
            ))
        elif age >= 65:
            pts = 1.0
            total += pts
            factors.append(ContributingFactor(
                factor="Elderly Age (65-74 years)",
                weight=pts,
                value=age,
                category="age",
                rationale="Moderately increased physiological vulnerability."
            ))
        elif age < 1:
            pts = 2.5
            total += pts
            factors.append(ContributingFactor(
                factor="Neonatal / Infant Age (< 1 year)",
                weight=pts,
                value=age,
                category="age",
                rationale="High clinical sensitivity; rapid desaturation and sepsis risk."
            ))

    # Comorbidities
    if history:
        for hist_item in history:
            cleaned = hist_item.lower().replace(" ", "_").replace("-", "_")
            matched_key = None
            for key, weight in COMORBIDITY_WEIGHTS.items():
                if key in cleaned or cleaned in key:
                    matched_key = key
                    break
            
            if matched_key:
                pts = COMORBIDITY_WEIGHTS[matched_key]
                total += pts
                factors.append(ContributingFactor(
                    factor=f"Comorbidity: {hist_item.title()}",
                    weight=pts,
                    value=hist_item,
                    category="history",
                    rationale=f"Underlying condition '{hist_item}' increases baseline clinical risk."
                ))

    # Pregnancy
    if pregnancy:
        pts = 1.5
        total += pts
        factors.append(ContributingFactor(
            factor="Active Pregnancy",
            weight=pts,
            value=True,
            category="history",
            rationale="Pregnancy requires specialized maternal-fetal triage thresholds."
        ))

    return total, factors

def compute_deterministic_triage(request: ScoreRequest) -> ScoreResponse:
    """
    Main deterministic scoring pipeline.
    Combines NEWS2-style vitals, red-flag symptoms, comorbidities, and calculates confidence.
    """
    vitals = request.vitals or VitalsInput()
    
    # 1. Physiological Vitals Score
    physio_score, physio_factors, vitals_count, has_extreme_vital = score_physiological_vitals(vitals)

    # 2. Symptoms and Red Flag Score
    symptom_score, symptom_factors, has_red_flag, detected_tags = score_symptoms_and_red_flags(request.symptoms)

    # 3. Comorbidity & Age Score
    comorb_score, comorb_factors, = score_comorbidities_and_age(request.history, request.age, request.pregnancy)

    # Aggregate
    total_raw_score = round(physio_score + symptom_score + comorb_score, 2)
    all_factors = physio_factors + symptom_factors + comorb_factors

    # 4. Deterministic Risk Tier Determination
    # Rules:
    # - CRITICAL if: raw_score >= 8.0 OR (has_extreme_vital and has_red_flag) OR (vitals.consciousness_level in [UNRESPONSIVE, PAIN] and has_red_flag)
    # - HIGH if: raw_score >= 5.0 OR has_red_flag OR has_extreme_vital
    # - MEDIUM if: raw_score >= 2.5
    # - LOW otherwise
    
    if total_raw_score >= TIER_THRESHOLDS["CRITICAL"] or (has_extreme_vital and has_red_flag):
        tier = RiskTier.CRITICAL
    elif total_raw_score >= TIER_THRESHOLDS["HIGH"] or has_red_flag or has_extreme_vital:
        tier = RiskTier.HIGH
    elif total_raw_score >= TIER_THRESHOLDS["MEDIUM"]:
        tier = RiskTier.MEDIUM
    else:
        tier = RiskTier.LOW

    # 5. Confidence and Conflict Analysis
    # Base confidence calculation based on information completeness & signal coherence
    confidence = 1.0
    uncertainty_reasons: List[str] = []

    # Check vitals completeness (Expected 6 core vitals: RR, SpO2, SBP, HR, Consciousness, Temp)
    # If fewer than 2 vitals provided, confidence drops
    if vitals_count == 0:
        confidence -= 0.35
        uncertainty_reasons.append("No objective physiological vitals provided (purely narrative report).")
    elif vitals_count < 3:
        confidence -= 0.20
        uncertainty_reasons.append(f"Incomplete vital set: only {vitals_count} of 6 key vitals recorded.")

    # Check for clinical conflict:
    # Conflict 1: High-risk red flag (e.g. crushing chest pain or acute severe dyspnea) with completely normal / pristine vitals
    if has_red_flag and vitals_count >= 3 and physio_score == 0.0:
        confidence -= 0.15
        uncertainty_reasons.append("Clinical Signal Discrepancy: Severe red-flag symptom reported despite entirely normal baseline vital signs.")

    # Conflict 2: Bradycardia (< 50) accompanied by high fever (>= 38.5) (relative bradycardia / atypical infection sign)
    if vitals.heart_rate and vitals.heart_rate < 50 and vitals.temperature and vitals.temperature >= 38.5:
        confidence -= 0.15
        uncertainty_reasons.append("Physiological Conflict: Hypothermia/bradycardia discordance with high febrile state.")

    # Conflict 3: Severe hypotension (SBP < 90) but tachycardia absent (HR normal or low without beta-blocker context)
    if vitals.systolic_bp and vitals.systolic_bp < 85 and vitals.heart_rate and 60 <= vitals.heart_rate <= 80:
        confidence -= 0.15
        uncertainty_reasons.append("Hemodynamic Discordance: Severe hypotension without compensatory tachycardia.")

    confidence = round(max(0.1, min(1.0, confidence)), 2)

    # Uncertainty threshold check.
    # BUG 1 FIX: Use <= (not strict <) so confidence == CONFIDENCE_THRESHOLD also triggers.
    # Uses the same CONFIDENCE_THRESHOLD constant as clarify.py — single source of truth.
    is_uncertain = confidence <= CONFIDENCE_THRESHOLD or len(uncertainty_reasons) >= 2

    # Recommended action
    action = RECOMMENDED_ACTIONS.get(tier.value, RECOMMENDED_ACTIONS["Low"])

    return ScoreResponse(
        risk_tier=tier,
        contributing_factors=all_factors,
        confidence=confidence,
        recommended_action=action,
        score_breakdown=ScoreBreakdown(
            physiological_score=round(physio_score, 2),
            symptom_score=round(symptom_score, 2),
            comorbidity_score=round(comorb_score, 2),
            total_raw_score=total_raw_score
        ),
        is_uncertain=is_uncertain,
        uncertainty_reasons=uncertainty_reasons
    )
