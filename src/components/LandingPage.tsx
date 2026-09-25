import React from 'react';
import { 
  ShieldAlert, 
  Hospital, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  GitMerge, 
  Sparkles,
  HeartHandshake,
  Clock,
  Compass
} from 'lucide-react';

interface LandingPageProps {
  onStartTriage: () => void;
  onExploreDashboard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartTriage,
  onExploreDashboard
}) => {
  return (
    <div className="space-y-16 max-w-5xl mx-auto py-6 animate-fade-in text-sand-900">
      
      {/* 1. Hero Section */}
      <section className="text-center space-y-6 pt-4 sm:pt-8 max-w-3xl mx-auto">
        
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sand-200/80 border border-sand-300/70 shadow-xs text-xs tracking-wider text-sand-800 font-medium backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-terracotta-500" />
          <span>Intelligent Early Health-Risk &amp; Decision Support System</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-sand-900 leading-[1.12]">
          From Patient Symptoms to <span className="text-terracotta-500">Delivered Care</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-sand-600 font-light leading-relaxed max-w-2xl mx-auto">
          SetuHealth eliminates clinical AI guesswork. We combine deterministic vital scoring with an active uncertainty loop, capacity-verified hospital routing, and closed-loop patient tracking.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3">
          <button
            onClick={onStartTriage}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-sand-900 text-white font-medium text-sm tracking-wide shadow-lg hover:bg-sand-800 hover:shadow-xl transition-all flex items-center justify-center gap-2.5 bronze-glow cursor-pointer"
          >
            <span>Launch Triage Desk</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExploreDashboard}
            className="w-full sm:w-auto px-7 py-3.5 rounded-full neo-glass-pill text-sand-800 font-medium text-sm hover:text-sand-900 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <GitMerge className="w-4 h-4 text-sand-600" />
            <span>View Accountability Loop</span>
          </button>
        </div>

      </section>

      {/* 2. The Two Fatal Flaws We Solve */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <span className="text-xs font-mono font-semibold uppercase text-terracotta-600 tracking-wider">
            Why Clinical AI Fails Today
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-sand-900">
            Solving the Two Real Obstacles in Healthcare Triage
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Flaw 1 */}
          <div className="neo-glass-card rounded-[2.2rem] p-7 sm:p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-amber-800 font-semibold tracking-wider">
                Failure 1 · Unsafe Reassurance
              </span>
              <h3 className="text-lg font-bold text-sand-900">
                AI Models Guess Instead of Admitting Ambiguity
              </h3>
            </div>
            <p className="text-xs text-sand-600 leading-relaxed font-light">
              Most symptom checkers are one-shot forms that output a confident score even on vague input. When ambiguity is detected, SetuHealth refuses to hallucinate: it asks 1–2 nurse clarifying questions or triggers safe physician review.
            </p>
          </div>

          {/* Flaw 2 */}
          <div className="neo-glass-card rounded-[2.2rem] p-7 sm:p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-terracotta-100 text-terracotta-600 flex items-center justify-center shadow-xs">
              <Hospital className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-terracotta-600 font-semibold tracking-wider">
                Failure 2 · The Referral-to-Nowhere Gap
              </span>
              <h3 className="text-lg font-bold text-sand-900">
                Generic Alerts Without Bed or ICU Verification
              </h3>
            </div>
            <p className="text-xs text-sand-600 leading-relaxed font-light">
              Telling an acute patient to "go to the nearest hospital" fails if that clinic has 0 ICU beds. SetuHealth matches cases by distance, load, and verified bed availability, then tracks patient arrival until care is confirmed.
            </p>
          </div>

        </div>
      </section>

      {/* 3. The Three Core Capabilities (Clean 3-Card Grid) */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <span className="text-xs font-mono font-semibold uppercase text-sand-600 tracking-wider">
            Our 3 Core Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-sand-900">
            Engineered Deep, Simple to Use
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1 */}
          <div className="neo-glass-card rounded-[2rem] p-6 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sand-200/80 flex items-center justify-center text-sand-800">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-sand-900">
                1. Deterministic Scoring
              </h4>
              <p className="text-xs text-sand-600 leading-relaxed font-light">
                Inspired by clinical NEWS2 methodology. A single call returns Risk Tier, Contributing Factors, and Confidence natively — never a black box.
              </p>
            </div>
            <div className="pt-2 text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Auditable Explainability</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="neo-glass-card rounded-[2rem] p-6 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sand-200/80 flex items-center justify-center text-sand-800">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-sand-900">
                2. Active Uncertainty Loop
              </h4>
              <p className="text-xs text-sand-600 leading-relaxed font-light">
                When factors conflict or confidence is low, SetuHealth triggers 1–2 nurse clarifying questions or routes directly to senior physician review.
              </p>
            </div>
            <div className="pt-2 text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero Hallucination Reassurance</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="neo-glass-card rounded-[2rem] p-6 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sand-200/80 flex items-center justify-center text-sand-800">
                <Compass className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-sand-900">
                3. Capacity Routing &amp; Tracking
              </h4>
              <p className="text-xs text-sand-600 leading-relaxed font-light">
                Bypasses full clinics to route patients to facilities with free ICU beds and on-duty specialists, tracking outcomes to close the referral loop.
              </p>
            </div>
            <div className="pt-2 text-[11px] text-terracotta-600 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Capacity-Matched Hospital Routing</span>
            </div>

          </div>

        </div>
      </section>

      {/* 4. Simple Bottom Action Banner */}
      <section className="neo-glass-card rounded-[2.5rem] p-8 sm:p-12 text-center space-y-4">
        <h3 className="text-2xl sm:text-3xl font-bold text-sand-900">
          Ready to Experience the Decision Support Engine?
        </h3>
        <p className="text-xs sm:text-sm text-sand-600 font-light max-w-lg mx-auto leading-relaxed">
          Test clinical cases with instant 1-click scenarios, observe active uncertainty handling, and see capacity-matched hospital routing in action.
        </p>
        <div className="pt-2">
          <button
            onClick={onStartTriage}
            className="px-8 py-3.5 rounded-full bg-sand-900 text-white font-medium text-xs sm:text-sm tracking-wide shadow-lg hover:bg-sand-800 transition-all inline-flex items-center gap-2 bronze-glow cursor-pointer"
          >
            <span>Start Patient Triage Intake</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

    </div>
  );
};
