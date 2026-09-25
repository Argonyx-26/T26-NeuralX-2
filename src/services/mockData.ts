import { Facility, ReferralLogItem, PatientInput } from '../types/triage';

export const DISTRICT_FACILITIES: Facility[] = [
  {
    id: 'fac-st-johns',
    name: "St. John's District Hospital",
    type: 'District Hospital',
    distance_km: 6.2,
    eta_mins: 14,
    icu_beds_available: 4,
    general_beds_available: 18,
    oxygen_beds_available: 9,
    specialist_on_duty: 'Cardiology & Critical Care (Dr. A. Sharma)',
    match_score: 96,
    capacity_status: 'AMPLE',
    address: 'Sector 4, Mahatma Gandhi Marg, South District',
    phone: '+91 11 2658 8500',
    is_simulated: true,
  },
  {
    id: 'fac-city-civil',
    name: 'City Civil Hospital & Trauma Centre',
    type: 'Tertiary Medical College',
    distance_km: 11.5,
    eta_mins: 26,
    icu_beds_available: 8,
    general_beds_available: 32,
    oxygen_beds_available: 15,
    specialist_on_duty: 'Emergency Trauma & Pulmonology (Dr. V. Rao)',
    match_score: 84,
    capacity_status: 'AMPLE',
    address: 'Ring Road, Civil Lines Hub',
    phone: '+91 11 2390 1200',
    is_simulated: true,
  },
  {
    id: 'fac-metro-community',
    name: 'Adarsh Community Health Centre (CHC)',
    type: 'Community Health Center',
    distance_km: 3.4,
    eta_mins: 9,
    icu_beds_available: 0,
    general_beds_available: 6,
    oxygen_beds_available: 2,
    specialist_on_duty: 'General Physician & Obstetrics (Dr. P. Nair)',
    match_score: 72,
    capacity_status: 'CONGESTED',
    address: 'Market Yard Road, Ward 12',
    phone: '+91 11 2781 4411',
    is_simulated: true,
  },
  {
    id: 'fac-green-valley',
    name: 'Green Valley Urban Primary Health Clinic (PHC)',
    type: 'Primary Health Clinic',
    distance_km: 1.8,
    eta_mins: 5,
    icu_beds_available: 0,
    general_beds_available: 1,
    oxygen_beds_available: 0, // CRITICAL: 0 O2 beds!
    specialist_on_duty: 'Duty Medical Officer (MBBS)',
    match_score: 35,
    capacity_status: 'NO_BEDS',
    address: 'Block B, Colony Road, Near Post Office',
    phone: '+91 11 2542 9011',
    is_simulated: true,
  },
  {
    id: 'fac-apex-super',
    name: 'Apex Multispeciality Referral Institute',
    type: 'Tertiary Medical College',
    distance_km: 14.8,
    eta_mins: 32,
    icu_beds_available: 12,
    general_beds_available: 45,
    oxygen_beds_available: 20,
    specialist_on_duty: 'Cardiothoracic Surgery & Neuro (Dr. S. Kulkarni)',
    match_score: 79,
    capacity_status: 'AMPLE',
    address: 'NH-48 Tech Corridor, Cyber City',
    phone: '+91 11 4100 7700',
    is_simulated: true,
  }
];

export const DEMO_PRESETS: { name: string; tag: string; description: string; data: PatientInput }[] = [
  {
    name: "1. Acute Chest Pain & STEMI Risk",
    tag: "Critical Tier 1",
    description: "Crushing retrosternal chest pain radiating to left arm with diaphoresis. Immediate activation of cath lab / tertiary trauma pathway.",
    data: {
      chief_complaint: "Crushing retrosternal chest pain radiating to left arm and jaw for 45 minutes, profuse sweating, nausea, acute distress.",
      duration_hours: 1,
      vitals: {
        heart_rate: 118,
        bp_systolic: 162,
        bp_diastolic: 98,
        spo2: 91,
        respiratory_rate: 22,
        temperature: 101.4
      },
      history: {
        diabetes: true,
        hypertension: true,
        asthma_copd: false,
        prior_cardiac_event: true,
        age: 58,
        gender: 'M',
        smoker: true
      }
    }
  },
  {
    name: "2. Ambiguous Post-Prandial Symptoms",
    tag: "Active Uncertainty Check",
    description: "Vague chest discomfort after heavy lunch. Demonstrates model admitting ambiguity, asking 2 clarifying questions, and offering human escalation.",
    data: {
      chief_complaint: "Feeling vague discomfort in the chest and lightheadedness for the past 2 hours after having a heavy fried lunch. Slight sweating but no crushing sensation.",
      duration_hours: 2,
      vitals: {
        heart_rate: 78,
        bp_systolic: 146,
        bp_diastolic: 92,
        spo2: 98,
        respiratory_rate: 18,
        temperature: 98.6
      },
      history: {
        diabetes: true,
        hypertension: false,
        asthma_copd: false,
        prior_cardiac_event: false,
        age: 54,
        gender: 'M',
        smoker: true
      }
    }
  },
  {
    name: "3. Moderate Asthmatic Wheezing",
    tag: "Medium Risk Tier 3",
    description: "Moderate persistent wheeze with stable vitals. Calibrated to Community Health Centre or secondary care without overburdening tertiary ICU.",
    data: {
      chief_complaint: "Moderate persistent wheezing and tightness in chest for the past 2 days, dry cough, mild breathlessness on climbing stairs, partial relief from salbutamol.",
      duration_hours: 48,
      vitals: {
        heart_rate: 88,
        bp_systolic: 124,
        bp_diastolic: 80,
        spo2: 95,
        respiratory_rate: 20,
        temperature: 98.6
      },
      history: {
        diabetes: false,
        hypertension: false,
        asthma_copd: true,
        prior_cardiac_event: false,
        age: 38,
        gender: 'F',
        smoker: false
      }
    }
  }
];

// Seeded dataset: 50 records representing closed-loop tracking
// 36 Confirmed (72%), 9 Lost to Follow-up (18%), 5 Mismatched Outcomes (10%)
export const SEEDED_REFERRAL_LOGS: ReferralLogItem[] = [
  {
    id: "REF-9082",
    patient_id: "PT-7712",
    timestamp: "12 mins ago",
    initial_tier: "CRITICAL",
    facility_name: "St. John's District Hospital",
    facility_id: "fac-st-johns",
    status: "CONFIRMED",
    actual_outcome_tier: "CRITICAL",
    mismatch_flag: false,
    transport_mode: "108 Govt Ambulance",
    elapsed_mins: 18,
    resolution_notes: "Admitted to CCU Bed #3. Troponin positive, immediate PCI initiated."
  },
  {
    id: "REF-9081",
    patient_id: "PT-7709",
    timestamp: "34 mins ago",
    initial_tier: "HIGH",
    facility_name: "City Civil Hospital & Trauma Centre",
    facility_id: "fac-city-civil",
    status: "CONFIRMED",
    actual_outcome_tier: "HIGH",
    mismatch_flag: false,
    transport_mode: "Private Vehicle",
    elapsed_mins: 31,
    resolution_notes: "Severe COPD exacerbation. Non-invasive BiPAP ventilation commenced."
  },
  {
    id: "REF-9080",
    patient_id: "PT-7695",
    timestamp: "1 hour ago",
    initial_tier: "MEDIUM",
    facility_name: "Adarsh Community Health Centre (CHC)",
    facility_id: "fac-metro-community",
    status: "LOST_TO_FOLLOW_UP",
    actual_outcome_tier: undefined,
    mismatch_flag: false,
    transport_mode: "Auto Rickshaw",
    elapsed_mins: 65,
    resolution_notes: "ASHA worker alert generated. Patient did not register at OPD triage counter."
  },
  {
    id: "REF-9079",
    patient_id: "PT-7691",
    timestamp: "1.5 hours ago",
    initial_tier: "MEDIUM",
    facility_name: "St. John's District Hospital",
    facility_id: "fac-st-johns",
    status: "CONFIRMED",
    actual_outcome_tier: "CRITICAL", // MISMATCH: Under-triaged!
    mismatch_flag: true,
    mismatch_reason: "Initial triage scored MEDIUM (vague epigastric discomfort). Hospital confirmed acute inferior wall STEMI.",
    transport_mode: "Private Vehicle",
    elapsed_mins: 22,
    resolution_notes: "Rule tuning flag: Increased weight for diabetic elderly presenting with post-meal distress."
  },
  {
    id: "REF-9078",
    patient_id: "PT-7688",
    timestamp: "2 hours ago",
    initial_tier: "HIGH",
    facility_name: "St. John's District Hospital",
    facility_id: "fac-st-johns",
    status: "CONFIRMED",
    actual_outcome_tier: "LOW", // MISMATCH: Over-triaged
    mismatch_flag: true,
    mismatch_reason: "Initial triage scored HIGH (tachypnea + panic). Hospital evaluation confirmed acute hyperventilation/anxiety.",
    transport_mode: "Taxi",
    elapsed_mins: 27,
    resolution_notes: "Discharged after reassurance & anxiolytic. Adjusted SpO2 stability filter."
  },
  {
    id: "REF-9077",
    patient_id: "PT-7680",
    timestamp: "2.5 hours ago",
    initial_tier: "LOW",
    facility_name: "Adarsh Community Health Centre (CHC)",
    facility_id: "fac-metro-community",
    status: "CONFIRMED",
    actual_outcome_tier: "LOW",
    mismatch_flag: false,
    transport_mode: "Walk-in",
    elapsed_mins: 15,
    resolution_notes: "Mild acute bronchitis. Prescribed bronchodilator and home hydration."
  },
  {
    id: "REF-9076",
    patient_id: "PT-7674",
    timestamp: "3 hours ago",
    initial_tier: "HIGH",
    facility_name: "City Civil Hospital & Trauma Centre",
    facility_id: "fac-city-civil",
    status: "LOST_TO_FOLLOW_UP",
    actual_outcome_tier: undefined,
    mismatch_flag: false,
    transport_mode: "108 Govt Ambulance",
    elapsed_mins: 180,
    resolution_notes: "Ambulance dispatched. Patient family opted for private nursing home en route."
  },
  {
    id: "REF-9075",
    patient_id: "PT-7669",
    timestamp: "3.5 hours ago",
    initial_tier: "CRITICAL",
    facility_name: "Apex Multispeciality Referral Institute",
    facility_id: "fac-apex-super",
    status: "CONFIRMED",
    actual_outcome_tier: "CRITICAL",
    mismatch_flag: false,
    transport_mode: "Advanced Life Support Ambulance",
    elapsed_mins: 28,
    resolution_notes: "Polytrauma with hemorrhagic shock. Massive transfusion protocol initiated."
  },
  {
    id: "REF-9074",
    patient_id: "PT-7662",
    timestamp: "4 hours ago",
    initial_tier: "MEDIUM",
    facility_name: "Adarsh Community Health Centre (CHC)",
    facility_id: "fac-metro-community",
    status: "CONFIRMED",
    actual_outcome_tier: "MEDIUM",
    mismatch_flag: false,
    transport_mode: "Private Vehicle",
    elapsed_mins: 25,
    resolution_notes: "Pyrexia of unknown origin with moderate dehydration. IV saline commenced."
  },
  {
    id: "REF-9073",
    patient_id: "PT-7655",
    timestamp: "5 hours ago",
    initial_tier: "LOW",
    facility_name: "Adarsh Community Health Centre (CHC)",
    facility_id: "fac-metro-community",
    status: "LOST_TO_FOLLOW_UP",
    actual_outcome_tier: undefined,
    mismatch_flag: false,
    transport_mode: "Public Bus",
    elapsed_mins: 300,
    resolution_notes: "Telephonic reminder sent at 2 hours. Patient self-managed with oral ORS."
  },
  {
    id: "REF-9072",
    patient_id: "PT-7649",
    timestamp: "5.5 hours ago",
    initial_tier: "HIGH",
    facility_name: "St. John's District Hospital",
    facility_id: "fac-st-johns",
    status: "CONFIRMED",
    actual_outcome_tier: "HIGH",
    mismatch_flag: false,
    transport_mode: "108 Govt Ambulance",
    elapsed_mins: 20,
    resolution_notes: "Diabetic ketoacidosis. Regular insulin infusion protocol active in Step-Down ICU."
  },
  {
    id: "REF-9071",
    patient_id: "PT-7641",
    timestamp: "6 hours ago",
    initial_tier: "LOW",
    facility_name: "Green Valley Urban Primary Health Clinic (PHC)",
    facility_id: "fac-green-valley",
    status: "CONFIRMED",
    actual_outcome_tier: "MEDIUM", // MISMATCH: Low to Medium
    mismatch_flag: true,
    mismatch_reason: "Initial triage scored LOW (mild skin rash). On examination patient developed severe urticaria requiring antihistamine IV.",
    transport_mode: "Walk-in",
    elapsed_mins: 14,
    resolution_notes: "Allergic reaction progression logged. Added allergy history weight factor."
  },
  {
    id: "REF-9070",
    patient_id: "PT-7634",
    timestamp: "7 hours ago",
    initial_tier: "CRITICAL",
    facility_name: "City Civil Hospital & Trauma Centre",
    facility_id: "fac-city-civil",
    status: "CONFIRMED",
    actual_outcome_tier: "CRITICAL",
    mismatch_flag: false,
    transport_mode: "108 Govt Ambulance",
    elapsed_mins: 24,
    resolution_notes: "Acute ischemic stroke within 3.5 hour window. Thrombolytic therapy administered."
  },
  {
    id: "REF-9069",
    patient_id: "PT-7629",
    timestamp: "8 hours ago",
    initial_tier: "MEDIUM",
    facility_name: "St. John's District Hospital",
    facility_id: "fac-st-johns",
    status: "CONFIRMED",
    actual_outcome_tier: "MEDIUM",
    mismatch_flag: false,
    transport_mode: "Private Vehicle",
    elapsed_mins: 35,
    resolution_notes: "Acute renal colic. Spasmolytic given, ultrasound shows 4mm ureteric stone."
  },
  {
    id: "REF-9068",
    patient_id: "PT-7621",
    timestamp: "9 hours ago",
    initial_tier: "HIGH",
    facility_name: "St. John's District Hospital",
    facility_id: "fac-st-johns",
    status: "LOST_TO_FOLLOW_UP",
    actual_outcome_tier: undefined,
    mismatch_flag: false,
    transport_mode: "Auto Rickshaw",
    elapsed_mins: 400,
    resolution_notes: "Emergency contact contacted. Patient refused transfer due to transport barrier."
  },
  // Additional batch of realistic referral records across the past 48 hours
  ...Array.from({ length: 35 }).map((_, i) => {
    const statuses: ('CONFIRMED' | 'CONFIRMED' | 'CONFIRMED' | 'LOST_TO_FOLLOW_UP')[] = [
      'CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'LOST_TO_FOLLOW_UP'
    ];
    const tiers: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const facilities = DISTRICT_FACILITIES;
    const selectedFacility = facilities[i % facilities.length];
    const initialTier = tiers[i % tiers.length];
    const status = statuses[i % statuses.length];
    
    // Create 2 more realistic mismatches in the background
    const isMismatch = (i === 7 || i === 21);
    const actualTier = isMismatch 
      ? (initialTier === 'LOW' ? 'MEDIUM' : 'LOW')
      : (status === 'CONFIRMED' ? initialTier : undefined);

    const hoursAgo = Math.floor(10 + (i * 1.1));

    return {
      id: `REF-${9067 - i}`,
      patient_id: `PT-${7610 - i * 3}`,
      timestamp: `${hoursAgo} hours ago`,
      initial_tier: initialTier,
      facility_name: selectedFacility.name,
      facility_id: selectedFacility.id,
      status: status,
      actual_outcome_tier: actualTier,
      mismatch_flag: isMismatch,
      mismatch_reason: isMismatch 
        ? (initialTier === 'LOW' ? "Atypical symptom presentation required step-up care" : "Subjective severity score exceeded clinical baseline")
        : undefined,
      transport_mode: i % 2 === 0 ? "108 Govt Ambulance" : "Private Transport",
      elapsed_mins: 15 + (i * 3) % 45,
      resolution_notes: status === 'CONFIRMED' ? "Case registered, triage concordant with admission notes." : "Follow-up SMS trigger sent to district field worker."
    };
  })
];
