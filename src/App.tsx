import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { PatientIntakeForm } from './components/PatientIntakeForm';
import { UncertaintyModal } from './components/UncertaintyModal';
import { ReferralResultsCard } from './components/ReferralResultsCard';
import { AccountabilityDashboard } from './components/AccountabilityDashboard';
import { RaahAuditDrawer } from './components/RaahAuditDrawer';
import { CapacityRoutingView } from './components/CapacityRoutingView';
import { PatientInput, TriageResponse, ReferralLogItem, Facility, RiskTier } from './types/triage';
import { api } from './services/api';
import { DEMO_PRESETS } from './services/mockData';
import { Check } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'intake' | 'referral' | 'dashboard'>('home');
  const [currentPatientInput, setCurrentPatientInput] = useState<PatientInput>(DEMO_PRESETS[1].data);
  const [triageResponse, setTriageResponse] = useState<TriageResponse | null>(null);
  const [referralLogs, setReferralLogs] = useState<ReferralLogItem[]>([]);
  
  // Modals & Drawer state
  const [isUncertaintyOpen, setIsUncertaintyOpen] = useState<boolean>(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState<boolean>(false);
  
  // Loading flags
  const [isLoadingTriage, setIsLoadingTriage] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [isRecalibrating, setIsRecalibrating] = useState<boolean>(false);
  const [dispatchedFacilityId, setDispatchedFacilityId] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getReferralLogs().then(setReferralLogs);
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  /**
   * Handle form submission
   */
  const handleIntakeSubmit = async (input: PatientInput) => {
    setCurrentPatientInput(input);
    setIsLoadingTriage(true);
    setDispatchedFacilityId(undefined);

    try {
      const response = await api.submitTriage(input);
      setTriageResponse(response);

      if (response.requires_clarification) {
        setIsUncertaintyOpen(true);
      } else {
        setActiveTab('referral');
        showToast(`Triage evaluated: ${response.tier} Risk calculated with ${Math.round(response.confidence * 100)}% confidence.`);
      }
    } catch (err) {
      console.error('Triage submission failed:', err);
    } finally {
      setIsLoadingTriage(false);
    }
  };

  /**
   * Handle clarification question answers
   */
  const handleClarificationSubmit = async (answers: Record<string, string>) => {
    setIsLoadingTriage(true);
    try {
      const response = await api.submitTriage(currentPatientInput, answers);
      setTriageResponse(response);
      setIsUncertaintyOpen(false);
      setActiveTab('referral');
      showToast(`Clarification processed: Safe routing established at ${response.tier} Tier.`);
    } catch (err) {
      console.error('Clarification failed:', err);
    } finally {
      setIsLoadingTriage(false);
    }
  };

  /**
   * Force escalation to human review
   */
  const handleForceEscalate = async () => {
    setIsLoadingTriage(true);
    try {
      const response = await api.submitTriage(currentPatientInput, undefined, true);
      setTriageResponse(response);
      setIsUncertaintyOpen(false);
      setActiveTab('referral');
      showToast('Uncertainty threshold acknowledged: Case escalated to Clinical Lead.');
    } catch (err) {
      console.error('Escalation failed:', err);
    } finally {
      setIsLoadingTriage(false);
    }
  };

  /**
   * Dispatch referral to recommended facility
   */
  const handleDispatchReferral = async (facility: Facility) => {
    if (!triageResponse) return;
    setIsDispatching(true);
    try {
      const newReferral = await api.dispatchReferral(triageResponse, facility);
      setReferralLogs((prev) => [newReferral, ...prev]);
      setDispatchedFacilityId(facility.id);
      showToast(`Referral #${newReferral.id} transmitted to ${facility.name}. Pre-arrival slot held!`);
    } catch (err) {
      console.error('Dispatch failed:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  /**
   * Confirm bed arrival on dashboard
   */
  const handleConfirmArrival = async (referralId: string, outcomeTier: RiskTier, notes: string) => {
    const updated = await api.confirmReferral(referralId, outcomeTier, notes);
    if (updated) {
      setReferralLogs((prev) =>
        prev.map((item) => (item.id === referralId ? updated : item))
      );
      showToast(`Arrival verified at hospital for referral ${referralId}.`);
    }
  };

  /**
   * Recalibrate rule weights from mismatch log
   */
  const handleRecalibrateRule = async (ruleName: string, delta: number) => {
    setIsRecalibrating(true);
    try {
      await api.recalibrateRuleWeights(ruleName, delta);
    } finally {
      setIsRecalibrating(false);
    }
  };

  return (
    <div className="relative flex flex-col justify-between selection:bg-sand-300 selection:text-sand-900 overflow-x-hidden antialiased min-h-screen">
      
      {/* Ambient Dynamic Fluid Gradient Blobs */}
      <div className="fixed inset-0 pointer-events-none technical-grid z-0"></div>
      
      {/* Orb 1: Warm Champagne Top Center */}
      <div className="ambient-orb-1 fixed top-[-140px] left-1/2 -translate-x-1/2 w-[780px] h-[520px] rounded-full bg-gradient-to-tr from-[#EADDCF]/75 via-[#F6ECE0]/85 to-[#E8D4C2]/60 blur-[120px] pointer-events-none z-0"></div>
      
      {/* Orb 2: Soft Terracotta / Rose Gold Bottom Right */}
      <div className="ambient-orb-2 fixed bottom-[-180px] right-[-100px] w-[680px] h-[580px] rounded-full bg-gradient-to-tl from-[#E2927C]/28 via-[#F2D7C9]/45 to-[#F9EFE7]/30 blur-[130px] pointer-events-none z-0"></div>
      
      {/* Orb 3: Subtle Warm Alabaster Peach Bottom Left */}
      <div className="ambient-orb-3 fixed top-[35%] left-[-180px] w-[540px] h-[540px] rounded-full bg-gradient-to-br from-[#EBDCCF]/40 via-[#F3E7DC]/60 to-transparent blur-[110px] pointer-events-none z-0"></div>

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col pb-16">
        
        {/* Top Specular Capsule Navigation */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAuditDrawer={() => setIsAuditDrawerOpen(true)}
          referralCount={referralLogs.length}
          hasActiveResult={Boolean(triageResponse)}
        />

        {/* Content Views */}
        <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 mt-6 sm:mt-8 flex-1">
          
          {/* View 0: Clean Product Landing Page */}
          {activeTab === 'home' && (
            <LandingPage
              onStartTriage={() => setActiveTab('intake')}
              onExploreDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {/* View 1: Triage Intake */}
          {activeTab === 'intake' && (
            <PatientIntakeForm
              initialData={currentPatientInput}
              onSubmit={handleIntakeSubmit}
              isLoading={isLoadingTriage}
            />
          )}

          {/* View 2: Live Capacity & Location-Aware Routing Mesh */}
          {activeTab === 'referral' && (
            <CapacityRoutingView
              triageResponse={triageResponse}
              onDispatchReferral={handleDispatchReferral}
              onRetest={() => setActiveTab('intake')}
              isDispatching={isDispatching}
              dispatchedFacilityId={dispatchedFacilityId}
              onStartIntake={() => setActiveTab('intake')}
            />
          )}

          {/* View 3: Closed-Loop Accountability Log */}
          {activeTab === 'dashboard' && (
            <AccountabilityDashboard
              referralLogs={referralLogs}
              onConfirmArrival={handleConfirmArrival}
              onRecalibrateRule={handleRecalibrateRule}
              isRecalibrating={isRecalibrating}
            />
          )}

        </main>

        {/* Footer Note */}
        <footer className="max-w-5xl mx-auto w-full px-6 pt-10 text-center text-xs text-sand-500 font-light flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sand-400"></span>
            <span>SetuHealth Decision Architecture · Clinical Lead Safeguard Protocol</span>
          </div>
          <div>Designed with Warm Alabaster Glass &amp; Brushed Champagne Metallurgy</div>
        </footer>

      </div>

      {/* Uncertainty & Clarification Modal */}
      {triageResponse && (
        <UncertaintyModal
          isOpen={isUncertaintyOpen}
          triage={triageResponse}
          onClose={() => setIsUncertaintyOpen(false)}
          onSubmitAnswers={handleClarificationSubmit}
          onForceEscalate={handleForceEscalate}
          isLoading={isLoadingTriage}
        />
      )}

      {/* Discrete Audit Trail Slide-over Drawer (Powered by Raah under the hood) */}
      <RaahAuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
      />

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 neo-glass-card px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up">
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shadow-xs">
            <Check className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-medium text-sand-900">
            {toastMessage}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
