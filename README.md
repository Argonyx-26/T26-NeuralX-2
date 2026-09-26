<div align="center">
  <img src="https://img.shields.io/badge/Argonyx'26-Round%202-blue?style=for-the-badge" alt="Argonyx'26 Round 2">
  <h1>SetuHealth</h1>
  <h3>Intelligent Early Health-Risk Detection & Decision Support System</h3>
  <p><i>Real-time triage, capacity-aware routing, and closed-loop care delivery.</i></p>
</div>

---

## 🏆 Team NeuralX (Team ID: 26)
| Name | USN | Email | Role |
| :--- | :--- | :--- | :--- |
| **Sanchali Parikh** | 1NT24AD053 | 1nt24ad053.sanchali@nmit.ac.in | Team Lead |
| **Adit Jain** | 1NT24AD004 | 1nt24ad004.adit@nmit.ac.in | Member |
| **Jagriti Kesarwani** | 1NT24AD029 | 1nt24ad029.jagriti@nmit.ac.in | Member |
| **Mizba Khanum** | 1NT24AD037 | 1nt24ad037.mizba@nmit.ac.in | Member |

---

## 📖 Overview
SetuHealth is an intelligent early health-risk detection and decision support system that bridges patient symptoms to the specific healthcare facility capable of providing timely care. 

Unlike standard tools that provide generic instructions to "go to a hospital," SetuHealth pinpoints exact facility capacity, provides actionable smart routing, and tracks patient outcomes through to confirmed care.

### 🌟 Key Features
* **Active Uncertainty Handling:** Asks clarifying questions and explicitly escalates ambiguous cases rather than offering unsafe reassurance.
* **Capacity-Aware Smart Routing:** Matches patients to specific facilities with current bed/ICU/specialist capacity and an ETA.
* **Closed-Loop Outcome Tracking:** Confirms whether the patient actually reached care, eliminating the "referral-to-nowhere" gap.
* **Explainability by Default:** Native return of risk tier, contributing factors, and confidence on every evaluation.

---

## 🛠️ Technical Implementation

### Tech Stack
* **Frontend:** React (Vite) + Tailwind CSS
* **Backend API:** FastAPI (Python 3.12)
* **Core Logic & AI:** Deterministic Python Rule Engine (for risk scoring & confidence evaluation). LLM API (Claude via Anthropic Messages API) is used **strictly for extraction and explanations** — never for scoring.
* **Data Storage & Logs:** SQLite
* **Observability:** Raha (Free Version) — web analytics and network observability used to track Web Vitals on the frontend only. Due to cost constraints, there is no active backend API endpoint for Raha.

### Full System Architecture (Live Logic vs. Simulated Data)
* **Live Logic:** Symptom & vitals input ➔ LLM extraction ➔ Rule-engine scoring ➔ Uncertainty check
* **Simulated for Demo:** Facility-capacity routing ➔ Outcome confirmation

---

## 🚀 Setup & Execution (Backend API)

```bash
# 1. Clone the repository and configure environment variables
cp .env.example .env
# Note: Set ANTHROPIC_API_KEY in the .env file

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start the FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> **Interactive API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 💡 Core Workflow
1. **Intake & Biometrics:** Frontline workers input vitals and symptoms (abnormal values highlight in red).
2. **Confidence Gate & Scoring:** Deterministic triage engine (NEWS2 rule matrix) scores inputs in a single atomic call. Clear acute cases lock into a critical tier immediately.
3. **Active Uncertainty Handler:** Ambiguous cases trigger 1-2 targeted clarifying questions. 
4. **Capacity Routing:** One-click live GPS matching filters nearby facilities with available bed/specialty capacity (using OpenStreetMap Nominatim fallback geocoding).
5. **Dispatch & Track:** Immutable packet logged to SQLite and tracked until admission confirmation via the accountability dashboard.

---

## 📊 Prototype Status & Testing Results

**MVP:** A 5-part prototype featuring a deterministic FastAPI triage engine, active uncertainty handler, live OpenStreetMap geolocation routing module (0.6–5.1 km), persistent SQLite database, and closed-loop accountability dashboard.

* **Performance:** Achieved 100% reproducible results across 3 clinical profiles with sub-100ms rule inference, 420ms geocoding latency, and zero session data drops.
* **Mitigating Hallucination Risk:** Solved by decoupling generative AI from risk scoring and routing it through a mathematical rule matrix.
* **Location Inflexibility:** Overcame fixed coordinates by implementing client-side OpenStreetMap Nominatim fallback geocoding.

### What's Real vs. Simulated

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

## 💼 Business Impact & Market Potential

* **Target Users:** Frontline Providers (Rural clinics, helpline operators), Facility Coordinators (ED intake desks), System Stakeholders.
* **Value Proposition:** Clinical Safety & Speed, Capacity-Aware Routing, Closed-Loop Accountability.
* **Market:** Public Health Networks, Telemedicine & Helpline Ecosystems, Alignment with Ayushman Bharat Digital Mission (ABDM).
* **Business Model:** B2G (District/state SaaS), B2B (Tiered SaaS for private networks), Add-on Services (Advanced analytics).
* **Scalability Roadmap:**
  * *Phase 1 (The Cold-Start Solution):* Single-district pilot launch using semi-automated capacity feeds.
  * *Phase 2 (Regional Expansion):* API integration with existing hospital management information systems (HMIS).
  * *Phase 3 (Statewide/National Scale):* Fully automated, multi-tenant cloud architecture.

---

## 🔌 API Endpoints Reference

### Phase 1 — Triage & Scoring

#### `POST /api/extract`
Parses free-text patient narrative into structured JSON via LLM.

#### `POST /api/score`
Runs the deterministic risk scoring engine. **No LLM involved.**
Returns risk tier, contributing factors, confidence, recommended action, and score breakdown natively.

### Phase 2 — Uncertainty Handler

#### `POST /api/clarify`
Call when `score.is_uncertain == true` or `score.confidence < 0.65`.  
Generates 1-2 targeted clinical questions via LLM.

#### `POST /api/clarify/answer`
Submit answers and re-score. Hard limit: **1 round max**, then escalate.

### Phase 3 — Smart Routing

#### `POST /api/route`
Capacity-aware facility routing using weighted score:  
`score = 0.35 × distance_score + 0.40 × load_score + 0.25 × specialty_score`

### Phase 4 — Outcome Tracking

#### `GET /api/referrals`
Returns all referrals (18 seeded + any created during session).

#### `POST /api/referrals/{id}/confirm`
Confirm outcome of a referral.

#### `GET /api/mismatch-log`
Logs discrepancies between predicted tier and actual severity for future manual rule-weight reviews.

---

## ⚙️ Scoring Engine Architecture & Parameters

```text
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

| Parameter | Value | Location in Code |
|-----------|-------|------|
| Critical score threshold | 8.0 pts | `app/core/rules.py` |
| High score threshold | 5.0 pts | `app/core/rules.py` |
| Medium score threshold | 2.5 pts | `app/core/rules.py` |
| Uncertainty confidence cutoff | 0.65 | `app/config.py` |
| Distance routing weight | 0.35 | `app/routes/routing.py` |
| Load routing weight | 0.40 | `app/routes/routing.py` |
| Specialty routing weight | 0.25 | `app/routes/routing.py` |
| Max clarification rounds | 1 | `app/routes/clarify.py` |

---

## 📚 References
1. **National Early Warning Score 2 (NEWS2)** — Royal College of Physicians, endorsed by NHS England. Foundation for our risk-scoring structure.
2. Tahermazandarani, M. et al. *"When Confidence Fails: Overconfidence in LLMs under Uncertainty and Missing Clinical Information."* arXiv (2026).
3. Mass General Brigham / JAMA Network Open (Apr 2026) — LLMs: 90%+ accurate with complete data, 80%+ failure rate on differential diagnosis with incomplete data.
4. BMJ Open (Ada Health-led comparative study) — 8 symptom checker apps: average 38% diagnostic accuracy vs. 82% for human GPs.
5. **Ayushman Bharat Digital Mission (ABDM)** — Government of India digital health infrastructure, our stated integration path.
