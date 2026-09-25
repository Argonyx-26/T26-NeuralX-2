# SetuHealth Backend API

> Clinical risk-triage and referral-routing system — Hackathon build  
> **Single command start:** `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`

---

## Stack
- **Framework:** FastAPI (Python 3.12)
- **Scoring:** Deterministic weighted rule engine (LLM-free)
- **LLM:** Claude via Anthropic Messages API — symptom extraction + clarifying questions ONLY
- **Storage:** In-memory (SQLite optional upgrade)

## Setup

```bash
cp .env.example .env
# Set ANTHROPIC_API_KEY in .env
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive docs: http://localhost:8000/docs

---

## What's Real vs Simulated

| Component | Status | Notes |
|-----------|--------|-------|
| Deterministic scoring engine | ✅ **REAL** | Weighted rule engine, no ML/LLM |
| Rule weights & thresholds | ✅ **REAL** | Auditable named constants in `app/core/rules.py` |
| Confidence & conflict detection | ✅ **REAL** | Deterministic completeness + signal-coherence checks |
| LLM extraction (Claude) | ✅ **REAL** | Anthropic API — structured JSON extraction only |
| Clarifying question generation | ✅ **REAL** | LLM-generated, LLM never scores |
| Facility dataset | ⚠️ **SIMULATED** | 12 hand-authored mock facilities; flagged in API response |
| Routing weighted score | ✅ **REAL** | Deterministic formula with named weight constants |
| ETA calculation | ⚠️ **ESTIMATED** | Simple distance / 40 km/h — no real traffic data |
| Referral records | ⚠️ **SYNTHETIC** | 18 pre-seeded historical referrals for dashboard demo |
| Mismatch log | ⚠️ **CONCEPTUAL** | No live learning — feeds human rule-weight review only |

---

## API Endpoints

### Phase 1 — Triage & Scoring

#### `POST /api/extract`
Parses free-text patient narrative into structured JSON via LLM.

**Request:**
```json
{
  "patient_text": "55-year-old male, crushing chest pain for 2 hours, radiating to left jaw. HR 130, BP 85/60, SpO2 91%.",
  "raw_vitals": null,
  "raw_history": ["diabetes", "hypertension"]
}
```

**Response:**
```json
{
  "symptoms": [{ "name": "chest_pain", "severity": "severe", "duration_hours": 2, "details": "radiating to left jaw" }],
  "vitals": { "heart_rate": 130, "systolic_bp": 85, "spo2": 91.0, "respiratory_rate": null, ... },
  "age": 55,
  "history": ["diabetes", "hypertension"],
  "pregnancy": false,
  "extraction_summary": "55-year-old male presenting with acute severe chest pain...",
  "ready_for_scoring": { "symptoms": [...], "vitals": {...}, "age": 55, "history": [...] }
}
```

---

#### `POST /api/score`
Runs the deterministic risk scoring engine. **No LLM involved.**

**Request:**
```json
{
  "symptoms": [{ "name": "chest_pain", "severity": "severe", "details": "radiating to left jaw" }],
  "vitals": { "heart_rate": 130, "systolic_bp": 85, "spo2": 91.0, "respiratory_rate": 26, "consciousness_level": "Alert" },
  "age": 55,
  "history": ["diabetes"],
  "pregnancy": false
}
```

**Response:**
```json
{
  "risk_tier": "Critical",
  "contributing_factors": [
    { "factor": "RED FLAG: Suspected Acute Coronary Syndrome", "weight": 5.0, "value": "chest pain radiating to left jaw", "category": "red_flag", "rationale": "..." },
    { "factor": "HEART RATE: Severe Tachycardia (>= 131 bpm)", "weight": 3.0, "value": 130, "category": "vitals", "rationale": "..." }
  ],
  "confidence": 0.85,
  "recommended_action": "IMMEDIATE EMERGENCY RESUSCITATION: Activate emergency response (108/EMS)...",
  "score_breakdown": {
    "physiological_score": 12.0,
    "symptom_score": 7.5,
    "comorbidity_score": 1.5,
    "total_raw_score": 21.0
  },
  "is_uncertain": false,
  "uncertainty_reasons": []
}
```

---

### Phase 2 — Uncertainty Handler

#### `POST /api/clarify`
Call when `score.is_uncertain == true` or `score.confidence < 0.65`.  
Generates 1-2 targeted clinical questions via LLM.

**Request:**
```json
{
  "original_score": { ... },
  "original_request": { ... },
  "patient_context_summary": "Patient reported chest pain but all vitals normal."
}
```

**Response:**
```json
{
  "questions": [
    "Is the patient able to speak full sentences without stopping to breathe?",
    "Has the patient lost consciousness or become confused in the last 30 minutes?"
  ],
  "ambiguity_trigger": "conflicting_physiological_signals",
  "uncertainty_reasons": ["Severe red-flag symptom reported despite entirely normal baseline vital signs."],
  "session_token": "uuid-v4-string"
}
```

---

#### `POST /api/clarify/answer`
Submit answers and re-score. Hard limit: **1 round max**, then escalate.

**Request:**
```json
{
  "session_token": "uuid-v4-string",
  "original_request": { ... },
  "answers": { "0": "Patient cannot finish sentences", "1": "No loss of consciousness" },
  "clarify_round": 1
}
```

**Response:**
```json
{
  "final_score": { "risk_tier": "High", "confidence": 0.78, ... },
  "was_resolved": true,
  "escalated": false,
  "escalation_reason": null,
  "round_used": 1
}
```

If still uncertain after round 1:
```json
{
  "final_score": { "risk_tier": "Uncertain", "recommended_action": "Escalate to human review", ... },
  "was_resolved": false,
  "escalated": true,
  "escalation_reason": "Uncertainty not resolved after one round..."
}
```

---

### Phase 3 — Smart Routing

#### `POST /api/route`
Capacity-aware facility routing using weighted score:  
`score = 0.35 × distance_score + 0.40 × load_score + 0.25 × specialty_score`

**Request:**
```json
{
  "risk_tier": "Critical",
  "required_specialty": "cardiology",
  "patient_location": null
}
```

**Response:**
```json
{
  "recommended_facility": {
    "facility_id": "FAC-004",
    "name": "Fortis Escorts Heart Institute",
    "distance_km": 13.5,
    "current_load_pct": 55,
    "icu_beds_available": 12,
    "specialists_on_call": ["cardiology", "cardiac_surgery"],
    "routing_score": 0.7230,
    "score_breakdown": { "distance_score": 0.2608, "load_score": 0.2200, "specialty_score": 0.2500 },
    "eta_minutes": 20
  },
  "ranked_list": [ {...}, {...}, {...} ],
  "routing_rationale": "Fortis Escorts Heart Institute was selected...",
  "data_source": "SIMULATED",
  "risk_tier": "Critical",
  "required_specialty": "cardiology"
}
```

---

### Phase 4 — Outcome Tracking

#### `GET /api/referrals`
Returns all referrals (18 seeded + any created during session).

**Response:**
```json
{
  "referrals": [
    {
      "id": "REF-001", "patient_id": "PAT-0012", "facility_id": "FAC-001",
      "risk_tier": "Critical", "predicted_tier": "Critical",
      "status": "outcome_known", "outcome_severity": "Critical",
      "tier_mismatch": false, ...
    }
  ],
  "total": 18,
  "summary": { "outcome_known": 9, "confirmed": 4, "sent": 4, "lost_to_followup": 1 }
}
```

#### `POST /api/referrals/{id}/confirm`
```json
{ "outcome_severity": "High", "outcome_notes": "Haemorrhagic stroke confirmed on CT." }
```

#### `GET /api/mismatch-log`
```json
{
  "mismatches": [
    {
      "referral_id": "REF-006", "predicted_tier": "High", "actual_severity": "Critical",
      "mismatch_type": "under_triaged", "facility": "AIIMS New Delhi", "date": "..."
    }
  ],
  "total_mismatches": 4,
  "total_referrals": 9,
  "mismatch_rate_pct": 44.4,
  "conceptual_note": "CONCEPTUAL ONLY: This log is designed to feed manual rule-weight review. No live model retraining is implemented."
}
```

---

## Scoring Engine Architecture

```
POST /api/extract (Claude LLM)
        │ structured JSON
        ▼
POST /api/score (Deterministic Engine)
  ├─ Physiology Vitals → NEWS2-style threshold matrix → points
  ├─ Symptoms          → Red-flag pattern matching     → points
  ├─ Comorbidities/Age → Named weight map              → points
  │
  ├─ Total Score → CRITICAL (≥8) / HIGH (≥5) / MEDIUM (≥2.5) / LOW
  ├─ Confidence  → Data completeness + signal coherence
  └─ Uncertainty → confidence < 0.65 OR conflicting signals
          │
          ▼ (if uncertain)
POST /api/clarify → (LLM questions) → POST /api/clarify/answer
          │
          ▼ (always)
POST /api/route → Weighted facility ranking → recommended facility
```

---

## Rule Engine Key Parameters

| Parameter | Value | File |
|-----------|-------|------|
| Critical score threshold | 8.0 pts | `app/core/rules.py` |
| High score threshold | 5.0 pts | `app/core/rules.py` |
| Medium score threshold | 2.5 pts | `app/core/rules.py` |
| Uncertainty confidence cutoff | 0.65 | `app/config.py` |
| Distance routing weight | 0.35 | `app/routes/routing.py` |
| Load routing weight | 0.40 | `app/routes/routing.py` |
| Specialty routing weight | 0.25 | `app/routes/routing.py` |
| Max clarification rounds | 1 | `app/routes/clarify.py` |
