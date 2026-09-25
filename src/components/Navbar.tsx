import React from 'react';
import { 
  ShieldPlus, 
  Home,
  ShieldCheck,
  Terminal
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'home' | 'intake' | 'referral' | 'dashboard';
  setActiveTab: (tab: 'home' | 'intake' | 'referral' | 'dashboard') => void;
  onOpenAuditDrawer: () => void;
  referralCount: number;
  hasActiveResult: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuditDrawer,
  referralCount,
  hasActiveResult,
}) => {
  return (
    <header className="w-full px-4 sm:px-8 pt-5 pb-2 sticky top-0 z-40">
      <nav className="max-w-6xl mx-auto px-6 py-2.5 rounded-full specular-nav flex items-center justify-between gap-4 transition-all duration-300 shadow-sm">
        
        {/* Brand (Clicks to Home) */}
        <div 
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          onClick={() => setActiveTab('home')}
        >
          <div className="w-9 h-9 rounded-full bg-sand-900 flex items-center justify-center text-sand-50 shadow-md relative overflow-hidden transition-transform duration-300 group-hover:scale-105">
            <ShieldPlus className="w-4 h-4 text-sand-200" />
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="font-semibold text-lg tracking-tight text-sand-900">
              Setu<span className="text-sand-600 font-light">Health</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-sand-500 ring-2 ring-sand-300/80"></span>
          </div>
        </div>

        {/* Clean Center Navigation Tabs (Home, Triage, Routing, Accountability) */}
        <div className="flex items-center p-1 glass-nav-track rounded-full shrink-0">
          
          <button
            onClick={() => setActiveTab('home')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'home'
                ? 'glass-glider text-sand-900 shadow-sm'
                : 'text-sand-600 hover:text-sand-900'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab('intake')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              activeTab === 'intake'
                ? 'glass-glider text-sand-900 shadow-sm'
                : 'text-sand-600 hover:text-sand-900'
            }`}
          >
            Triage Intake
          </button>

          <button
            onClick={() => setActiveTab('referral')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'referral'
                ? 'glass-glider text-sand-900 shadow-sm'
                : 'text-sand-600 hover:text-sand-900'
            }`}
          >
            <span>Capacity Routing</span>
            {hasActiveResult && (
              <span className="w-2 h-2 rounded-full bg-terracotta-500 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'glass-glider text-sand-900 shadow-sm'
                : 'text-sand-600 hover:text-sand-900'
            }`}
          >
            <span>Accountability Log</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sand-200 text-sand-800 font-mono font-bold">
              {referralCount}
            </span>
          </button>

        </div>

        {/* Right Section: Discrete Audit Trail Pill */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Internal Audit Trail Pill */}
          <button

            onClick={onOpenAuditDrawer}
            title="Inspect SetuHealth internal audit trail and decision log"
            className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/75 border border-white shadow-xs hover:shadow text-xs font-medium text-sand-800 transition-all active:scale-95 cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-mono text-[11px] text-sand-800 font-semibold">Audit Trail</span>
            <Terminal className="w-3 h-3 text-sand-400" />
          </button>

        </div>


      </nav>
    </header>
  );
};
