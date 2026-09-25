import React from 'react';
import { 
  ShieldCheck, 
  Layers, 
  Sparkles, 
  Activity, 
  Award,
  CheckCircle2
} from 'lucide-react';

export const ArchitectureGuide: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in text-sand-900">
      
      {/* Top Banner */}
      <div className="neo-glass-card rounded-[2.5rem] p-7 sm:p-9 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-200/80 text-[10px] tracking-widest text-sand-700 uppercase font-semibold border border-sand-300/50 backdrop-blur-md">
          <Award className="w-3.5 h-3.5 text-terracotta-500" />
          <span>Hackathon Pitch &amp; Evaluation Guide</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-sand-900">
          SetuHealth: “Setu” = Bridge from Symptom to Delivered Care
        </h1>
        <p className="text-sm text-sand-600 leading-relaxed font-light">
          Most clinical AI tools fail at two bottlenecks: <strong>Unsafe Overconfidence</strong> (guessing without admitting ambiguity) and the <strong>Referral-to-Nowhere Gap</strong> (generic advice without verifying whether beds exist or care was delivered). SetuHealth solves both natively.
        </p>
      </div>

      {/* The 3 Hackathon Demo Moments Script */}
      <div className="neo-glass-card rounded-[2.3rem] p-7 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-terracotta-500" />
          <h2 className="text-sm font-bold text-sand-900 uppercase tracking-wider">
            3 Judge Demo “Aha!” Moments &amp; Script
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Aha 1 */}
          <div className="p-4 rounded-2xl bg-white/70 border border-white/90 shadow-xs space-y-2 backdrop-blur-sm">
            <span className="text-[10px] font-mono font-bold text-terracotta-600 uppercase">AHA MOMENT #1</span>
            <h3 className="text-xs font-bold text-sand-900">
              Active Uncertainty Handling
            </h3>
            <p className="text-xs text-sand-600 leading-relaxed font-light">
              Enter ambiguous symptoms like <em>"chest discomfort and dizziness after a heavy meal"</em>.
            </p>
            <div className="p-2.5 rounded-xl bg-sand-100 text-[11px] text-sand-700 italic border border-sand-200 font-light">
              “Notice it didn't hallucinate a diagnosis. It detected conflicting factors, asked two clarifying questions, and flagged an escalation path for human review.”
            </div>
          </div>

          {/* Aha 2 */}
          <div className="p-4 rounded-2xl bg-white/70 border border-white/90 shadow-xs space-y-2 backdrop-blur-sm">
            <span className="text-[10px] font-mono font-bold text-terracotta-600 uppercase">AHA MOMENT #2</span>
            <h3 className="text-xs font-bold text-sand-900">
              Capacity-Aware Smart Routing
            </h3>
            <p className="text-xs text-sand-600 leading-relaxed font-light">
              Submit acute case (SpO₂ 92%, severe breathlessness). System bypasses Green Valley PHC (1.8km) because it has <strong>0 O2/ICU beds</strong>, and routes to District Hospital with available ICU capacity.
            </p>
            <div className="p-2.5 rounded-xl bg-sand-100 text-[11px] text-sand-700 italic border border-sand-200 font-light">
              “The routing algorithm is real; the district bed dataset is simulated to mirror ABDM health standards.”
            </div>
          </div>

          {/* Aha 3 */}
          <div className="p-4 rounded-2xl bg-white/70 border border-white/90 shadow-xs space-y-2 backdrop-blur-sm">
            <span className="text-[10px] font-mono font-bold text-terracotta-600 uppercase">AHA MOMENT #3</span>
            <h3 className="text-xs font-bold text-sand-900">
              Closed-Loop Tracking
            </h3>
            <p className="text-xs text-sand-600 leading-relaxed font-light">
              Switch to Accountability Dashboard. Show the 18% Lost-to-Follow-up rate and the Mismatch Log table.
            </p>
            <div className="p-2.5 rounded-xl bg-sand-100 text-[11px] text-sand-700 italic border border-sand-200 font-light">
              “Most healthcare hackathons stop when an alert is fired. SetuHealth tracks whether care was delivered, and uses mismatches to tune rule weights.”
            </div>
          </div>

        </div>
      </div>

      {/* What's Real vs. Simulated Table */}
      <div className="neo-glass-card rounded-[2.3rem] p-7 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-sand-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-terracotta-500" />
            <span>What’s Real vs. Simulated in This Build — Stated Up Front</span>
          </h2>
          <p className="text-xs text-sand-600 font-light mt-0.5">
            Pre-empting the panel's hardest questions with full transparency.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-sand-300/60">
          <table className="w-full text-left text-xs text-sand-800">
            <thead className="bg-sand-100 text-[10px] uppercase font-mono tracking-wider text-sand-600 border-b border-sand-300/60">
              <tr>
                <th className="p-3 font-semibold">Component</th>
                <th className="p-3 font-semibold">Status in This Build</th>
                <th className="p-3 font-semibold">What Would Change in Production</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200/60 font-light">
              
              <tr className="hover:bg-white/50">
                <td className="p-3 font-semibold text-sand-900">Symptom extraction &amp; scoring logic</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-semibold text-[10px]">
                    Real
                  </span>
                  <span className="text-sand-600 ml-2">Runs live against input in 1 atomic call</span>
                </td>
                <td className="p-3 text-sand-600">Threshold tuning against real case data over time.</td>
              </tr>

              <tr className="hover:bg-white/50">
                <td className="p-3 font-semibold text-sand-900">Uncertainty handler &amp; escalation path</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-semibold text-[10px]">
                    Real
                  </span>
                  <span className="text-sand-600 ml-2">Defined ambiguity threshold &amp; fallback</span>
                </td>
                <td className="p-3 text-sand-600">Threshold calibrated with clinical board input.</td>
              </tr>

              <tr className="hover:bg-white/50">
                <td className="p-3 font-semibold text-sand-900">Routing / matching algorithm</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-semibold text-[10px]">
                    Real
                  </span>
                  <span className="text-sand-600 ml-2">Genuine capacity scoring algorithm</span>
                </td>
                <td className="p-3 text-sand-600">No algorithm change — connects to live hospital feed.</td>
              </tr>

              <tr className="hover:bg-white/50">
                <td className="p-3 font-semibold text-sand-900">Facility capacity dataset</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full bg-sand-200 text-sand-800 font-mono font-semibold text-[10px]">
                    Simulated
                  </span>
                  <span className="text-sand-600 ml-2">Field-matched to district ABDM formats</span>
                </td>
                <td className="p-3 text-sand-600">Syncs from district bed-management feeds.</td>
              </tr>

              <tr className="hover:bg-white/50">
                <td className="p-3 font-semibold text-sand-900">Outcome confirmation loop</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full bg-sand-200 text-sand-800 font-mono font-semibold text-[10px]">
                    Seeded
                  </span>
                  <span className="text-sand-600 ml-2">Seeded 50+ cases demonstrates the closed-loop</span>
                </td>
                <td className="p-3 text-sand-600">Requires real hospital check-in or ASHA SMS trigger.</td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* Pitch Closing Line Card */}
      <div className="p-6 rounded-[2.3rem] neo-glass-card text-center space-y-2">
        <span className="text-[10px] font-mono font-bold uppercase text-terracotta-600 tracking-wider">
          Winning Hackathon Closing Line
        </span>
        <blockquote className="text-sm font-medium text-sand-900 max-w-xl mx-auto italic leading-relaxed">
          “Every team here will show you a model that predicts risk. We’re showing you the two things that actually cost patients timely care — AI overconfidence under uncertainty, and referrals that vanish after the alert is sent — and we’re telling you exactly which parts of our fix are real today and which are the next integration to build.”
        </blockquote>
      </div>

    </div>
  );
};
