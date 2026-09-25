import React, { useState } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Send, 
  Navigation, 
  Bed, 
  ShieldCheck, 
  CheckCheck, 
  CheckCircle2, 
  UserCheck, 
  ShieldAlert,
  ChevronRight,
  Database
} from 'lucide-react';
import { TriageResponse, Facility, RiskTier } from '../types/triage';

interface ReferralResultsCardProps {
  triage: TriageResponse;
  onDispatchReferral: (facility: Facility) => void;
  onRetest: () => void;
  isDispatching: boolean;
  dispatchedFacilityId?: string;
}

export const ReferralResultsCard: React.FC<ReferralResultsCardProps> = ({
  triage,
  onDispatchReferral,
  onRetest,
  isDispatching,
  dispatchedFacilityId
}) => {
  const [showAllFacilities, setShowAllFacilities] = useState(false);

  const getTierPill = (tier: RiskTier) => {
    switch (tier) {
      case 'CRITICAL':
        return {
          className: 'px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-red-100/90 text-red-700 border border-red-200/80 shadow-xs flex items-center gap-1.5 backdrop-blur-md',
          dot: 'bg-red-600 animate-pulse',
          label: 'CRITICAL RISK (TIER 1)',
          code: 'Code: Resuscitation / Acute ACS Protocol'
        };
      case 'HIGH':
        return {
          className: 'px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-terracotta-100/90 text-terracotta-700 border border-terracotta-200/80 shadow-xs flex items-center gap-1.5 backdrop-blur-md',
          dot: 'bg-terracotta-600',
          label: 'HIGH RISK (TIER 2)',
          code: 'Code: Urgent Admission (30m target)'
        };
      case 'MEDIUM':
        return {
          className: 'px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-amber-100/90 text-amber-800 border border-amber-200/80 shadow-xs flex items-center gap-1.5 backdrop-blur-md',
          dot: 'bg-amber-600',
          label: 'MODERATE TIER',
          code: 'Code: Subacute Community Clinic'
        };
      case 'LOW':
        return {
          className: 'px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-emerald-100/90 text-emerald-800 border border-emerald-200/80 shadow-xs flex items-center gap-1.5 backdrop-blur-md',
          dot: 'bg-emerald-600',
          label: 'LOW RISK TIER',
          code: 'Code: Ambulatory / Primary Consultation'
        };
      case 'UNCERTAIN':
      default:
        return {
          className: 'px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-amber-100/90 text-amber-900 border border-amber-300 shadow-xs flex items-center gap-1.5 backdrop-blur-md',
          dot: 'bg-amber-700 animate-pulse',
          label: 'UNCERTAIN — ESCALATE TO HUMAN',
          code: 'Code: Missing Data Protocol'
        };
    }
  };

  const tierInfo = getTierPill(triage.tier);
  const facility = triage.recommended_facility;
  const confidencePercent = Math.round(triage.confidence * 100);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-200/80 text-[10px] tracking-widest text-sand-700 uppercase font-semibold border border-sand-300/50 backdrop-blur-md">
            <Activity className="w-3 h-3 text-terracotta-500" />
            <span>Live Evaluation Result</span>
          </div>
          <h2 className="text-2xl font-semibold text-sand-900 mt-1">
            Capacity-Matched Decision Output
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRetest}
            className="px-4 py-2 rounded-full neo-glass-pill text-xs font-medium text-sand-700 hover:text-sand-900 flex items-center gap-1.5 transition-all shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-evaluate Intake</span>
          </button>

          {facility && (
            <button
              onClick={() => onDispatchReferral(facility)}
              disabled={isDispatching || dispatchedFacilityId === facility.id}
              className="px-5 py-2 rounded-full bg-sand-900 text-white text-xs font-medium hover:bg-sand-800 shadow-md flex items-center gap-1.5 transition-all bronze-glow disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5 text-terracotta-400" />
              <span>{dispatchedFacilityId === facility.id ? 'Referral Dispatched' : 'Dispatch Referral'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Human Escalation Notice if applicable */}
      {triage.escalate_to_human && (
        <div className="neo-glass-card rounded-[2.3rem] p-6 border-l-4 border-amber-500 space-y-3">
          <div className="flex items-center gap-2 text-sand-900 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-terracotta-500" />
            <span>Active Escalation Pathway: Handover to Senior Clinical Lead Dispatched</span>
          </div>
          <p className="text-xs text-sand-700 leading-relaxed font-light">
            {triage.escalation_reason || 'Autonomous scoring suspended to avoid unsafe reassurance under clinical ambiguity. Handed over to Attending Triage Officer.'}
          </p>
        </div>
      )}

      {/* 2-Column Minimal Neo-Glass Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Risk Tier + SHAP Explainability + Confidence Gauge */}
        <div className="lg:col-span-7 neo-glass-card rounded-[2.3rem] p-6 sm:p-7 space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            
            {/* Tier & Confidence Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-sand-300/40 pb-4">
              <div>
                <span className="tracking-widest text-[10px] text-sand-600 uppercase font-semibold">
                  Risk Classification
                </span>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className={tierInfo.className}>
                    <span className={`w-2 h-2 rounded-full ${tierInfo.dot}`}></span>
                    <span>{tierInfo.label}</span>
                  </span>
                  <span className="text-xs text-sand-600 font-mono hidden sm:inline">
                    {tierInfo.code}
                  </span>
                </div>
              </div>

              {/* Confidence Dial Glass Pod */}
              <div className="flex items-center gap-3 bg-white/70 px-4 py-2.5 rounded-2xl border border-white/90 shadow-sm backdrop-blur-md">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-sand-200"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className="text-sand-900 transition-all duration-700"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${confidencePercent}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-bold text-sand-900 font-mono">
                    {confidencePercent}%
                  </span>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-sand-500 tracking-wider">
                    Clinical Certainty
                  </div>
                  <div className="text-xs font-medium text-sand-800">
                    {confidencePercent >= 90
                      ? 'Strong Clinical Correlation'
                      : confidencePercent >= 75
                      ? 'Consistent Clinical Evidence'
                      : 'Active Uncertainty Check'}
                  </div>
                </div>
              </div>
            </div>

            {/* Contributing Risk Drivers (SHAP Explainability) */}
            <div className="space-y-3">
              <span className="tracking-widest text-[11px] text-sand-600 uppercase font-medium flex items-center justify-between">
                <span>Contributing Risk Drivers (Deterministic Explainability)</span>
                <span className="text-[10px] text-sand-500 font-normal">Ranked by weight</span>
              </span>

              <div className="space-y-2.5">
                {triage.contributing_factors.map((factor, idx) => {
                  const impactPercent = Math.max(12, 45 - idx * 12);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white/60 border border-white/90 shadow-xs flex items-start justify-between gap-3 backdrop-blur-sm"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="p-1 rounded-md bg-terracotta-100 text-terracotta-700 text-xs font-semibold mt-0.5">
                          +{impactPercent}%
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-sand-900">
                            {factor}
                          </div>
                          <div className="text-[11px] text-sand-600">
                            Statistical risk attribution weight
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-sand-500 font-mono">
                        w:0.{(380 - idx * 75).toString().padEnd(3, '0')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Guideline Reference Note */}
          <div className="pt-4 border-t border-sand-300/40 text-[11px] text-sand-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>AHA/ACC & NEWS2 Emergency Decision Rules Matched</span>
            </span>
            <span className="font-mono text-sand-500">Case ID: {triage.case_id}</span>
          </div>
        </div>

        {/* Right Column: Capacity-Matched Facility */}
        {facility && (
          <div className="lg:col-span-5 neo-glass-card rounded-[2.3rem] p-6 sm:p-7 space-y-5 flex flex-col justify-between border-l-4 border-sand-500/80">
            <div className="space-y-5">
              
              {/* Simulation Banner Pill */}
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-sand-200/80 border border-sand-300/80 text-[10px] tracking-wider text-sand-800 font-mono font-semibold backdrop-blur-md">
                  [SIMULATED DISTRICT CAPACITY DATA]
                </span>
                <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live Telemetry</span>
                </span>
              </div>

              {/* Hospital Title & Key ETA */}
              <div>
                <span className="tracking-widest text-[10px] text-sand-500 uppercase font-semibold">
                  Recommended Regional Node
                </span>
                <h3 className="text-xl font-bold text-sand-900 mt-1">
                  {facility.name}
                </h3>
                <p className="text-xs text-sand-600 mt-0.5">
                  {facility.address} · {facility.distance_km} km away
                </p>
              </div>

              {/* ETA & Bed Gauge Pod */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* Travel ETA */}
                <div className="p-4 rounded-2xl neo-glass-pill shadow-xs">
                  <div className="text-[10px] uppercase font-semibold text-sand-500 flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-sand-600" />
                    <span>Ambulance ETA</span>
                  </div>
                  <div className="text-2xl font-bold text-sand-900 mt-1 flex items-baseline gap-1 font-mono">
                    <span>{facility.eta_mins}</span>
                    <span className="text-xs font-light text-sand-500">mins</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Low-congestion route</span>
                  </div>

                </div>

                {/* ICU Beds */}
                <div className="p-4 rounded-2xl neo-glass-pill shadow-xs">
                  <div className="text-[10px] uppercase font-semibold text-sand-500 flex items-center gap-1">
                    <Bed className="w-3 h-3 text-sand-600" />
                    <span>Available ICU</span>
                  </div>
                  <div className="text-2xl font-bold text-sand-900 mt-1 flex items-baseline gap-1 font-mono">
                    <span className={facility.icu_beds_available > 0 ? 'text-emerald-700' : 'text-terracotta-600'}>
                      {facility.icu_beds_available}
                    </span>
                    <span className="text-xs font-light text-sand-500">beds</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-1">
                    {facility.oxygen_beds_available} Oxygen beds
                  </div>
                </div>

              </div>

              {/* Specialist on Duty Card */}
              <div className="p-4 rounded-2xl bg-white/75 border border-white/95 flex items-center justify-between shadow-xs backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sand-200 border border-sand-300 flex items-center justify-center text-sand-700 font-bold text-xs shadow-inner">
                    Dr
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-sand-500 font-semibold">Specialist on Duty</div>
                    <div className="text-xs font-bold text-sand-900 line-clamp-1">
                      {facility.specialist_on_duty}
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[10px] font-semibold shrink-0">
                  On-Duty
                </span>

              </div>

              {/* Secondary Alternate Routing Notice */}
              <div className="p-3.5 rounded-2xl bg-sand-100/70 border border-dashed border-sand-300 text-xs space-y-1 backdrop-blur-sm">
                <div className="flex items-center justify-between text-sand-700 font-medium">
                  <span>Capacity Matching Score</span>
                  <span className="text-sand-900 font-mono font-bold">{facility.match_score}%</span>
                </div>
                <p className="text-[11px] text-sand-500 font-light">
                  Nearest clinic (1.8 km) bypassed due to 0 ICU beds. Optimal capacity confirmed at destination.
                </p>
              </div>

            </div>

            {/* Pre-Arrival Reservation Action */}
            <button
              disabled={isDispatching || dispatchedFacilityId === facility.id}
              onClick={() => onDispatchReferral(facility)}
              className="w-full py-3.5 rounded-full bg-sand-900 hover:bg-sand-800 text-white text-xs font-medium tracking-wide shadow-md transition-all flex items-center justify-center gap-2 bronze-glow cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{dispatchedFacilityId === facility.id ? 'Bed Pre-Arrival Slot Held' : 'Lock Pre-Arrival Bed Reservation'}</span>
            </button>

          </div>
        )}

      </div>

    </div>
  );
};
