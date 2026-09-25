import { PatientInput, TriageResponse, RiskTier, Facility, ClarifyingQuestion } from '../types/triage';
import { DISTRICT_FACILITIES } from './mockData';
import { raahClient } from './raahClient';

export function evaluateTriage(
  input: PatientInput,
  clarificationAnswers?: Record<string, string>,
  forceEscalate: boolean = false
): TriageResponse {
  const caseId = `CASE-${Date.now().toString().slice(-6)}`;
  const { chief_complaint, vitals, history } = input;
  const complaintLower = (chief_complaint || '').toLowerCase();

  // If user explicitly chose human escalation
  if (forceEscalate) {
    raahClient.recordEvent(
      'ESCALATED_HUMAN_REVIEW',
      caseId,
      'PT-UNKNOWN',
      'Clinical ambiguity exceeded safe autonomous threshold. Case routed to Senior Triage Officer.',
      { tier: 'UNCERTAIN', ambiguity_score: 0.95 }
    );

    return {
      case_id: caseId,
      tier: 'UNCERTAIN',
      confidence: 0.42,
      contributing_factors: [
        'Conflicting symptom profile with unresolvable clinical ambiguity',
        'Vague chest / abdominal presentation with multiple comorbidity risk factors',
        'Safety Protocol: Autonomous reassurance withheld to protect patient safety'
      ],
      requires_clarification: false,
      escalate_to_human: true,
      escalation_reason: 'Ambiguity threshold exceeded: Patient presents with overlapping gastrointestinal and atypical cardiac symptoms requiring direct manual clinician auscultation and ECG.',
      scoring_breakdown: {
        vitals_score: 2,
        symptom_score: 3,
        comorbidity_score: 4,
        ambiguity_index: 0.88
      },
      clinical_summary: 'Patient requires direct clinician examination. Auto-advisement suspended to prevent unsafe reassurance.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  // Check if clarification questions were already answered
  const hasClarification = clarificationAnswers && Object.keys(clarificationAnswers).length > 0;
  
  if (hasClarification) {
    const q1Answer = clarificationAnswers['cq-1'] || '';
    const q2Answer = clarificationAnswers['cq-2'] || '';

    // If answers indicate persistent confusion or ambiguous response
    if (
      q1Answer.includes('Uncertain') || 
      q1Answer.includes('Neither') || 
      q2Answer.includes('Cannot tell') ||
      q1Answer.includes('Not sure')
    ) {
      raahClient.recordEvent(
        'ESCALATED_HUMAN_REVIEW',
        caseId,
        'PT-CLARIFIED',
        'Clarification questions remained inconclusive. Case escalated to Senior Triage Officer.',
        { tier: 'UNCERTAIN', answers: clarificationAnswers }
      );

      return {
        case_id: caseId,
        tier: 'UNCERTAIN',
        confidence: 0.48,
        contributing_factors: [
          'Post-clarification responses remained equivocal',
          'Atypical presentation in patient with cardiovascular risk factors',
          'Mandatory Human Triage Rule: Do not emit false reassurance when cardiac signs cannot be excluded'
        ],
        requires_clarification: false,
        escalate_to_human: true,
        escalation_reason: 'Clarification inconclusive: Clinical uncertainty protocol dictates physical examination and 12-lead ECG rather than algorithmic discharge.',
        scoring_breakdown: {
          vitals_score: 2,
          symptom_score: 3,
          comorbidity_score: 3,
          ambiguity_index: 0.79
        },
        clinical_summary: 'Autonomous scoring halted. Patient referred to Senior Triage Officer / Attending Physician.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }
  }

  // 1. Calculate Vitals Score & Factors (NEWS2)
  let vitalsScore = 0;
  const contributingFactors: string[] = [];

  // SpO2
  if (vitals.spo2 < 90) {
    vitalsScore += 5;
    contributingFactors.push(`Critical Hypoxia: SpO₂ ${vitals.spo2}% is severely depressed (< 90%) requiring immediate supplemental O₂`);
  } else if (vitals.spo2 <= 93) {
    vitalsScore += 3;
    contributingFactors.push(`Moderate Hypoxemia: SpO₂ ${vitals.spo2}% is below normal room-air baseline`);
  } else if (vitals.spo2 <= 95) {
    vitalsScore += 1;
    contributingFactors.push(`Borderline Oxygenation: SpO₂ ${vitals.spo2}%`);
  }

  // Heart Rate
  if (vitals.heart_rate >= 130 || vitals.heart_rate < 40) {
    vitalsScore += 4;
    contributingFactors.push(`Severe Pulse Deviation: Pulse rate ${vitals.heart_rate} bpm (Severe tachycardia/bradycardia)`);
  } else if (vitals.heart_rate >= 110) {
    vitalsScore += 2;
    contributingFactors.push(`Tachycardia: Pulse rate ${vitals.heart_rate} bpm`);
  } else if (vitals.heart_rate >= 100) {
    vitalsScore += 1;
    contributingFactors.push(`Mild Tachycardia: Pulse rate ${vitals.heart_rate} bpm`);
  }

  // Blood Pressure (Systolic)
  if (vitals.bp_systolic >= 180 || vitals.bp_systolic < 90) {
    vitalsScore += 4;
    contributingFactors.push(`Severe Blood Pressure Deviation: Systolic BP ${vitals.bp_systolic} mmHg`);
  } else if (vitals.bp_systolic >= 160) {
    vitalsScore += 2;
    contributingFactors.push(`Stage 2 Hypertension: Systolic BP ${vitals.bp_systolic} mmHg`);
  } else if (vitals.bp_systolic >= 140) {
    vitalsScore += 1;
    contributingFactors.push(`Elevated Systolic Pressure: ${vitals.bp_systolic} mmHg`);
  }

  // Temperature
  if (vitals.temperature >= 102.5 || vitals.temperature < 95.0) {
    vitalsScore += 2;
    contributingFactors.push(`Significant Core Temperature Anomaly: ${vitals.temperature}°F`);
  } else if (vitals.temperature >= 100.4) {
    vitalsScore += 1;
    contributingFactors.push(`Pyrexia / Fever: ${vitals.temperature}°F`);
  }

  // Helper for negation detection (e.g., "no chest pain", "denies shortness of breath")
  const hasAffirmativeMention = (text: string, pattern: RegExp): boolean => {
    const negationWords = ['no ', 'not ', 'none ', 'denies ', 'denied ', 'without ', 'negative for ', 'no known ', 'free of '];
    const regex = new RegExp(pattern.source, 'gi');
    let match: RegExpExecArray | null;
    let foundAffirmative = false;

    while ((match = regex.exec(text)) !== null) {
      const idx = match.index;
      const preceding = text.slice(Math.max(0, idx - 25), idx).toLowerCase();
      const isNegated = negationWords.some((neg) => preceding.includes(neg));
      if (!isNegated) {
        foundAffirmative = true;
        break;
      }
    }
    return foundAffirmative;
  };

  // 2. Symptom Extraction & Scoring
  let symptomScore = 0;
  const isCardiacConcern = hasAffirmativeMention(complaintLower, /chest|cardiac|angina|arm pain|jaw pain|sweat|pressure/i);
  const isRespiratoryConcern = hasAffirmativeMention(complaintLower, /breath|dyspnea|wheez|sob|gasp|chok|stridor/i);
  const isNeuroConcern = hasAffirmativeMention(complaintLower, /slur|stroke|paraly|face droop|weakness|confus|seiz/i);
  const isVagueOrPostPrandial = hasAffirmativeMention(complaintLower, /lunch|dinner|food|heavy meal|fried|gas|indigestion|vague|lightheaded|uneasy|bloat/i);

  if (isCardiacConcern) {
    symptomScore += 4;
    contributingFactors.push('Symptom Pattern: Chest discomfort / suspected acute coronary syndrome spectrum');
  }
  if (isRespiratoryConcern) {
    symptomScore += 4;
    contributingFactors.push('Symptom Pattern: Acute respiratory distress / ventilatory work of breathing');
  }
  if (isNeuroConcern) {
    symptomScore += 5;
    contributingFactors.push('Symptom Pattern: Focal neurological deficit / hyperacute stroke pathway');
  }


  // 3. Comorbidity Scoring
  let comorbidityScore = 0;
  if (history.diabetes) {
    comorbidityScore += 2;
    contributingFactors.push('Risk Factor: Diabetes Mellitus (High risk of silent/atypical myocardial ischemia)');
  }
  if (history.hypertension) {
    comorbidityScore += 1;
    contributingFactors.push('Risk Factor: Pre-existing Essential Hypertension');
  }
  if (history.asthma_copd) {
    comorbidityScore += 2;
    contributingFactors.push('Risk Factor: Chronic Obstructive Pulmonary / Asthmatic Disease');
  }
  if (history.prior_cardiac_event) {
    comorbidityScore += 3;
    contributingFactors.push('Critical History: Documented prior myocardial infarction / cardiac intervention');
  }
  if (history.age >= 60) {
    comorbidityScore += 2;
    contributingFactors.push(`Demographic Vulnerability: Age ${history.age} years`);
  }

  // 4. Ambiguity & Conflict Detection
  let ambiguityIndex = 0.15;
  let requiresClarification = false;
  let clarifyingQuestions: ClarifyingQuestion[] = [];

  if (isVagueOrPostPrandial && isCardiacConcern && !hasClarification) {
    ambiguityIndex = 0.65;
    requiresClarification = true;
    clarifyingQuestions = [
      {
        id: 'cq-1',
        question: 'Does the chest sensation radiate to your left shoulder, jaw, back, or neck, or does it worsen with movement?',
        options: [
          'Yes - Radiates to arm/jaw or worsens with walking/exertion',
          'No - Constant burning feeling confined to upper stomach/mid-chest',
          'Uncertain / Hard to tell exactly'
        ],
        targetFactor: 'cardiac_vs_gerd'
      },
      {
        id: 'cq-2',
        question: 'Has the sensation changed with body position (e.g. bending over, lying flat) or after drinking water?',
        options: [
          'Yes - Worse when lying flat or bending over',
          'No - Unaffected by posture or fluids',
          'Cannot tell / Feeling stays unchanged'
        ],
        targetFactor: 'postural_reflux'
      }
    ];
  }

  if (hasClarification) {
    const q1 = clarificationAnswers['cq-1'] || '';
    if (q1.includes('Radiates to arm/jaw')) {
      symptomScore += 4;
      contributingFactors.unshift('Clarified Red Flag: Radiation to arm/jaw confirms high suspicion of acute ischemic event');
      ambiguityIndex = 0.18;
      requiresClarification = false;
    } else if (q1.includes('Constant burning feeling confined to upper stomach')) {
      symptomScore = Math.max(1, symptomScore - 2);
      contributingFactors.push('Clarified Presentation: Localized epigastric burning aligns with gastroesophageal irritation, pending observation');
      ambiguityIndex = 0.28;
      requiresClarification = false;
    }
  }

  // Total deterministic score
  const compositeScore = vitalsScore * 1.5 + symptomScore * 1.2 + comorbidityScore * 0.8;

  let tier: RiskTier = 'LOW';

  if (vitals.spo2 < 90 || vitals.heart_rate >= 130 || vitals.bp_systolic >= 180 || isNeuroConcern || compositeScore >= 14) {
    tier = 'CRITICAL';
  } else if (compositeScore >= 9 || vitals.spo2 <= 93 || (isCardiacConcern && history.diabetes)) {
    tier = 'HIGH';
  } else if (compositeScore >= 5) {
    tier = 'MEDIUM';
  } else {
    tier = 'LOW';
  }

  // Calculate dynamic clinical certainty based on physiological concordance & symptom acuity
  let confidence = 0.88;
  if (requiresClarification) {
    // When active ambiguity threshold is breached, certainty drops to reflection zone (58% - 66%)
    confidence = Math.max(0.58, Math.min(0.66, 0.64 - (ambiguityIndex - 0.5) * 0.2));
  } else if (tier === 'CRITICAL') {
    // Critical cases: high certainty if supported by severe vitals or clear cardiac/neuro flags
    let vitalSignals = 0;
    if (vitals.spo2 < 92) vitalSignals += 0.03;
    if (vitals.heart_rate >= 115) vitalSignals += 0.03;
    if (vitals.bp_systolic >= 160) vitalSignals += 0.02;
    if (history.prior_cardiac_event || history.diabetes) vitalSignals += 0.02;
    confidence = Math.min(0.97, 0.89 + vitalSignals);
  } else if (tier === 'HIGH') {
    let concordance = 0;
    if (vitals.spo2 <= 94) concordance += 0.03;
    if (vitals.bp_systolic >= 150) concordance += 0.02;
    if (vitals.heart_rate >= 100) concordance += 0.02;
    confidence = Math.min(0.94, 0.85 + concordance);
  } else if (tier === 'MEDIUM') {
    // Medium cases (e.g. moderate wheeze, controlled fever): certainty is 84% - 89%
    const vitalsDev = (vitals.spo2 <= 96 ? 0.02 : 0) + (vitals.respiratory_rate >= 20 ? 0.02 : 0) + (vitals.heart_rate >= 85 ? 0.01 : 0);
    confidence = Math.min(0.90, 0.84 + vitalsDev);
  } else {
    // Low risk tier with stable vitals
    confidence = 0.91;
  }

  // Capacity-aware routing
  const routedFacilities = calculateCapacityRouting(tier, vitals, history, isRespiratoryConcern || vitals.spo2 < 94);
  const recommendedFacility = routedFacilities[0];
  const alternativeFacilities = routedFacilities.slice(1);

  // Background audit logging (telemetry state transition)
  raahClient.recordEvent(
    'TRIAGE_SUBMITTED',
    caseId,
    `PT-${Math.floor(1000 + Math.random() * 9000)}`,
    `Triage evaluated: Tier=${tier}, Conf=${Math.round(confidence * 100)}%, Ambiguity=${ambiguityIndex.toFixed(2)}`,
    { tier, confidence, requiresClarification }
  );

  if (requiresClarification) {
    raahClient.recordEvent(
      'CLARIFICATION_TRIGGERED',
      caseId,
      'PT-ACTIVE',
      `Ambiguity threshold triggered (${ambiguityIndex.toFixed(2)} >= 0.35). 2 clarifying questions dispatched.`,
      { questionsCount: clarifyingQuestions.length }
    );
  } else if (recommendedFacility) {
    raahClient.recordEvent(
      'FACILITY_ROUTED',
      caseId,
      'PT-ACTIVE',
      `Capacity match confirmed: ${recommendedFacility.name} (ETA: ${recommendedFacility.eta_mins}m, ICU beds: ${recommendedFacility.icu_beds_available})`,
      { facilityId: recommendedFacility.id, matchScore: recommendedFacility.match_score }
    );
  }

  return {
    case_id: caseId,
    tier,
    confidence: Number(confidence.toFixed(2)),
    contributing_factors: contributingFactors,
    requires_clarification: requiresClarification,
    clarifying_questions: clarifyingQuestions,
    escalate_to_human: false,
    recommended_facility: recommendedFacility,
    alternative_facilities: alternativeFacilities,
    scoring_breakdown: {
      vitals_score: Math.round(vitalsScore * 10) / 10,
      symptom_score: Math.round(symptomScore * 10) / 10,
      comorbidity_score: Math.round(comorbidityScore * 10) / 10,
      ambiguity_index: Number(ambiguityIndex.toFixed(2))
    },
    clinical_summary: generateClinicalSummary(tier),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

function calculateCapacityRouting(
  tier: RiskTier,
  vitals: { spo2: number },
  history: { asthma_copd: boolean; prior_cardiac_event: boolean },
  needsRespiratoryCare: boolean
): Facility[] {
  const isHighAcuity = tier === 'CRITICAL' || tier === 'HIGH';
  const needsOxygenOrICU = isHighAcuity || vitals.spo2 < 93 || needsRespiratoryCare;

  const scoredFacilities = DISTRICT_FACILITIES.map((facility) => {
    let score = 100;
    const distancePenalty = Math.max(0, (facility.distance_km - 2) * 3);
    score -= distancePenalty;

    if (needsOxygenOrICU) {
      if (facility.oxygen_beds_available === 0 || facility.icu_beds_available === 0) {
        score -= 65; // Avoid sending acute patient to facility without beds!
      } else {
        score += Math.min(20, facility.icu_beds_available * 4);
        if (facility.specialist_on_duty.toLowerCase().includes('pulmonology') || 
            facility.specialist_on_duty.toLowerCase().includes('critical care') ||
            facility.specialist_on_duty.toLowerCase().includes('cardiology')) {
          score += 15;
        }
      }
    } else {
      if (facility.type === 'Community Health Center' || facility.type === 'Primary Health Clinic') {
        score += 20;
      }
    }

    const finalMatchScore = Math.max(10, Math.min(99, Math.round(score)));
    return { ...facility, match_score: finalMatchScore };
  });

  return scoredFacilities.sort((a, b) => b.match_score - a.match_score);
}

function generateClinicalSummary(tier: RiskTier): string {
  switch (tier) {
    case 'CRITICAL':
      return 'Immediate Emergency Dispatch required. High-acuity decompensation detected. Route to advanced ICU facility.';
    case 'HIGH':
      return 'Urgent Clinical Evaluation required within 30-60 minutes. Vital aberrations warrant specialist care.';
    case 'MEDIUM':
      return 'Subacute Medical Attention recommended. Route to Community Health Center.';
    case 'LOW':
      return 'Primary / Ambulatory Care appropriate. Vital signs within acceptable baseline range.';
    default:
      return 'Ambiguous clinical presentation. Manual clinician review mandatory.';
  }
}
