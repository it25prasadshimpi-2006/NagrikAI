import React, { useState } from 'react';
import {
  UserCheck,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  MapPin,
  Calendar,
  Layers,
  Copy,
  Check,
  Camera,
  Search,
} from 'lucide-react';
import { Complaint, ComplaintStatus } from '../types';

interface MyComplaintsListProps {
  complaints: Complaint[];
  userEmail: string;
  userId: string;
  onTrackSpecificId: (id: string) => void;
  onOpenSubmitNew: () => void;
}

export const MyComplaintsList: React.FC<MyComplaintsListProps> = ({
  complaints,
  userEmail,
  userId,
  onTrackSpecificId,
  onOpenSubmitNew,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter complaints attached to this citizen's account (either by citizenUserId or citizenEmail)
  const myComplaints = complaints.filter(
    (c) =>
      (c.citizenUserId && c.citizenUserId === userId) ||
      (c.citizenEmail && c.citizenEmail.toLowerCase() === userEmail.toLowerCase())
  );

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(`#${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'Triage':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Under Inspection':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Work Order Issued':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (_) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Authenticated Citizen Dashboard
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
              Firebase Synced
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            My Submitted Grievances
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complaints submitted under <span className="font-semibold text-slate-800">{userEmail}</span>. Live resolution statuses update in real time.
          </p>
        </div>

        <button
          onClick={onOpenSubmitNew}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all shrink-0 cursor-pointer"
        >
          <span>Submit New Complaint</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Complaints List */}
      {myComplaints.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No Complaints Logged Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Any complaints you submit while logged in will automatically appear here with live municipal tracking.
          </p>
          <button
            onClick={onOpenSubmitNew}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <span>Lodge Your First Grievance</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {myComplaints.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                      #{c.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(c.id)}
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded-md transition-colors"
                      title="Copy Complaint ID"
                    >
                      {copiedId === c.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-bold text-slate-800">{c.wardName}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-medium text-slate-600">{c.category}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] text-slate-400">{formatDate(c.timestamp)}</span>
                  </div>

                  <p className="text-sm font-bold text-slate-900 leading-snug">
                    {c.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                    <span className="flex items-center space-x-1">
                      <span className="font-semibold text-slate-700">Severity:</span>
                      <span className="font-bold text-slate-900">Level {c.severity}/5</span>
                    </span>
                    {c.photoUrl && (
                      <span className="inline-flex items-center space-x-1 text-indigo-700 bg-indigo-50 px-2 py-0.2 rounded-md font-semibold text-[11px]">
                        <Camera className="w-3 h-3" />
                        <span>Photo Attached</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-lg border text-xs font-bold ${getStatusBadge(
                      c.status
                    )}`}
                  >
                    {c.status}
                  </span>

                  <button
                    onClick={() => onTrackSpecificId(c.id)}
                    className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    title="View full workflow tracking details"
                  >
                    <Search className="w-3 h-3 text-slate-500" />
                    <span>Track</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
