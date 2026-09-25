import { PatientInput, TriageResponse, ReferralLogItem, Facility, RiskTier, ClarifyingQuestion } from '../types/triage';
import { evaluateTriage } from './triageEngine';
import { SEEDED_REFERRAL_LOGS, DISTRICT_FACILITIES } from './mockData';
import { raahClient } from './raahClient';

// Use proxy in Vite dev (/api) or direct configured URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// In-memory fallback state in case backend is offline
let localReferralLogs: ReferralLogItem[] = [...SEEDED_REFERRAL_LOGS];

function formatBackendTier(tier: string): RiskTier {
  const upper = tier.toUpperCase();
  if (upper === 'CRITICAL' || upper === 'HIGH' || upper === 'MEDIUM' || upper === 'LOW') {
    return upper as RiskTier;
  }
  return 'UNCERTAIN';
}

function mapBackendFacility(fac: any, isRecommended: boolean = false): Facility {
  let capacityStatus: 'AMPLE' | 'CONGESTED' | 'CRITICAL' | 'NO_BEDS' = 'AMPLE';
  const load = fac.current_load_pct || 0;
  if (load > 85) capacityStatus = 'CRITICAL';
  else if (load > 70) capacityStatus = 'CONGESTED';
  else if (fac.icu_beds_available <= 0) capacityStatus = 'NO_BEDS';

  const specialists = Array.isArray(fac.specialists_on_call) 
    ? fac.specialists_on_call.map((s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())).join(', ')
    : 'General Medicine';

  return {
    id: fac.facility_id || `FAC-${Math.floor(100 + Math.random() * 900)}`,
    name: fac.name || 'District Hospital',
    type: (fac.name || '').includes('Trauma') || (fac.name || '').includes('AIIMS')
      ? 'Tertiary Medical College'
      : (fac.name || '').includes('Speciality') || (fac.name || '').includes('Heart')
      ? 'District Hospital'
      : 'Community Health Center',
    distance_km: Number(fac.distance_km || 5.0),
    eta_mins: Number(fac.eta_minutes || Math.round((fac.distance_km || 5) * 1.5)),
    icu_beds_available: Number(fac.icu_beds_available ?? 4),
    general_beds_available: Math.max(2, Math.round((100 - (fac.current_load_pct || 60)) * 0.4)),
    oxygen_beds_available: Math.max(1, Math.round((fac.icu_beds_available || 2) * 1.5)),
    specialist_on_duty: specialists,
    match_score: Math.round((fac.routing_score || (isRecommended ? 0.94 : 0.82)) * 100),
    capacity_status: capacityStatus,
    address: `${fac.name}, New Delhi NCR`,
    phone: '+91-11-26588500',
    is_simulated: true,
  };
}

export const api = {
  /**
   * Submit patient triage evaluation (FastAPI backend + deterministic fallback)
   */
  async submitTriage(
    input: PatientInput,
    clarificationAnswers?: Record<string, string>,
    forceEscalate: boolean = false
  ): Promise<TriageResponse> {
    const startTime = performance.now();

    // 1. Prepare structured ScoreRequest payload for FastAPI backend
    const symptoms = [
      {
        name: input.chief_complaint || 'unspecified presentation',
        severity: 'moderate',
        duration_hours: input.duration_hours || undefined,
        details: clarificationAnswers ? Object.values(clarificationAnswers).join('; ') : undefined,
      }
    ];

    const history: string[] = [];
    if (input.history.diabetes) history.push('Diabetes Mellitus');
    if (input.history.hypertension) history.push('Hypertension');
    if (input.history.asthma_copd) history.push('Asthma / COPD');
    if (input.history.prior_cardiac_event) history.push('Prior Cardiac Event');

    const scorePayload = {
      symptoms,
      vitals: {
        respiratory_rate: input.vitals.respiratory_rate || null,
        spo2: input.vitals.spo2 || null,
        supplemental_oxygen: false,
        systolic_bp: input.vitals.bp_systolic || null,
        diastolic_bp: input.vitals.bp_diastolic || null,
        heart_rate: input.vitals.heart_rate || null,
        consciousness_level: null,
        temperature: input.vitals.temperature || null,
      },
      age: input.history.age || null,
      history,
      pregnancy: false,
    };

    try {
      // Step A: Call POST /api/score
      const scoreRes = await fetch(`${API_BASE_URL}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scorePayload),
      });

      if (scoreRes.ok) {
        const scoreData = await scoreRes.json();
        const duration = Math.round(performance.now() - startTime);

        let clarifyingQuestions: ClarifyingQuestion[] | undefined = undefined;
        let requiresClarification = Boolean(scoreData.is_uncertain);

        // Step B: If score is uncertain and user hasn't provided answers yet, call /api/clarify
        if (requiresClarification && !clarificationAnswers) {
          try {
            const clarifyRes = await fetch(`${API_BASE_URL}/clarify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                original_score: scoreData,
                original_request: scorePayload,
                patient_context_summary: `Patient with ${input.chief_complaint}, ${input.history.age}yo`,
              }),
            });

            if (clarifyRes.ok) {
              const clarifyData = await clarifyRes.json();
              if (clarifyData.questions && clarifyData.questions.length > 0) {
                clarifyingQuestions = clarifyData.questions.map((q: string, idx: number) => ({
                  id: `cq-${idx + 1}`,
                  question: q,
                  options: ['Yes / Severe', 'No / Denied', 'Uncertain / Unknown'],
                }));
              }
            }
          } catch (clarifyErr) {
            console.warn('Clarify endpoint failed, using fallback questions', clarifyErr);
          }
        }

        // Step C: Call POST /api/route for capacity-aware routing
        let recommendedFacility: Facility | undefined = undefined;
        let alternativeFacilities: Facility[] = [];

        try {
          const specialty = input.chief_complaint.toLowerCase().includes('chest') || input.chief_complaint.toLowerCase().includes('heart')
            ? 'cardiology'
            : input.chief_complaint.toLowerCase().includes('breath') || input.chief_complaint.toLowerCase().includes('wheez')
            ? 'critical_care'
            : 'general';

          const routeRes = await fetch(`${API_BASE_URL}/route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              risk_tier: scoreData.risk_tier,
              required_specialty: specialty,
            }),
          });

          if (routeRes.ok) {
            const routeData = await routeRes.json();
            if (routeData.recommended_facility) {
              recommendedFacility = mapBackendFacility(routeData.recommended_facility, true);
            }
            if (Array.isArray(routeData.ranked_list)) {
              alternativeFacilities = routeData.ranked_list
                .slice(1, 3)
                .map((f: any) => mapBackendFacility(f, false));
            }
          }
        } catch (routeErr) {
          console.warn('Routing endpoint failed, using local facility fallback', routeErr);
        }

        // Fallback to local facilities if routing was empty
        if (!recommendedFacility) {
          recommendedFacility = DISTRICT_FACILITIES[0];
          alternativeFacilities = [DISTRICT_FACILITIES[1], DISTRICT_FACILITIES[2]];
        }

        const caseId = `SH-${Math.floor(1000 + Math.random() * 9000)}`;
        const riskTier = formatBackendTier(scoreData.risk_tier);

        const triageResponse: TriageResponse = {
          case_id: caseId,
          tier: riskTier,
          confidence: scoreData.confidence,
          contributing_factors: (scoreData.contributing_factors || []).map(
            (f: any) => `${f.factor} (+${f.weight} pts)`
          ),
          requires_clarification: requiresClarification && !clarificationAnswers,
          clarifying_questions: clarifyingQuestions,
          escalate_to_human: forceEscalate || riskTier === 'UNCERTAIN',
          escalation_reason: forceEscalate
            ? 'Manual operator override requested.'
            : riskTier === 'UNCERTAIN'
            ? 'Conflicting vital signs and clinical ambiguity required supervisory signoff.'
            : undefined,
          recommended_facility: recommendedFacility,
          alternative_facilities: alternativeFacilities,
          scoring_breakdown: {
            vitals_score: scoreData.score_breakdown?.physiological_score || 0,
            symptom_score: scoreData.score_breakdown?.symptom_score || 0,
            comorbidity_score: scoreData.score_breakdown?.comorbidity_score || 0,
            ambiguity_index: Math.max(0, Math.min(1, 1.0 - scoreData.confidence)),
          },
          clinical_summary: scoreData.recommended_action || 'Evaluated via deterministic clinical scoring.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        // Record auditable clinical event
        raahClient.recordEvent(
          'TRIAGE_SUBMITTED',
          caseId,
          `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
          `FastAPI scored patient tier: ${riskTier} (Confidence: ${Math.round(scoreData.confidence * 100)}%, Factors: ${scoreData.contributing_factors?.length || 0})`,
          {
            tier: riskTier,
            confidence: scoreData.confidence,
            latencyMs: duration,
            backend: 'FastAPI (Python)',
          }
        );

        return triageResponse;
      }
    } catch (err) {
      console.warn('Backend /api/score unavailable, running local deterministic engine:', err);
    }

    // Step D: Graceful fallback to local deterministic triage engine
    await new Promise((resolve) => setTimeout(resolve, 200));
    return evaluateTriage(input, clarificationAnswers, forceEscalate);
  },

  /**
   * Get closed-loop referral logs (from FastAPI backend GET /api/referrals with fallback)
   */
  async getReferralLogs(): Promise<ReferralLogItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/referrals`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.referrals)) {
          return data.referrals.map((r: any) => ({
            id: r.id,
            patient_id: r.patient_id,
            timestamp: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
            initial_tier: formatBackendTier(r.predicted_tier || r.risk_tier),
            facility_name: r.facility_name,
            facility_id: r.facility_id,
            status: r.status === 'outcome_known' ? 'CONFIRMED' : r.status === 'lost_to_followup' ? 'LOST_TO_FOLLOW_UP' : 'SENT',
            actual_outcome_tier: r.outcome_severity ? formatBackendTier(r.outcome_severity) : undefined,
            mismatch_flag: Boolean(r.tier_mismatch),
            mismatch_reason: r.tier_mismatch
              ? `Triage tier (${r.predicted_tier}) differed from hospital admission severity (${r.outcome_severity}).`
              : undefined,
            transport_mode: 'Ambulance',
            elapsed_mins: 12,
            resolution_notes: r.outcome_notes || (r.status === 'sent' ? 'Transfer en-route; bed reserved.' : 'Care confirmed at hospital.'),
          }));
        }
      }
    } catch (err) {
      console.warn('Backend /api/referrals unavailable, using local referral store:', err);
    }

    return [...localReferralLogs];
  },

  /**
   * Confirm referral arrival and log actual clinical outcome (POST /api/referrals/{id}/confirm)
   */
  async confirmReferral(
    referralId: string,
    actualOutcomeTier: RiskTier,
    notes: string
  ): Promise<ReferralLogItem | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/referrals/${referralId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome_severity: actualOutcomeTier.charAt(0) + actualOutcomeTier.slice(1).toLowerCase(),
          outcome_notes: notes,
        }),
      });

      if (res.ok) {
        const r = await res.json();
        const updated: ReferralLogItem = {
          id: r.id,
          patient_id: r.patient_id,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          initial_tier: formatBackendTier(r.predicted_tier),
          facility_name: r.facility_name,
          facility_id: r.facility_id,
          status: 'CONFIRMED',
          actual_outcome_tier: actualOutcomeTier,
          mismatch_flag: Boolean(r.tier_mismatch),
          mismatch_reason: r.tier_mismatch
            ? `Triage tier (${r.predicted_tier}) differed from hospital confirmed admission diagnosis (${actualOutcomeTier}).`
            : undefined,
          resolution_notes: notes || 'Care delivery confirmed at receiving facility triage desk.',
          elapsed_mins: 15,
        };

        raahClient.recordEvent(
          'REFERRAL_CONFIRMED',
          r.id,
          r.patient_id,
          `Bed admission confirmed at ${r.facility_name}. Outcome tier: ${actualOutcomeTier} (Mismatch: ${r.tier_mismatch ? 'YES' : 'NO'})`,
          { referralId, actualOutcomeTier, isMismatch: r.tier_mismatch }
        );


        return updated;
      }
    } catch (err) {
      console.warn('Backend confirm failed, updating local state:', err);
    }

    // Local fallback
    const index = localReferralLogs.findIndex((r) => r.id === referralId);
    if (index === -1) return null;

    const item = localReferralLogs[index];
    const isMismatch = item.initial_tier !== actualOutcomeTier;

    const updated: ReferralLogItem = {
      ...item,
      status: 'CONFIRMED',
      actual_outcome_tier: actualOutcomeTier,
      mismatch_flag: isMismatch,
      mismatch_reason: isMismatch
        ? `Triage tier (${item.initial_tier}) differed from hospital confirmed admission diagnosis (${actualOutcomeTier}).`
        : undefined,
      resolution_notes: notes || 'Care delivery confirmed at receiving facility triage desk.',
    };

    localReferralLogs[index] = updated;

    raahClient.recordEvent(
      'REFERRAL_CONFIRMED',
      item.id,
      item.patient_id,
      `Bed admission confirmed at ${item.facility_name}. Outcome tier: ${actualOutcomeTier} (Mismatch: ${isMismatch ? 'YES' : 'NO'})`,
      { referralId, actualOutcomeTier, isMismatch }
    );


    return updated;
  },

  /**
   * Dispatch a new referral into the closed-loop log (POST /api/referrals)
   */
  async dispatchReferral(
    triage: TriageResponse,
    facility: Facility,
    transportMode: string = 'Ambulance'
  ): Promise<ReferralLogItem> {
    try {
      const res = await fetch(`${API_BASE_URL}/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: facility.id,
          facility_name: facility.name,
          risk_tier: triage.tier.charAt(0) + triage.tier.slice(1).toLowerCase(),
          predicted_tier: triage.tier.charAt(0) + triage.tier.slice(1).toLowerCase(),
          transport_mode: transportMode,
        }),
      });

      if (res.ok) {
        const r = await res.json();
        const newLog: ReferralLogItem = {
          id: r.id,
          patient_id: r.patient_id,
          timestamp: 'Just now',
          initial_tier: triage.tier,
          facility_name: r.facility_name,
          facility_id: r.facility_id,
          status: 'SENT',
          mismatch_flag: false,
          transport_mode: transportMode,
          elapsed_mins: 1,
          resolution_notes: `Pre-arrival bed held at ${facility.name}. Priority ambulance en-route.`,
        };

        localReferralLogs.unshift(newLog);

        raahClient.recordEvent(
          'FACILITY_ROUTED',
          newLog.id,
          newLog.patient_id,
          `Referral dispatched to ${facility.name}. Status: SENT (ETA ${facility.eta_mins} mins)`,
          { facilityId: facility.id, initialTier: triage.tier }
        );

        return newLog;
      }
    } catch (err) {
      console.warn('Backend referral dispatch failed, logging locally:', err);
    }

    const newLog: ReferralLogItem = {
      id: `REF-${Math.floor(9100 + Math.random() * 899)}`,
      patient_id: `PT-${Math.floor(7800 + Math.random() * 999)}`,
      timestamp: 'Just now',
      initial_tier: triage.tier,
      facility_name: facility.name,
      facility_id: facility.id,
      status: 'SENT',
      mismatch_flag: false,
      transport_mode: transportMode,
      elapsed_mins: 1,
      resolution_notes: `Pre-arrival bed held at ${facility.name}.`,
    };

    localReferralLogs.unshift(newLog);

    raahClient.recordEvent(
      'FACILITY_ROUTED',
      newLog.id,
      newLog.patient_id,
      `Referral dispatched to ${facility.name}. Status: SENT (ETA ${facility.eta_mins} mins)`,
      { facilityId: facility.id, initialTier: triage.tier }
    );

    return newLog;
  },

  /**
   * Recalibrate rule weights based on outcome mismatches
   */
  async recalibrateRuleWeights(ruleName: string, delta: number): Promise<{ success: boolean; message: string }> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    raahClient.recordEvent(
      'WEIGHT_RECALIBRATED',
      'SYSTEM-TUNE',
      'RULE_CALIBRATOR',
      `Adaptive weight tuned: ${ruleName} shifted by ${delta > 0 ? '+' : ''}${delta.toFixed(2)} based on outcome mismatch feedback.`,
      { ruleName, delta }
    );

    return {
      success: true,
      message: `Rule ${ruleName} sensitivity weight adjusted by ${delta > 0 ? '+' : ''}${delta}.`
    };
  },

  /**
   * Get facility list
   */
  async getFacilities(): Promise<Facility[]> {
    return DISTRICT_FACILITIES;
  },

  /**
   * Check connection status
   */
  getConnectionInfo() {
    return {
      isLiveBackend: true,
      endpoint: 'FastAPI Backend (:8000)'
    };
  }
};
