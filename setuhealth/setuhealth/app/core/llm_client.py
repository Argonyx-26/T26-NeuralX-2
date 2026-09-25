"""
LLM Client — thin wrapper around the Anthropic Messages API.

Responsibility:
  - Structured symptom extraction from free text
  - Clarifying question generation (Phase 2)
  - Human-readable explanation phrasing

CRITICAL CONSTRAINT:
  The LLM is NEVER invoked to score, weight, or classify clinical risk.
  All scoring logic remains in app/core/scoring.py (deterministic).
"""

import json
import httpx
from typing import Any, Dict, Optional, List
from app.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_BASE_URL

HEADERS = {
    "x-api-key": ANTHROPIC_API_KEY,
    "content-type": "application/json",
    "anthropic-version": "2023-06-01",
}

# Extraction system prompt — instructs Claude to return ONLY structured JSON
EXTRACTION_SYSTEM_PROMPT = """You are a clinical data-extraction assistant for a structured triage system.
Your ONLY role is to parse free-text patient symptom narratives into precise, structured JSON.

CRITICAL RULES:
1. Return ONLY valid JSON — no preamble, no explanation, no markdown fences.
2. NEVER invent or hallucinate clinical data not mentioned or reasonably implied in the text.
3. NEVER assign a risk score, tier, or severity judgment — that is handled by a separate deterministic engine.
4. If a field is not mentioned, use null or an empty array.
5. Extract and normalize (standardize) symptom names to descriptive clinical terms.

Output the following JSON structure exactly:
{
  "symptoms": [
    {
      "name": "<clinical symptom name, e.g. 'chest_pain', 'dyspnea', 'hemiparesis'>",
      "severity": "<mild | moderate | severe | critical | null>",
      "duration_hours": <float or null>,
      "details": "<any specific qualifying details, e.g. 'radiating to left jaw', or null>"
    }
  ],
  "vitals": {
    "respiratory_rate": <int or null>,
    "spo2": <float or null>,
    "supplemental_oxygen": <true | false>,
    "systolic_bp": <int or null>,
    "diastolic_bp": <int or null>,
    "heart_rate": <int or null>,
    "consciousness_level": "<Alert | Voice | Pain | Unresponsive | Confused | null>",
    "temperature": <float in Celsius or null>
  },
  "age": <int or null>,
  "history": ["<comorbidity 1>", "<comorbidity 2>"],
  "pregnancy": <true | false>,
  "extraction_summary": "<1-2 sentence clinical summary of the patient's presentation>"
}"""

CLARIFY_SYSTEM_PROMPT = """You are a clinical triage assistant helping to resolve ambiguous patient presentations.
Your ONLY role is to generate 1-2 targeted, concise clarifying questions that a nurse or paramedic 
should ask the patient or bystander to resolve the specific clinical uncertainty provided.

CRITICAL RULES:
1. Return ONLY a JSON array of 1-2 question strings — no preamble, no markdown.
2. Questions must target ONLY the named uncertain or conflicting clinical factors.
3. Keep questions simple enough for a non-medical bystander to answer.
4. Focus on questions that would change the clinical risk tier if answered.

Output format: ["<question 1>", "<question 2>"]"""


async def call_llm(
    user_prompt: str,
    system_prompt: str,
    max_tokens: int = 1024,
) -> str:
    """
    Calls the Anthropic Messages API with given system and user prompts.
    Returns the raw text content of the assistant's response.
    Raises on HTTP errors with a clean message.
    """
    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": max_tokens,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_prompt}],
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(ANTHROPIC_BASE_URL, headers=HEADERS, json=payload)
        if response.status_code != 200:
            raise RuntimeError(
                f"Anthropic API error {response.status_code}: {response.text[:300]}"
            )
        data = response.json()
        return data["content"][0]["text"]


async def extract_structured_data(patient_text: str, raw_vitals: Optional[Dict] = None, raw_history: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Calls LLM to parse free-text patient narrative into structured JSON.
    Returns a dict matching ExtractResponse / ScoreRequest schema.
    """
    user_prompt_parts = [f"Patient Narrative:\n{patient_text}"]
    if raw_vitals:
        user_prompt_parts.append(f"\nAdditionally provided raw vitals (override text if conflicts): {json.dumps(raw_vitals)}")
    if raw_history:
        user_prompt_parts.append(f"\nAdditionally provided medical history: {', '.join(raw_history)}")

    user_prompt = "\n".join(user_prompt_parts)
    raw_output = await call_llm(user_prompt, EXTRACTION_SYSTEM_PROMPT, max_tokens=1024)

    # Parse LLM JSON output — it should be pure JSON per system prompt instruction
    try:
        parsed = json.loads(raw_output.strip())
    except json.JSONDecodeError:
        # Fallback: try to extract JSON block if Claude added minor formatting
        import re
        match = re.search(r'\{.*\}', raw_output, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
        else:
            raise ValueError(f"LLM returned non-parseable output: {raw_output[:300]}")

    return parsed


async def generate_clarifying_questions(
    uncertainty_reasons: List[str],
    contributing_factors: List[Dict],
    patient_context: str,
) -> List[str]:
    """
    Calls LLM to generate 1-2 targeted clarifying questions for ambiguous cases.
    """
    context_lines = [
        f"Clinical uncertainty detected. Reasons:\n" + "\n".join(f"- {r}" for r in uncertainty_reasons),
        f"Contributing clinical factors: {', '.join(f['factor'] for f in contributing_factors[:5])}",
        f"Patient context summary: {patient_context}",
    ]
    user_prompt = "\n\n".join(context_lines)

    raw_output = await call_llm(user_prompt, CLARIFY_SYSTEM_PROMPT, max_tokens=256)

    try:
        questions = json.loads(raw_output.strip())
        if isinstance(questions, list):
            return questions[:2]
    except json.JSONDecodeError:
        pass

    # Fallback: return generic targeted questions
    return [
        "Can you describe whether the patient's symptoms have been getting worse in the last hour?",
        "Does the patient have any known heart disease, diabetes, or chronic lung conditions?"
    ]
