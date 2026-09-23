import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  MapPin,
  Calendar,
  Sparkles,
  Camera,
  Copy,
  Check,
  HelpCircle,
} from 'lucide-react';
import { Complaint, ComplaintStatus } from '../types';

interface TrackComplaintLookupProps {
  complaints: Complaint[];
  initialSearchId?: string;
  onClearInitialId?: () => void;
}

export const TrackComplaintLookup: React.FC<TrackComplaintLookupProps> = ({
  complaints,
  initialSearchId = '',
  onClearInitialId,
}) => {
  const [searchInput, setSearchInput] = useState(initialSearchId);
  const [searchedId, setSearchedId] = useState(initialSearchId.trim());
  const [copied, setCopied] = useState(false);

  const normalizedQuery = searchedId.toUpperCase().replace(/^#/, '').trim();
  const matchedComplaint = complaints.find(
    (c) => c.id.toUpperCase() === normalizedQuery || c.id.toUpperCase() === `NGK-${normalizedQuery}`
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onClearInitialId) onClearInitialId();
    setSearchedId(searchInput.trim());
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(`#${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'Triage':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Triage Stage (AI Ingestion & Dispatch Routing)',
          description: 'Classified by automated AI triage and queued for municipal field inspection.',
        };
      case 'Under Inspection':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-600',
          label: 'Under Inspection (Field Engineer Assigned)',
          description: 'A municipal engineer or sanitation officer has been dispatched to survey the issue.',
        };
      case 'Work Order Issued':
        return {
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          dot: 'bg-purple-600',
          label: 'Work Order Issued (Contractor Active)',
          description: 'Municipal tender allocated; repair machinery and materials are on-site.',
        };
      case 'Resolved':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-600',
          label: 'Resolved (Civic Restoration Complete)',
          description: 'Infrastructure issue resolved and validated by ward inspector.',
        };
    }
  };

  const getSeverityBadge = (sev: number) => {
    if (sev >= 5) return { bg: 'bg-red-500 text-white', label: 'Level 5/5 (Critical Emergency)' };
    if (sev === 4) return { bg: 'bg-orange-500 text-white', label: 'Level 4/5 (High Urgency)' };
    if (sev === 3) return { bg: 'bg-amber-500 text-white', label: 'Level 3/5 (Moderate Deficit)' };
    return { bg: 'bg-blue-500 text-white', label: `Level ${sev}/5 (Standard Triage)` };
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Search Bar Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
        <div className="mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
            Public Civic Ledger Lookup
          </span>
          <h2 className="text-xl font-bold text-slate-900">
            Track Grievance Status
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enter your complaint reference ID (e.g. <span className="font-mono font-semibold text-slate-700">NGK-701</span>, <span className="font-mono font-semibold text-slate-700">NGK-703</span>, or the ID shown upon submission) to check municipal resolution progress.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. NGK-701 or #NGK-703"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Track Status</span>
          </button>
        </form>

        {/* Quick Sample IDs for demo testers */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
          <span className="font-medium text-slate-500">Try Sample IDs:</span>
          {['NGK-701', 'NGK-702', 'NGK-703', 'NGK-704'].map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSearchInput(id);
                setSearchedId(id);
              }}
              className="font-mono text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 transition-colors"
            >
              #{id}
            </button>
          ))}
        </div>
      </div>

      {/* Result Display */}
      {searchedId && (
        <>
          {matchedComplaint ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
              {/* Header Banner */}
              <div className="bg-slate-50/90 border-b border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-base font-extrabold text-blue-700 bg-white px-3 py-1 rounded-lg border border-blue-200 shadow-xs">
                      #{matchedComplaint.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(matchedComplaint.id)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      title="Copy Complaint ID"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy ID</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Submitted on: {formatDate(matchedComplaint.timestamp)}</span>
                    <span className="text-slate-300">•</span>
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{matchedComplaint.wardName}</span>
                  </p>
                </div>

                {/* Status Badge */}
                <div>
                  {(() => {
                    const statusConfig = getStatusBadge(matchedComplaint.status);
                    return (
                      <div className={`px-3.5 py-2 rounded-xl border text-xs font-bold ${statusConfig.bg}`}>
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${statusConfig.dot} animate-pulse`} />
                          <span>{statusConfig.label}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Progress Milestones */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
                  Resolution Progress Workflow
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Triage', 'Under Inspection', 'Work Order Issued', 'Resolved'] as ComplaintStatus[]).map(
                    (step, idx) => {
                      const stages: ComplaintStatus[] = [
                        'Triage',
                        'Under Inspection',
                        'Work Order Issued',
                        'Resolved',
                      ];
                      const currentIdx = stages.indexOf(matchedComplaint.status);
                      const isComplete = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div
                          key={step}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            isCurrent
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : isComplete
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                              : 'bg-white text-slate-400 border-slate-200'
                          }`}
                        >
                          <div className="text-[10px] uppercase font-bold tracking-wider mb-0.5">
                            Stage 0{idx + 1}
                          </div>
                          <div className="text-xs font-semibold truncate">{step}</div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Details Body */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">
                      Infrastructure Category
                    </span>
                    <span className="text-sm font-bold text-slate-800 mt-1 block">
                      {matchedComplaint.category}
                    </span>
                  </div>

                  {/* Severity */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">
                      AI Assessed Severity
                    </span>
                    <div className="mt-1">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          getSeverityBadge(matchedComplaint.severity).bg
                        }`}
                      >
                        {getSeverityBadge(matchedComplaint.severity).label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description Summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">
                    Grievance Summary
                  </span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    "{matchedComplaint.summary}"
                  </p>
                </div>

                {/* Attached Photo & Note */}
                {(matchedComplaint.photoUrl || matchedComplaint.imageAnalysisNote) && (
                  <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
                    <div className="flex flex-col sm:flex-row items-start gap-3.5">
                      {matchedComplaint.photoUrl && (
                        <img
                          src={matchedComplaint.photoUrl}
                          alt="Grievance evidence"
                          className="w-24 h-24 object-cover rounded-lg border border-indigo-200 shadow-xs shrink-0"
                        />
                      )}
                      <div>
                        <span className="text-[11px] font-bold uppercase text-indigo-900 flex items-center space-x-1">
                          <Camera className="w-3.5 h-3.5 text-indigo-600" />
                          <span>AI Visual Inspection Record</span>
                        </span>
                        <p className="text-xs text-indigo-950 mt-1 font-medium leading-relaxed">
                          {matchedComplaint.imageAnalysisNote || 'Citizen photo attached and archived with dispatch records.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Read-Only Notice */}
                <div className="pt-2 text-xs text-slate-400 flex items-center space-x-1.5 border-t border-slate-100">
                  <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>
                    Read-only citizen tracking record. Live updates are synced directly from municipal engineering dispatches.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Not Found State */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Complaint Reference #{searchedId} Not Found
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Please double-check your complaint ID. Standard IDs begin with <span className="font-mono font-semibold">NGK-</span> (e.g. NGK-701).
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
