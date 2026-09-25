import React, { useState } from 'react';
import { 
  HelpCircle, 
  X, 
  ShieldAlert, 
  UserCheck, 
  ArrowRight, 
  Check 
} from 'lucide-react';
import { ClarifyingQuestion, TriageResponse } from '../types/triage';

interface UncertaintyModalProps {
  isOpen: boolean;
  triage: TriageResponse;
  onClose: () => void;
  onSubmitAnswers: (answers: Record<string, string>) => void;
  onForceEscalate: () => void;
  isLoading: boolean;
}

export const UncertaintyModal: React.FC<UncertaintyModalProps> = ({
  isOpen,
  triage,
  onClose,
  onSubmitAnswers,
  onForceEscalate,
  isLoading
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!isOpen || !triage.requires_clarification) return null;

  const defaultQuestions: ClarifyingQuestion[] = triage.clarifying_questions?.length ? triage.clarifying_questions : [
    {
      id: 'cq-1',
      question: 'Does the chest discomfort change with deep inspiration or body position?',
      options: [
        'Yes — sharpens with breath (Pleuritic)',
        'No — constant crushing pressure'
      ]
    },
    {
      id: 'cq-2',
      question: 'Any prior history of cardiac stents or peripheral vascular disease?',
      options: [
        'Yes, documented PCI / Stent',
        'None / Unknown'
      ]
    }
  ];

  const handleSelectOption = (qId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitAnswers(answers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with deep frosted blur */}
      <div 
        className="absolute inset-0 bg-[#2C2825]/30 backdrop-blur-lg transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card (Warm Neo-Glass) */}
      <div className="relative z-10 w-full max-w-xl neo-glass-card rounded-[2.5rem] p-7 sm:p-9 shadow-2xl space-y-6 transform transition-all duration-300 animate-slide-up">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-100/90 text-amber-800 flex items-center justify-center border border-amber-300/50 shadow-sm shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="tracking-widest text-[10px] text-amber-800 uppercase font-semibold">
                Active Uncertainty Check
              </span>
              <h3 className="text-lg font-bold text-sand-900">
                Clarification Needed for Safe Triage
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/70 hover:bg-white text-sand-600 flex items-center justify-center border border-sand-300/60 shadow-xs transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-sand-600 leading-relaxed font-light">
          The predictive engine detected high differential ambiguity between benign thoracic spasm and unstable myocardial ischemia. Please clarify the following parameters:
        </p>

        {/* Clarifying Questions Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {defaultQuestions.map((q, qIdx) => (
            <div key={q.id} className="p-4 rounded-2xl bg-white/70 border border-white/90 shadow-xs space-y-2.5 backdrop-blur-md">
              <div className="text-xs font-semibold text-sand-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sand-200 text-sand-700 text-[10px] flex items-center justify-center font-bold">
                  {qIdx + 1}
                </span>
                <span>{q.question}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((option, optIdx) => {
                  const isSelected = answers[q.id] === option;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(q.id, option)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-medium border transition-all text-left shadow-xs flex items-center justify-between ${
                        isSelected
                          ? 'bg-sand-900 text-white border-sand-900'
                          : 'bg-white text-sand-700 border-sand-300/80 hover:border-sand-600'
                      }`}
                    >
                      <span>{option}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Explicit Human Review Fallback Card */}
          <div className="p-4 rounded-2xl bg-sand-100/90 border border-[#C5A880]/50 space-y-1.5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sand-900 font-semibold text-xs">
              <ShieldAlert className="w-4 h-4 text-terracotta-500" />
              <span>Uncertainty Threshold Reached — Directing to Clinical Lead</span>
            </div>
            <p className="text-[11px] text-sand-600 font-light leading-relaxed">
              Deliberate safety posture: When diagnostic confidence remains below 80% with atypical telemetry, automated routing halts to prevent algorithmic hallucination.
            </p>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onForceEscalate}
              className="px-5 py-2.5 rounded-full bg-white/90 hover:bg-white text-sand-800 border border-sand-300/80 text-xs font-medium transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-sand-600" />
              <span>Handover to Clinical Lead</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-full bg-sand-900 hover:bg-sand-800 text-white text-xs font-medium shadow-md transition-all flex items-center gap-1.5 bronze-glow cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Apply Clarification &amp; Route</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
