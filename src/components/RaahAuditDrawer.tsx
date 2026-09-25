import React, { useState, useEffect } from 'react';
import { 
  X, 
  ClipboardList, 
  Terminal, 
  CheckCircle2, 
  Download, 
  ChevronDown, 
  ChevronRight,
  Layers
} from 'lucide-react';

import { auditClient } from '../services/raahClient';
import { AuditEvent } from '../types/triage';

interface RaahAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RaahAuditDrawer: React.FC<RaahAuditDrawerProps> = ({ isOpen, onClose }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auditClient.subscribe((latestEvents) => {
      setEvents(latestEvents);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const status = auditClient.getStatus();

  const handleCopyTraceId = (traceId: string, id: string) => {
    navigator.clipboard.writeText(traceId);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `setuhealth_audit_trail_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#2C2825]/40 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-[#FAF7F2] border-l border-sand-300 shadow-2xl flex flex-col animate-slide-up text-sand-900">
          
          {/* Drawer Header (SetuHealth Internal Audit Trail) */}
          <div className="p-5 border-b border-sand-300/70 bg-white/70 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-sand-200 border border-sand-300 flex items-center justify-center text-sand-800 shadow-sm">
                <ClipboardList className="w-5 h-5 text-sand-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-sand-900 tracking-tight">
                    SetuHealth Internal Audit Trail
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sand-200 border border-sand-300 text-sand-800 font-semibold">
                    LOCAL LEDGER
                  </span>
                </div>
                <p className="text-xs text-sand-600 font-light">
                  Application event log for triage, routing, and outcome tracking
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-sand-200 text-sand-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status Sub-bar */}
          <div className="px-5 py-2.5 bg-sand-100/80 border-b border-sand-200 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-sand-600">
              <Layers className="w-3.5 h-3.5 text-sand-500" />
              <span>Scope: <span className="text-sand-900 font-semibold">SetuHealth Core Runtime</span></span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-sand-600">
              <span>Avg Latency: <strong className="text-emerald-700">{status.averageLatencyMs}ms</strong></span>
              <span>Events: <strong className="text-sand-900">{events.length}</strong></span>
            </div>
          </div>

          {/* Event Stream List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">

            <div className="flex items-center justify-between text-xs text-sand-600">
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">
                Application Event Stream ({events.length})
              </span>
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1 text-[11px] text-terracotta-600 hover:text-terracotta-700 font-medium cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Export JSON</span>
              </button>
            </div>

            {events.map((evt) => {
              const isExpanded = expandedEventId === evt.eventId;

              return (
                <div
                  key={evt.eventId}
                  className="rounded-2xl bg-white/80 border border-sand-300/80 p-3.5 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sand-200 text-sand-800">
                      {evt.eventType}
                    </span>
                    <span className="text-[11px] font-mono text-sand-500">
                      {evt.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-sand-800 font-medium leading-snug">
                    {evt.payloadSummary}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-sand-500 font-mono pt-1 border-t border-sand-200">
                    <div>
                      <span>Subject: </span>
                      <span className="text-sand-800 font-semibold">{evt.patientHash}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sand-700 font-semibold flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-sand-100 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{evt.status}</span>
                      </span>
                      <button
                        onClick={() => setExpandedEventId(isExpanded ? null : evt.eventId)}
                        className="text-sand-500 hover:text-sand-800 p-0.5 cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-sand-200 space-y-2 text-[10px] font-mono animate-fade-in">
                      <div className="p-2.5 rounded-xl bg-sand-100 border border-sand-300 space-y-1">
                        <div className="flex items-center justify-between text-sand-600">
                          <span>Internal Trace ID:</span>
                          <button
                            onClick={() => handleCopyTraceId(evt.internalTraceId, evt.eventId)}
                            className="text-terracotta-600 hover:underline font-semibold"
                          >
                            {copiedId === evt.eventId ? 'Copied!' : 'Copy Trace ID'}
                          </button>
                        </div>
                        <div className="text-sand-800 break-all select-all font-mono">
                          {evt.internalTraceId}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-sand-100 border border-sand-300 overflow-x-auto text-sand-700">
                        <span className="text-sand-500 block mb-1">Payload Envelope:</span>
                        <pre className="text-[10px] text-sand-800">
                          {JSON.stringify(evt.metadata || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-sand-300 bg-white/80 flex items-center justify-between text-xs text-sand-600">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Internal event logger active</span>
            </span>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-full bg-sand-900 text-white text-xs font-medium hover:bg-sand-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
