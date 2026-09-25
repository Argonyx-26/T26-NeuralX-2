"""
SetuHealth Deterministic Clinical Risk Rules & Auditable Weights.

NOTE: This rule engine is a weighted decision-support scoring model inspired by 
standard physiological early warning scores (such as NEWS2) and clinical red-flag 
triage frameworks. It is designed to be fully transparent, deterministic, and auditable.
"""

from typing import Dict, List, Any

# ==========================================
# 1. PHYSIOLOGICAL VITALS WEIGHTS (NEWS2-INSPIRED)
# ==========================================

# Respiration Rate (breaths / minute)
RESPIRATION_RATE_RULES = [
    {"max": 8, "min": 0, "points": 3, "label": "Severe Bradypnea (<= 8 bpm)", "category": "vitals"},
    {"max": 11, "min": 9, "points": 1, "label": "Mild Bradypnea (9-11 bpm)", "category": "vitals"},
    {"max": 20, "min": 12, "points": 0, "label": "Normal Respiration (12-20 bpm)", "category": "vitals"},
    {"max": 24, "min": 21, "points": 2, "label": "Moderate Tachypnea (21-24 bpm)", "category": "vitals"},
    {"max": 100, "min": 25, "points": 3, "label": "Severe Tachypnea (>= 25 bpm)", "category": "vitals"},
]

# Oxygen Saturation SpO2 (%)
SPO2_RULES = [
    {"max": 91.9, "min": 0, "points": 3, "label": "Severe Hypoxia (SpO2 <= 91%)", "category": "vitals"},
    {"max": 93.9, "min": 92.0, "points": 2, "label": "Moderate Hypoxia (SpO2 92-93%)", "category": "vitals"},
    {"max": 95.9, "min": 94.0, "points": 1, "label": "Mild Hypoxia (SpO2 94-95%)", "category": "vitals"},
    {"max": 100.0, "min": 96.0, "points": 0, "label": "Normal Oxygenation (SpO2 >= 96%)", "category": "vitals"},
]
SUPPLEMENTAL_O2_POINTS = 2.0  # Points added if patient requires supplemental oxygen

# Systolic Blood Pressure (mmHg)
SYSTOLIC_BP_RULES = [
    {"max": 90, "min": 0, "points": 3, "label": "Severe Hypotension / Shock (SBP <= 90 mmHg)", "category": "vitals"},
    {"max": 100, "min": 91, "points": 2, "label": "Moderate Hypotension (SBP 91-100 mmHg)", "category": "vitals"},
    {"max": 110, "min": 101, "points": 1, "label": "Borderline Low SBP (101-110 mmHg)", "category": "vitals"},
    {"max": 219, "min": 111, "points": 0, "label": "Normal/Elevated SBP (111-219 mmHg)", "category": "vitals"},
    {"max": 400, "min": 220, "points": 3, "label": "Hypertensive Crisis (SBP >= 220 mmHg)", "category": "vitals"},
]

# Heart Rate (beats / minute)
HEART_RATE_RULES = [
    {"max": 40, "min": 0, "points": 3, "label": "Severe Bradycardia (<= 40 bpm)", "category": "vitals"},
    {"max": 50, "min": 41, "points": 1, "label": "Mild Bradycardia (41-50 bpm)", "category": "vitals"},
    {"max": 90, "min": 51, "points": 0, "label": "Normal Heart Rate (51-90 bpm)", "category": "vitals"},
    {"max": 110, "min": 91, "points": 1, "label": "Mild Tachycardia (91-110 bpm)", "category": "vitals"},
    {"max": 130, "min": 111, "points": 2, "label": "Moderate Tachycardia (111-130 bpm)", "category": "vitals"},
    {"max": 400, "min": 131, "points": 3, "label": "Severe Tachycardia (>= 131 bpm)", "category": "vitals"},
]

# Consciousness Level
CONSCIOUSNESS_RULES: Dict[str, float] = {
    "Alert": 0.0,
    "Voice": 3.0,
    "Pain": 3.0,
    "Unresponsive": 4.0,
    "Confused": 3.0,
}

# Temperature (Celsius)
TEMPERATURE_RULES = [
    {"max": 35.0, "min": 0.0, "points": 3, "label": "Hypothermia (<= 35.0°C)", "category": "vitals"},
    {"max": 36.0, "min": 35.1, "points": 1, "label": "Borderline Low Temp (35.1-36.0°C)", "category": "vitals"},
    {"max": 38.0, "min": 36.1, "points": 0, "label": "Normal Temperature (36.1-38.0°C)", "category": "vitals"},
    {"max": 39.0, "min": 38.1, "points": 1, "label": "Pyrexia / Fever (38.1-39.0°C)", "category": "vitals"},
    {"max": 50.0, "min": 39.1, "points": 2, "label": "High Fever (>= 39.1°C)", "category": "vitals"},
]

# ==========================================
# 2. RED FLAG & HIGH-RISK SYMPTOM PATTERNS
# ==========================================
# Each entry has keywords/synonyms, points weight, severity escalation, and clinical rationale.
RED_FLAG_PATTERNS = [
    {
        "id": "acute_coronary_syndrome",
        "keywords": ["chest pain", "crushing chest pain", "substernal pressure", "radiating to jaw", "radiating to left arm", "angina", "cardiac pain"],
        "weight": 5.0,
        "is_red_flag": True,
        "label": "Suspected Acute Coronary Syndrome / Ischemic Chest Pain",
        "rationale": "High clinical risk of acute myocardial infarction or unstable angina."
    },
    {
        "id": "acute_stroke_deficit",
        "keywords": ["facial droop", "slurred speech", "arm weakness", "hemiparesis", "sudden numbness", "aphasia", "stroke signs", "fast positive"],
        "weight": 6.0,
        "is_red_flag": True,
        "label": "Acute Neurological Deficit / FAST Positive (Suspected Stroke)",
        "rationale": "Time-sensitive brain ischemia or intracranial hemorrhage."
    },
    {
        "id": "severe_respiratory_compromise",
        "keywords": ["stridor", "gasping", "cyanosis", "severe dyspnea", "inability to complete sentences", "choking", "acute respiratory distress"],
        "weight": 5.5,
        "is_red_flag": True,
        "label": "Severe Airway / Respiratory Distress",
        "rationale": "Imminent threat of hypoxic respiratory failure or airway compromise."
    },
    {
        "id": "anaphylaxis",
        "keywords": ["anaphylaxis", "tongue swelling", "throat tightening", "angioedema", "wheezing with urticaria", "lip swelling with rash"],
        "weight": 6.0,
        "is_red_flag": True,
        "label": "Severe Systemic Anaphylaxis",
        "rationale": "Rapidly progressive IgE-mediated airway obstruction and distributive shock."
    },
    {
        "id": "severe_hemorrhage_shock",
        "keywords": ["massive bleeding", "hematemesis", "uncontrolled hemorrhage", "coughing large blood", "melena with dizziness", "postpartum hemorrhage"],
        "weight": 6.0,
        "is_red_flag": True,
        "label": "Active Severe Hemorrhage",
        "rationale": "Active hypovolemic shock risk requiring immediate surgical / blood product resus."
    },
    {
        "id": "sepsis_meningismus",
        "keywords": ["petechial rash", "purpura with fever", "stiff neck with fever", "photophobia with altered consciousness", "mottled skin with fever"],
        "weight": 5.0,
        "is_red_flag": True,
        "label": "Severe Sepsis / Meningococcal Indicators",
        "rationale": "Suspected systemic meningococcal infection or fulminant septic shock."
    },
    {
        "id": "acute_abdomen_peritonitis",
        "keywords": ["rigid abdomen", "rebound tenderness", "guarding with severe pain", "peritonitis", "acute board-like abdomen"],
        "weight": 4.0,
        "is_red_flag": True,
        "label": "Suspected Peritonitis / Acute Surgical Abdomen",
        "rationale": "Potential hollow viscus perforation or acute vascular emergency."
    },
]

# Standard Moderate and Mild Symptom mappings
MODERATE_SYMPTOM_PATTERNS = [
    {"keywords": ["shortness of breath", "dyspnea", "breathlessness", "wheezing"], "weight": 2.5, "label": "Moderate Respiratory Symptom"},
    {"keywords": ["severe headache", "thunderclap headache", "worst headache"], "weight": 3.0, "label": "Severe Neurological Headache"},
    {"keywords": ["severe abdominal pain", "intense stomach cramps"], "weight": 2.5, "label": "Severe Abdominal Discomfort"},
    {"keywords": ["persistent vomiting", "inability to keep fluids", "severe diarrhea", "dehydration"], "weight": 2.0, "label": "Fluid Depletion / Intractable Emesis"},
    {"keywords": ["high fever", "chills", "rigors"], "weight": 1.5, "label": "Significant Febrile Illness"},
    {"keywords": ["syncope", "fainting", "loss of consciousness"], "weight": 3.0, "label": "Syncope / Transient Loss of Consciousness"},
]

MILD_SYMPTOM_PATTERNS = [
    {"keywords": ["cough", "mild cough"], "weight": 0.5, "label": "Mild Cough"},
    {"keywords": ["sore throat", "throat pain"], "weight": 0.5, "label": "Pharyngitis / Sore Throat"},
    {"keywords": ["runny nose", "congestion", "rhinorrhea"], "weight": 0.2, "label": "Upper Respiratory Congestion"},
    {"keywords": ["mild headache"], "weight": 0.5, "label": "Mild Cephalea"},
    {"keywords": ["localized rash", "mild itching"], "weight": 0.5, "label": "Mild Dermatological Finding"},
    {"keywords": ["mild joint pain", "body ache", "myalgia"], "weight": 0.5, "label": "General Body Ache / Myalgia"},
]

# ==========================================
# 3. COMORBIDITY & AGE WEIGHTS
# ==========================================
COMORBIDITY_WEIGHTS: Dict[str, float] = {
    "coronary_artery_disease": 2.0,
    "cad": 2.0,
    "myocardial_infarction": 2.0,
    "heart_failure": 2.5,
    "copd": 2.0,
    "severe_asthma": 1.5,
    "chronic_kidney_disease": 2.0,
    "ckd": 2.0,
    "diabetes": 1.5,
    "hypertension": 1.0,
    "immunocompromised": 2.5,
    "chemotherapy": 2.5,
    "organ_transplant": 3.0,
    "stroke_history": 1.5,
    "cirrhosis": 2.0,
}

# ==========================================
# 4. TIER THRESHOLDS & RECOMMENDED ACTIONS
# ==========================================
TIER_THRESHOLDS = {
    "CRITICAL": 8.0,
    "HIGH": 5.0,
    "MEDIUM": 2.5,
}

RECOMMENDED_ACTIONS = {
    "Critical": "IMMEDIATE EMERGENCY RESUSCITATION: Activate emergency response (108/EMS), alert receiving tertiary trauma/ICU team immediately, continuous oxygen and hemodynamic monitoring.",
    "High": "URGENT CLINICAL EVALUATION: Expedite transfer to secondary/tertiary center with acute care capability within 1-2 hours. Priority clinical stabilization required.",
    "Medium": "SEMI-URGENT EVALUATION: Refer to nearest primary health center / district outpatient department within 4-6 hours for physician assessment, basic labs, and diagnostic workup.",
    "Low": "PRIMARY CARE / COMMUNITY TRIAGE: Outpatient consultation at local primary health clinic, symptomatic home care protocol with clear red-flag return instructions.",
    "Uncertain": "CLINICAL REVIEW REQUIRED: Discrepant physiological or clinical signals detected. Triage escalated to human physician review before dispatch decision."
}
