import React, { useState } from 'react';
import { 
  Sparkles, 
  FolderClock, 
  Activity, 
  Radio, 
  Heart, 
  Wind, 
  Thermometer, 
  Lock, 
  Cpu, 
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';

import { PatientInput, Vitals, PatientHistory } from '../types/triage';
import { DEMO_PRESETS } from '../services/mockData';

interface PatientIntakeFormProps {
  initialData?: PatientInput;
  onSubmit: (input: PatientInput) => void;
  isLoading: boolean;
}

const DEFAULT_VITALS: Vitals = {
  heart_rate: 118,
  bp_systolic: 162,
  bp_diastolic: 98,
  spo2: 91,
  respiratory_rate: 22,
  temperature: 101.4
};

const DEFAULT_HISTORY: PatientHistory = {
  diabetes: true,
  hypertension: true,
  asthma_copd: false,
  prior_cardiac_event: true,
  age: 58,
  gender: 'M',
  smoker: true
};

export const PatientIntakeForm: React.FC<PatientIntakeFormProps> = ({
  initialData,
  onSubmit,
  isLoading
}) => {
  const [complaint, setComplaint] = useState<string>(
    initialData?.chief_complaint || 
    "Crushing retrosternal chest pain radiating to left arm and jaw for 45 minutes, profuse sweating, nausea, acute distress."
  );
  const [durationHours, setDurationHours] = useState<number>(
    initialData?.duration_hours ?? 1
  );
  const [vitals, setVitals] = useState<Vitals>(
    initialData?.vitals || DEFAULT_VITALS
  );
  const [history, setHistory] = useState<PatientHistory>(
    initialData?.history || DEFAULT_HISTORY
  );
  const [activeScenarioKey, setActiveScenarioKey] = useState<string>('critical');
  const [showComorbidities, setShowComorbidities] = useState<boolean>(false);

  const handleScenarioClick = (key: string, idx: number) => {
    setActiveScenarioKey(key);
    const preset = DEMO_PRESETS[idx];
    if (preset) {
      setComplaint(preset.data.chief_complaint);
      setDurationHours(preset.data.duration_hours ?? 1);
      setVitals(preset.data.vitals);
      setHistory(preset.data.history);
    }
  };

  const handleVitalChange = (field: keyof Vitals, val: number) => {
    setVitals((prev) => ({ ...prev, [field]: isNaN(val) ? 0 : val }));
  };

  const handleHistoryToggle = (field: keyof PatientHistory) => {
    setHistory((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint.trim()) {
      alert('Please enter presenting symptoms or select a preset scenario.');
      return;
    }
    onSubmit({
      chief_complaint: complaint,
      duration_hours: durationHours,
      vitals,
      history
    });
  };

  // Vitals Status Indicators
  const isHrElevated = vitals.heart_rate > 100 || vitals.heart_rate < 55;
  const isBpElevated = vitals.bp_systolic >= 140 || vitals.bp_diastolic >= 90;
  const isHypoxic = vitals.spo2 < 94;
  const isFebrile = vitals.temperature > 100.4;

  const activeComorbidityCount = [
    history.diabetes,
    history.hypertension,
    history.asthma_copd,
    history.prior_cardiac_event
  ].filter(Boolean).length;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-4">
      
      {/* Header Subtext */}
      <div className="text-center max-w-xl mx-auto space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sand-200/70 border border-sand-300/60 shadow-xs text-[10px] tracking-widest text-sand-700 uppercase font-semibold backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-sand-500" />
          <span>Clinical Decision Support · Model 99.4% Calibrated</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-sand-900">
          Early Risk Evaluation &amp; Triage
        </h1>
        <p className="text-sm text-sand-600 font-light leading-relaxed">
          Input presenting symptoms and patient telemetry to synthesize risk probability, trigger active uncertainty checks, and locate nearest capacity.
        </p>
      </div>

      {/* Central Floating Neo-Glass Canvas */}
      <div className="neo-glass-card rounded-[2.5rem] p-7 sm:p-10 space-y-8 transition-all">
        
        {/* Sample Case Quick-Loader Chips (Single-line, spacious) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-sand-300/40">
          <span className="tracking-widest text-[11px] text-sand-600 uppercase font-medium flex items-center gap-1.5 whitespace-nowrap">
            <FolderClock className="w-3.5 h-3.5 text-sand-500" />
            Preset Clinical Scenarios:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            
            <button
              type="button"
              onClick={() => handleScenarioClick('critical', 0)}
              className={`whitespace-nowrap neo-glass-pill px-4 py-1.5 rounded-full text-xs font-medium transition-all shadow-xs flex items-center gap-2 active:scale-95 cursor-pointer ${
                activeScenarioKey === 'critical'
                  ? 'bg-white text-sand-900 border-sand-500 font-semibold shadow-sm'
                  : 'text-sand-700 hover:text-sand-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span>
              <span>1. Acute Chest Pain (Critical)</span>
            </button>

            <button
              type="button"
              onClick={() => handleScenarioClick('ambiguous', 1)}
              className={`whitespace-nowrap neo-glass-pill px-4 py-1.5 rounded-full text-xs font-medium transition-all shadow-xs flex items-center gap-2 active:scale-95 cursor-pointer ${
                activeScenarioKey === 'ambiguous'
                  ? 'bg-white text-sand-900 border-sand-500 font-semibold shadow-sm'
                  : 'text-sand-700 hover:text-sand-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
              <span>2. Ambiguous Symptoms (Uncertainty)</span>
            </button>

            <button
              type="button"
              onClick={() => handleScenarioClick('moderate', 2)}
              className={`whitespace-nowrap neo-glass-pill px-4 py-1.5 rounded-full text-xs font-medium transition-all shadow-xs flex items-center gap-2 active:scale-95 cursor-pointer ${
                activeScenarioKey === 'moderate'
                  ? 'bg-white text-sand-900 border-sand-500 font-semibold shadow-sm'
                  : 'text-sand-700 hover:text-sand-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
              <span>3. Moderate Wheeze (Medium)</span>
            </button>

          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Chief Complaint Text Area */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="tracking-widest text-[11px] text-sand-600 uppercase font-medium">
                Chief Complaint &amp; Contextual Anamnesis
              </label>
              <span className="text-[11px] text-sand-500 font-mono">
                {complaint.length} chars
              </span>
            </div>

            <div className="relative group">
              <textarea
                rows={3}
                value={complaint}
                onChange={(e) => {
                  setComplaint(e.target.value);
                  setActiveScenarioKey('');
                }}
                placeholder="Describe presenting symptoms, onset time, radiation pattern, patient age, and relevant pre-existing conditions..."
                className="w-full rounded-2xl bg-white/70 backdrop-blur-md border border-sand-300/80 focus:border-sand-500 focus:bg-white/90 focus:ring-4 focus:ring-sand-300/30 text-sand-900 placeholder:text-sand-400 p-4 text-sm leading-relaxed outline-none transition-all shadow-inner"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-sand-200/90 text-[10px] text-sand-700 uppercase tracking-wider font-semibold border border-sand-300/70 shadow-xs backdrop-blur-sm">
                  Audio NLP Active
                </span>
              </div>
            </div>

            {/* Inline Patient Profile Strip with Interactive Controls for Age, Sex, Onset */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-sand-600">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Age Input */}
                <div className="inline-flex items-center gap-1.5 bg-sand-200/50 hover:bg-sand-200/80 px-2.5 py-1 rounded-xl border border-sand-300/60 shadow-2xs transition-all">
                  <span className="text-sand-600 font-medium text-[11px]">Age:</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={history.age}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setHistory((prev) => ({ ...prev, age: isNaN(val) ? 0 : val }));
                    }}
                    className="w-12 px-1 py-0.5 text-center font-bold text-sand-900 bg-white/90 rounded border border-sand-300/70 focus:border-sand-600 focus:bg-white focus:ring-1 focus:ring-sand-400/40 outline-none font-mono text-xs shadow-inner"
                  />
                  <span className="text-sand-500 font-medium text-[11px]">yrs</span>
                </div>

                {/* Sex Toggle */}
                <div className="inline-flex items-center gap-1.5 bg-sand-200/50 hover:bg-sand-200/80 px-2.5 py-1 rounded-xl border border-sand-300/60 shadow-2xs transition-all">
                  <span className="text-sand-600 font-medium text-[11px]">Sex:</span>
                  <div className="inline-flex rounded-lg bg-sand-300/60 p-0.5 border border-sand-300/50">
                    <button
                      type="button"
                      onClick={() => setHistory((prev) => ({ ...prev, gender: 'M' }))}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                        history.gender === 'M'
                          ? 'bg-white text-sand-900 shadow-2xs'
                          : 'text-sand-600 hover:text-sand-900'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistory((prev) => ({ ...prev, gender: 'F' }))}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                        history.gender === 'F'
                          ? 'bg-white text-sand-900 shadow-2xs'
                          : 'text-sand-600 hover:text-sand-900'
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>

                {/* Onset Input */}
                <div className="inline-flex items-center gap-1.5 bg-sand-200/50 hover:bg-sand-200/80 px-2.5 py-1 rounded-xl border border-sand-300/60 shadow-2xs transition-all">
                  <span className="text-sand-600 font-medium text-[11px]">Onset:</span>
                  <input
                    type="number"
                    min={0.1}
                    max={168}
                    step={0.5}
                    value={durationHours}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setDurationHours(isNaN(val) ? 0 : val);
                    }}
                    className="w-12 px-1 py-0.5 text-center font-bold text-sand-900 bg-white/90 rounded border border-sand-300/70 focus:border-sand-600 focus:bg-white focus:ring-1 focus:ring-sand-400/40 outline-none font-mono text-xs shadow-inner"
                  />
                  <span className="text-sand-500 font-medium text-[11px]">h ago</span>
                </div>
              </div>

              {/* Comorbidities Accordion Toggle */}
              <button
                type="button"
                onClick={() => setShowComorbidities(!showComorbidities)}
                className="text-xs font-medium text-sand-700 hover:text-sand-900 flex items-center gap-1.5 transition-colors cursor-pointer bg-sand-200/50 hover:bg-sand-200/80 px-3 py-1.5 rounded-xl border border-sand-300/60 shadow-2xs"
              >
                <span>Clinical Comorbidities ({activeComorbidityCount})</span>
                {showComorbidities ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Expandable Comorbidities */}
            {showComorbidities && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 animate-fade-in">
                <button
                  type="button"
                  onClick={() => handleHistoryToggle('diabetes')}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    history.diabetes
                      ? 'bg-sand-200/90 border-sand-500 text-sand-900 font-semibold shadow-xs'
                      : 'bg-white/60 border-sand-300/70 text-sand-600 hover:bg-white'
                  }`}
                >
                  <span>Diabetes</span>
                  {history.diabetes && <CheckCircle2 className="w-4 h-4 text-sand-900" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleHistoryToggle('hypertension')}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    history.hypertension
                      ? 'bg-sand-200/90 border-sand-500 text-sand-900 font-semibold shadow-xs'
                      : 'bg-white/60 border-sand-300/70 text-sand-600 hover:bg-white'
                  }`}
                >
                  <span>Hypertension</span>
                  {history.hypertension && <CheckCircle2 className="w-4 h-4 text-sand-900" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleHistoryToggle('asthma_copd')}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    history.asthma_copd
                      ? 'bg-sand-200/90 border-sand-500 text-sand-900 font-semibold shadow-xs'
                      : 'bg-white/60 border-sand-300/70 text-sand-600 hover:bg-white'
                  }`}
                >
                  <span>Asthma / COPD</span>
                  {history.asthma_copd && <CheckCircle2 className="w-4 h-4 text-sand-900" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleHistoryToggle('prior_cardiac_event')}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    history.prior_cardiac_event
                      ? 'bg-terracotta-100 border-terracotta-400 text-terracotta-700 font-semibold shadow-xs'
                      : 'bg-white/60 border-sand-300/70 text-sand-600 hover:bg-white'
                  }`}
                >
                  <span>Prior Cardiac Event</span>
                  {history.prior_cardiac_event && <CheckCircle2 className="w-4 h-4 text-terracotta-600" />}
                </button>
              </div>
            )}
          </div>

          {/* Minimal Vitals Strip (4 Clean Spacious Cards) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="tracking-widest text-[11px] text-sand-600 uppercase font-medium">
                Minimal Vitals &amp; Real-Time Biometrics
              </span>
              <span className="text-[11px] text-sand-600 flex items-center gap-1 font-medium">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Telemetry Synced</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              {/* HR */}
              <div className="neo-glass-pill rounded-2xl p-4">
                <div className="flex items-center justify-between text-sand-600 text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Activity className="w-3.5 h-3.5 text-sand-500" />
                    Heart Rate
                  </span>
                  <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                    isHrElevated
                      ? 'text-terracotta-600 bg-terracotta-50/90 border border-terracotta-200/60'
                      : 'text-emerald-600 bg-emerald-50/90 border border-emerald-200/60'
                  }`}>
                    {isHrElevated ? 'Elevated' : 'Norm'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <input
                    type="number"
                    value={vitals.heart_rate}
                    onChange={(e) => handleVitalChange('heart_rate', parseInt(e.target.value))}
                    className="text-2xl font-bold text-sand-900 bg-transparent w-20 outline-none border-b border-dashed border-sand-300 focus:border-sand-700 font-mono"
                  />
                  <span className="text-xs text-sand-500 font-light">bpm</span>
                </div>
                <div className="text-[10px] text-sand-500 mt-2 font-light">Threshold: 60-100</div>
              </div>

              {/* BP */}
              <div className="neo-glass-pill rounded-2xl p-4">
                <div className="flex items-center justify-between text-sand-600 text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Heart className="w-3.5 h-3.5 text-sand-500" />
                    Blood Pressure
                  </span>
                  <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                    isBpElevated
                      ? 'text-terracotta-600 bg-terracotta-50/90 border border-terracotta-200/60'
                      : 'text-emerald-600 bg-emerald-50/90 border border-emerald-200/60'
                  }`}>
                    {isBpElevated ? 'Elevated' : 'Norm'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <input
                    type="number"
                    value={vitals.bp_systolic}
                    onChange={(e) => handleVitalChange('bp_systolic', parseInt(e.target.value))}
                    className="text-2xl font-bold text-sand-900 bg-transparent w-14 outline-none border-b border-dashed border-sand-300 focus:border-sand-700 font-mono"
                  />
                  <span className="text-sand-400 font-mono">/</span>
                  <input
                    type="number"
                    value={vitals.bp_diastolic}
                    onChange={(e) => handleVitalChange('bp_diastolic', parseInt(e.target.value))}
                    className="text-base font-bold text-sand-800 bg-transparent w-12 outline-none border-b border-dashed border-sand-300 focus:border-sand-700 font-mono"
                  />
                  <span className="text-xs text-sand-500 font-light ml-1">mmHg</span>
                </div>
                <div className="text-[10px] text-sand-500 mt-2 font-light">Target: &lt;120/80</div>
              </div>

              {/* SpO2 */}
              <div className="neo-glass-pill rounded-2xl p-4">
                <div className="flex items-center justify-between text-sand-600 text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Wind className="w-3.5 h-3.5 text-sand-500" />
                    SpO₂
                  </span>
                  <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                    isHypoxic
                      ? 'text-terracotta-600 bg-terracotta-50/90 border border-terracotta-200/60'
                      : 'text-emerald-600 bg-emerald-50/90 border border-emerald-200/60'
                  }`}>
                    {isHypoxic ? 'Hypoxic' : 'Norm'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={vitals.spo2}
                    onChange={(e) => handleVitalChange('spo2', parseInt(e.target.value))}
                    className="text-2xl font-bold text-sand-900 bg-transparent w-16 outline-none border-b border-dashed border-sand-300 focus:border-sand-700 font-mono"
                  />
                  <span className="text-xs text-sand-500 font-light">%</span>
                </div>
                <div className="text-[10px] text-sand-500 mt-2 font-light">Critical: &lt;94%</div>
              </div>

              {/* Temperature */}
              <div className="neo-glass-pill rounded-2xl p-4">
                <div className="flex items-center justify-between text-sand-600 text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Thermometer className="w-3.5 h-3.5 text-sand-500" />
                    Body Temp
                  </span>
                  <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                    isFebrile
                      ? 'text-terracotta-600 bg-terracotta-50/90 border border-terracotta-200/60'
                      : 'text-emerald-600 bg-emerald-50/90 border border-emerald-200/60'
                  }`}>
                    {isFebrile ? 'Febrile' : 'Norm'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <input
                    type="number"
                    step={0.1}
                    value={vitals.temperature}
                    onChange={(e) => handleVitalChange('temperature', parseFloat(e.target.value))}
                    className="text-2xl font-bold text-sand-900 bg-transparent w-20 outline-none border-b border-dashed border-sand-300 focus:border-sand-700 font-mono"
                  />
                  <span className="text-xs text-sand-500 font-light">°F</span>
                </div>
                <div className="text-[10px] text-sand-500 mt-2 font-light">Febrile: &gt;100.4</div>
              </div>

            </div>
          </div>

          {/* Bottom Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-sand-300/40">
            <div className="flex items-center gap-3 text-xs text-sand-600">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sand-500" />
                <span>Standardized Clinical Schema</span>
              </span>
              <span>•</span>
              <span className="font-mono text-[11px]">Model: Deterministic NEWS2</span>
            </div>


            {/* CTA Button with Rich Specular Sheen */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-sand-900 via-sand-800 to-sand-900 text-white font-medium text-sm tracking-wide shadow-lg hover:shadow-2xl hover:translate-y-[-1px] active:translate-y-[0px] transition-all flex items-center justify-center gap-2.5 bronze-glow group cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Evaluating Scoring Engine...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4 text-terracotta-400 group-hover:rotate-45 transition-transform duration-300" />
                  <span>Evaluate Triage &amp; Capacity</span>
                  <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
