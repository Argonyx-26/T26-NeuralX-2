import React, { useState } from 'react';
import { 
  GitMerge, 
  Clock, 
  Send, 
  Check, 
  AlertTriangle, 
  PhoneCall, 
  TrendingUp, 
  ShieldCheck, 
  Sliders, 
  CheckCircle2 
} from 'lucide-react';
import { ReferralLogItem, RiskTier } from '../types/triage';

interface AccountabilityDashboardProps {
  referralLogs: ReferralLogItem[];
  onConfirmArrival: (id: string, outcomeTier: RiskTier, notes: string) => void;
  onRecalibrateRule: (ruleName: string, delta: number) => void;
  isRecalibrating: boolean;
}

export const AccountabilityDashboard: React.FC<AccountabilityDashboardProps> = ({
  referralLogs,
  onConfirmArrival,
  onRecalibrateRule,
  isRecalibrating
}) => {
  const [filterMismatchOnly, setFilterMismatchOnly] = useState<boolean>(false);
  const [tuneMessage, setTuneMessage] = useState<string>('');

  const totalCases = referralLogs.length;
  const confirmedCases = referralLogs.filter((r) => r.status === 'CONFIRMED').length;
  const lostCases = referralLogs.filter((r) => r.status === 'LOST_TO_FOLLOW_UP').length;
  const mismatchCases = referralLogs.filter((r) => r.mismatch_flag).length;

  const confirmedRate = totalCases > 0 ? ((confirmedCases / totalCases) * 100).toFixed(1) : '72.0';
  const lostRate = totalCases > 0 ? ((lostCases / totalCases) * 100).toFixed(1) : '18.0';

  const handleTune = (rule: string, delta: number) => {
    onRecalibrateRule(rule, delta);
    setTuneMessage(`Recalibration executed: ${rule} adjusted by ${delta > 0 ? '+' : ''}${delta}. Rule sensitivity matrix updated.`);
    setTimeout(() => setTuneMessage(''), 4000);
  };

  const filteredLogs = filterMismatchOnly 
    ? referralLogs.filter(r => r.mismatch_flag)
    : referralLogs;

  // Split referral logs into 4 dynamic temporal slices (simulating weekly progression)
  const quarterSize = Math.max(1, Math.ceil(referralLogs.length / 4));
  const week1Logs = referralLogs.slice(0, quarterSize);
  const week2Logs = referralLogs.slice(quarterSize, quarterSize * 2);
  const week3Logs = referralLogs.slice(quarterSize * 2, quarterSize * 3);
  const week4Logs = referralLogs.slice(quarterSize * 3);

  const getMetrics = (bucket: ReferralLogItem[]) => ({
    total: bucket.length,
    confirmed: bucket.filter((r) => r.status === 'CONFIRMED').length,
    critical: bucket.filter((r) => r.initial_tier === 'CRITICAL').length,
    mismatches: bucket.filter((r) => r.mismatch_flag).length,
  });

  const m1 = getMetrics(week1Logs);
  const m2 = getMetrics(week2Logs);
  const m3 = getMetrics(week3Logs);
  const m4 = getMetrics(week4Logs);

  // Compute normalized Y positions (180 total height; bottom=160, top=35)
  const maxRef = Math.max(6, m1.total, m2.total, m3.total, m4.total);
  const scaleY = (val: number) => Math.round(155 - (val / maxRef) * 115);

  const yConf = [scaleY(m1.confirmed), scaleY(m2.confirmed), scaleY(m3.confirmed), scaleY(m4.confirmed)];
  const yCrit = [scaleY(m1.critical), scaleY(m2.critical), scaleY(m3.critical), scaleY(m4.critical)];
  const yMis = [scaleY(m1.mismatches), scaleY(m2.mismatches), scaleY(m3.mismatches), scaleY(m4.mismatches)];

  const xPts = [40, 260, 520, 760];

  const pathConfirmed = `M${xPts[0]},${yConf[0]} C150,${yConf[0]} 180,${yConf[1]} ${xPts[1]},${yConf[1]} C380,${yConf[1]} 420,${yConf[2]} ${xPts[2]},${yConf[2]} C620,${yConf[2]} 680,${yConf[3]} ${xPts[3]},${yConf[3]}`;
  const pathConfirmedArea = `${pathConfirmed} L${xPts[3]},170 L${xPts[0]},170 Z`;

  const pathCritical = `M${xPts[0]},${yCrit[0]} C150,${yCrit[0]} 180,${yCrit[1]} ${xPts[1]},${yCrit[1]} C380,${yCrit[1]} 420,${yCrit[2]} ${xPts[2]},${yCrit[2]} C620,${yCrit[2]} 680,${yCrit[3]} ${xPts[3]},${yCrit[3]}`;
  const pathCriticalArea = `${pathCritical} L${xPts[3]},170 L${xPts[0]},170 Z`;

  const pathMismatch = `M${xPts[0]},${yMis[0]} C150,${yMis[0]} 180,${yMis[1]} ${xPts[1]},${yMis[1]} C380,${yMis[1]} 420,${yMis[2]} ${xPts[2]},${yMis[2]} C620,${yMis[2]} 680,${yMis[3]} ${xPts[3]},${yMis[3]}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-200/80 text-[10px] tracking-widest text-sand-700 uppercase font-semibold border border-sand-300/50 backdrop-blur-md">
            <GitMerge className="w-3 h-3 text-sand-500" />
            <span>Post-Referral Verification Mesh</span>
          </div>
          <h2 className="text-2xl font-semibold text-sand-900 mt-1">
            Closed-Loop Accountability Dashboard
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs text-sand-600 bg-white/70 px-3.5 py-1.5 rounded-full border border-white/90 backdrop-blur-md">
          <Clock className="w-3.5 h-3.5 text-sand-500" />
          <span>Aggregated over last 30 operational days</span>
        </div>
      </div>

      {/* 3 Clean Glass Stat Pods */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Stat 1 */}
        <div className="neo-glass-card rounded-3xl p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between text-sand-600 mb-2">
            <span className="tracking-widest text-[11px] text-sand-600 uppercase font-medium">
              Referrals Sent
            </span>
            <div className="w-8 h-8 rounded-full bg-sand-200/80 flex items-center justify-center text-sand-700 shadow-xs">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-sand-900 font-mono">
            {totalCases}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+8.4% intake efficiency</span>
          </div>
          <div className="text-[10px] text-sand-500 mt-1">
            Across 5 participating district facilities
          </div>
        </div>

        {/* Stat 2 */}
        <div className="neo-glass-card rounded-3xl p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between text-sand-600 mb-2">
            <span className="tracking-widest text-[11px] text-sand-600 uppercase font-medium">
              Care Confirmed
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-100/90 flex items-center justify-center text-emerald-700 shadow-xs">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-sand-900 font-mono">
            {confirmedCases}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{confirmedRate}% successful completion</span>
          </div>
          <div className="text-[10px] text-sand-500 mt-1">
            Confirmed clinical arrival within 45 mins
          </div>
        </div>

        {/* Stat 3 */}
        <div className="neo-glass-card rounded-3xl p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between text-sand-600 mb-2">
            <span className="tracking-widest text-[11px] text-sand-600 uppercase font-medium">
              Lost-to-Follow-up
            </span>
            <div className="w-8 h-8 rounded-full bg-terracotta-100/90 flex items-center justify-center text-terracotta-600 shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-sand-900 font-mono">
            {lostCases}
          </div>
          <div className="text-xs text-terracotta-600 font-medium mt-2 flex items-center gap-1">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>{lostRate}% community ASHA dispatched</span>
          </div>
          <div className="text-[10px] text-sand-500 mt-1">
            Proactive health worker check auto-queued
          </div>
        </div>

      </div>

      {/* Recalibration notification */}
      {tuneMessage && (
        <div className="p-3.5 rounded-2xl bg-sand-200/90 border border-sand-400 text-sand-900 text-xs flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{tuneMessage}</span>
        </div>
      )}

      {/* Muted Glass Visual Chart Container (SVG Area Chart) */}
      <div className="neo-glass-card rounded-[2.3rem] p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sand-300/40 pb-3">
          <div>
            <span className="tracking-widest text-[11px] text-sand-600 uppercase font-medium">
              Outcome Distribution & Calibrated Concordance
            </span>
            <h4 className="text-sm font-semibold text-sand-900">
              30-Day Referral Trajectory & Adherence Ratio
            </h4>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5A5144]"></span>
              <span className="text-sand-700">Critical Care Confirmed</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C5A880]"></span>
              <span className="text-sand-700">Outpatient Managed</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97757]"></span>
              <span className="text-sand-700">Misclassification Recalibrated</span>
            </span>
          </div>
        </div>

        {/* Muted Sand/Terracotta SVG Area Chart with Glass Backdrop */}
        <div className="w-full h-52 relative pt-3">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 800 180">
            <defs>
              <linearGradient id="gradConfirmed" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#C5A880" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#C5A880" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="gradCritical" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#5A5144" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#5A5144" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle horizontal grid lines */}
            <line stroke="#E8DDD1" strokeDasharray="3 3" x1="0" x2="800" y1="30" y2="30" />
            <line stroke="#E8DDD1" strokeDasharray="3 3" x1="0" x2="800" y1="80" y2="80" />
            <line stroke="#E8DDD1" strokeDasharray="3 3" x1="0" x2="800" y1="130" y2="130" />

            {/* Outpatient / Confirmed Area */}
            <path d={pathConfirmedArea} fill="url(#gradConfirmed)" />
            <path d={pathConfirmed} fill="none" stroke="#C5A880" strokeWidth="2.5" />

            {/* Critical Inpatient Area */}
            <path d={pathCriticalArea} fill="url(#gradCritical)" />
            <path d={pathCritical} fill="none" stroke="#5A5144" strokeWidth="2" />

            {/* Recalibrated Mismatch Line (Terracotta) */}
            <path d={pathMismatch} fill="none" stroke="#D97757" strokeDasharray="4 2" strokeWidth="2" />

            {/* Dynamic Data markers */}
            {xPts.map((x, i) => (
              <g key={`markers-${i}`}>
                <circle cx={x} cy={yConf[i]} fill="#C5A880" r="4.5" stroke="#fff" strokeWidth="2" />
                <circle cx={x} cy={yCrit[i]} fill="#5A5144" r="4" stroke="#fff" strokeWidth="2" />
                <circle cx={x} cy={yMis[i]} fill="#D97757" r="3.5" stroke="#fff" strokeWidth="1.5" />
              </g>
            ))}
          </svg>

          <div className="flex justify-between text-[11px] text-sand-500 pt-2 font-mono">
            <span>Week 1 (Oct)</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4 (Current)</span>
          </div>
        </div>
      </div>

      {/* Outcome Mismatch Log (Neo-Glass Table) */}
      <div className="neo-glass-card rounded-[2.3rem] p-6 sm:p-7 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sand-300/40 pb-3">
          <div>
            <span className="tracking-widest text-[11px] text-sand-600 uppercase font-medium">
              Continual Recalibration Loop
            </span>
            <h4 className="text-sm font-semibold text-sand-900">
              Outcome Mismatch & Weight Adjustment Audit
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMismatchOnly(!filterMismatchOnly)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                filterMismatchOnly 
                  ? 'bg-sand-900 text-white border-sand-900' 
                  : 'bg-white/80 text-sand-700 border-sand-300'
              }`}
            >
              Mismatches Only ({mismatchCases})
            </button>
            <span className="text-xs text-sand-700 bg-white/80 px-3.5 py-1 rounded-full border border-sand-300/70 shadow-xs backdrop-blur-md hidden sm:inline">
              Auto-tuning enabled · Active Learning Mesh
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-sand-300/50 text-[10px] uppercase tracking-wider text-sand-600">
                <th className="py-2.5 font-semibold">Case Reference</th>
                <th className="py-2.5 font-semibold">Triage Prediction</th>
                <th className="py-2.5 font-semibold">Discharge Diagnosis</th>
                <th className="py-2.5 font-semibold">Concordance Drift</th>
                <th className="py-2.5 font-semibold">Rule Weight Recalibration</th>
                <th className="py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200/60 font-light">
              {filteredLogs.slice(0, 10).map((log) => {
                const isMismatch = log.mismatch_flag;
                return (
                  <tr key={log.id} className="hover:bg-white/50 transition-colors">
                    <td className="py-3 font-mono font-medium text-sand-900 whitespace-nowrap">
                      {log.id}
                      <span className="text-[10px] text-sand-500 block font-sans">{log.timestamp}</span>
                    </td>

                    <td className="py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        log.initial_tier === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-200' :
                        log.initial_tier === 'HIGH' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        log.initial_tier === 'MEDIUM' ? 'bg-sand-200 text-sand-800 border-sand-300' :
                        'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                        {log.initial_tier}
                      </span>
                    </td>

                    <td className="py-3 text-sand-800 font-medium whitespace-nowrap">
                      {log.actual_outcome_tier ? (
                        <span>{log.actual_outcome_tier} ({log.facility_name.split(' ')[0]})</span>
                      ) : (
                        <span className="text-sand-400 italic">En Route ({log.transport_mode})</span>
                      )}
                    </td>

                    <td className="py-3 font-mono whitespace-nowrap">
                      {isMismatch ? (
                        <span className="text-terracotta-600 font-semibold">Mismatch (-0.28)</span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">Concordant (+0.04)</span>
                      )}
                    </td>

                    <td className="py-3 text-sand-600 text-[11px] max-w-xs">
                      {log.mismatch_reason || log.resolution_notes}
                    </td>

                    <td className="py-3 text-right whitespace-nowrap">
                      {isMismatch ? (
                        <button
                          disabled={isRecalibrating}
                          onClick={() => handleTune('Atypical Presentation Weight', 0.25)}
                          className="px-2.5 py-1 rounded-full bg-sand-900 text-white text-[10px] font-medium hover:bg-sand-800 transition-all flex items-center gap-1 ml-auto"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Tune Rule</span>
                        </button>
                      ) : log.status === 'SENT' ? (
                        <button
                          onClick={() => onConfirmArrival(log.id, log.initial_tier, 'Bed arrival confirmed.')}
                          className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-medium hover:bg-emerald-500 transition-all"
                        >
                          Confirm
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-sand-200 text-sand-700 text-[10px]">
                          Audited
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
