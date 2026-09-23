import React, { useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  Globe2,
  Calendar,
  Layers,
  ChevronRight,
  Eye,
  RotateCw,
  Sparkles,
  Droplets,
  Wrench,
  Zap,
  Trash2,
  Shield,
  HelpCircle,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { Category, Complaint, ComplaintStatus, Severity } from '../types';

interface ComplaintsTableProps {
  complaints: Complaint[];
  onUpdateStatus: (id: string, newStatus: ComplaintStatus) => void;
  selectedWardFilter?: string | null;
  onClearWardFilter?: () => void;
}

export const ComplaintsTable: React.FC<ComplaintsTableProps> = ({
  complaints,
  onUpdateStatus,
  selectedWardFilter,
  onClearWardFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedComplaintId, setExpandedComplaintId] = useState<string | null>(null);

  const filteredComplaints = complaints.filter((c) => {
    // Ward filter
    if (selectedWardFilter && c.wardId !== selectedWardFilter) return false;

    // Category filter
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;

    // Severity filter
    if (severityFilter !== 'all' && c.severity.toString() !== severityFilter) return false;

    // Status filter
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;

    // Search query
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchSummary = c.summary.toLowerCase().includes(term);
      const matchDesc = c.description.toLowerCase().includes(term);
      const matchWard = c.wardName.toLowerCase().includes(term);
      const matchId = c.id.toLowerCase().includes(term);
      const matchCategory = c.category.toLowerCase().includes(term);
      const matchReporter = c.name?.toLowerCase().includes(term);

      if (!matchSummary && !matchDesc && !matchWard && !matchId && !matchCategory && !matchReporter) {
        return false;
      }
    }

    return true;
  });

  const getCategoryIcon = (category: Category) => {
    switch (category) {
      case 'Water Supply':
        return <Droplets className="w-3.5 h-3.5 text-cyan-600" />;
      case 'Roads':
        return <Wrench className="w-3.5 h-3.5 text-blue-600" />;
      case 'Electricity':
        return <Zap className="w-3.5 h-3.5 text-amber-600" />;
      case 'Sanitation':
        return <Trash2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Public Safety':
        return <Shield className="w-3.5 h-3.5 text-red-600" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getSeverityPill = (sev: Severity) => {
    switch (sev) {
      case 5:
        return 'bg-red-500 text-white';
      case 4:
        return 'bg-orange-500 text-white';
      case 3:
        return 'bg-amber-500 text-white';
      case 2:
        return 'bg-blue-500 text-white';
      case 1:
      default:
        return 'bg-emerald-500 text-white';
    }
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Work Order Issued':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Under Inspection':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Triage':
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (_) {
      return iso;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Citizen Grievance Feed &amp; Triage Registry</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Unified cross-channel complaint ledger with real-time AI classification &amp; translations
            </p>
          </div>

          {selectedWardFilter && (
            <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">
              <span>Filtered by Ward: {selectedWardFilter}</span>
              {onClearWardFilter && (
                <button
                  onClick={onClearWardFilter}
                  className="ml-1 text-blue-600 hover:text-blue-900 font-bold"
                >
                  × Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          {/* Search box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by keywords, ID, locality, or citizen..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="Roads">Roads</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Electricity">Electricity</option>
              <option value="Sanitation">Sanitation</option>
              <option value="Public Safety">Public Safety</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severities (1 - 5)</option>
              <option value="5">Level 5 (Critical)</option>
              <option value="4">Level 4 (High)</option>
              <option value="3">Level 3 (Moderate)</option>
              <option value="2">Level 2 (Low)</option>
              <option value="1">Level 1 (Routine)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Triage Statuses</option>
              <option value="Triage">Triage</option>
              <option value="Under Inspection">Under Inspection</option>
              <option value="Work Order Issued">Work Order Issued</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints List / Table */}
      {filteredComplaints.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <p className="text-sm font-semibold">
            {complaints.length === 0
              ? 'No grievances recorded in Firestore database.'
              : 'No complaints matching current filters.'}
          </p>
          <p className="text-xs mt-1">
            {complaints.length === 0
              ? 'Real documents submitted by citizens in the Citizen Portal will appear here live in real-time.'
              : 'Try resetting the category or search terms.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filteredComplaints.map((c) => {
            const isExpanded = expandedComplaintId === c.id;

            return (
              <div
                key={c.id}
                className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors duration-150"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Left: ID, Ward, Category, Summary */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200">
                        #{c.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {c.wardName}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center space-x-1 text-xs font-medium text-slate-600">
                        {getCategoryIcon(c.category)}
                        <span>{c.category}</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getSeverityPill(
                          c.severity
                        )}`}
                      >
                        Sev {c.severity}/5
                      </span>
                      {c.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setExpandedComplaintId(isExpanded ? null : c.id)}
                          className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                          title="Click to view attached citizen photo & AI photo analysis"
                        >
                          <Camera className="w-3 h-3 text-indigo-600" />
                          <span>Photo</span>
                        </button>
                      )}
                      <span className="text-slate-300 hidden sm:inline">•</span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        {formatTimestamp(c.timestamp)}
                      </span>
                    </div>

                    {/* AI English Summary */}
                    <p className="text-sm font-bold text-slate-900 leading-snug">
                      {c.summary}
                    </p>

                    {/* Sentiment & Reporter Tag */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>Reporter: {c.name || 'Anonymous Citizen'}</span>
                      {c.detectedLanguage && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center space-x-1 text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-xs text-[11px] font-medium">
                            <Globe2 className="w-3 h-3" />
                            <span>{c.detectedLanguage}</span>
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-xs font-medium">
                        Sentiment: {c.sentiment}
                      </span>
                    </div>
                  </div>

                  {/* Right: Status Pill & Action */}
                  <div className="flex items-center space-x-3 shrink-0 self-start md:self-center">
                    {/* Status Dropdown */}
                    <select
                      value={c.status}
                      onChange={(e) =>
                        onUpdateStatus(c.id, e.target.value as ComplaintStatus)
                      }
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border focus:outline-none cursor-pointer ${getStatusBadge(
                        c.status
                      )}`}
                    >
                      <option value="Triage">Triage</option>
                      <option value="Under Inspection">Under Inspection</option>
                      <option value="Work Order Issued">Work Order Issued</option>
                      <option value="Resolved">Resolved</option>
                    </select>

                    {/* Expand Details Button */}
                    <button
                      onClick={() =>
                        setExpandedComplaintId(isExpanded ? null : c.id)
                      }
                      className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
                      title="View original grievance text & translation"
                    >
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50/70 p-4 rounded-xl animate-in fade-in duration-200">
                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Original Citizen Submission ({c.detectedLanguage || 'Verbatim'})
                      </span>
                      <p className="text-slate-800 italic bg-white p-3 rounded-lg border border-slate-200 leading-relaxed font-sans">
                        "{c.description}"
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        AI English Translation &amp; Context
                      </span>
                      <p className="text-slate-800 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                        {c.translatedText || c.description}
                      </p>
                    </div>

                    {/* Attached Photo & AI Photo Analysis (if present) */}
                    {(c.photoUrl || c.imageAnalysisNote) && (
                      <div className="md:col-span-2 bg-white p-3.5 rounded-xl border border-indigo-200 shadow-xs flex flex-col sm:flex-row items-start gap-3.5">
                        {c.photoUrl && (
                          <div className="shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Citizen Attached Photo
                            </span>
                            <img
                              src={c.photoUrl}
                              alt="Citizen grievance proof"
                              className="w-36 h-28 object-cover rounded-lg border border-slate-200 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(c.photoUrl, '_blank')}
                              title="Click to view full photo"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center space-x-1.5">
                            <Camera className="w-3.5 h-3.5 text-indigo-600" />
                            <span>📷 AI Photo Verification &amp; Severity Note</span>
                          </span>
                          <p className="text-xs text-indigo-950 mt-1 leading-relaxed bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100 font-medium">
                            {c.imageAnalysisNote || 'Image attached by citizen and logged in civic dispatch ledger.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {c.rationale && (
                      <div className="md:col-span-2 bg-blue-50/80 p-3 rounded-lg border border-blue-100 text-blue-900 flex items-start space-x-2">
                        <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Severity Assessment Rationale: </span>
                          <span>{c.rationale}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Count */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-right text-xs text-slate-500 font-medium">
        Showing {filteredComplaints.length} of {complaints.length} Total Citizen Reports
      </div>
    </div>
  );
};
