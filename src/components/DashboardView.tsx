import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Building,
  CheckCircle,
  FileCheck,
  MapPin,
  Flame,
  ArrowUpRight,
  ShieldAlert,
  Info,
  Layers,
  Send,
  Droplets,
  Wrench,
  Zap,
  Trash2,
  Shield,
  HelpCircle,
  Database
} from 'lucide-react';
import { Category, Complaint, ComplaintStatus, Severity, WardMetric } from '../types';
import { WardMap } from './WardMap';
import { ComplaintsTable } from './ComplaintsTable';
import { DispatchModal } from './DispatchModal';
import { getWardRecommendation, getBatchWardRecommendations } from '../services/api';

interface DashboardViewProps {
  wardMetrics: WardMetric[];
  complaints: Complaint[];
  onUpdateComplaintStatus: (id: string, status: ComplaintStatus) => void;
  onUpdateWardRecommendation: (
    wardId: string,
    rec: {
      recommendation: string;
      priorityLevel: 'Critical' | 'High' | 'Medium' | 'Low';
      suggestedActions: string[];
      leadDepartment: string;
    }
  ) => void;
  isFirestoreConnected?: boolean;
  isInitialSyncing?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  wardMetrics,
  complaints,
  onUpdateComplaintStatus,
  onUpdateWardRecommendation,
  isFirestoreConnected,
  isInitialSyncing,
}) => {
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [dispatchWard, setDispatchWard] = useState<WardMetric | null>(null);
  const [isRefreshingAi, setIsRefreshingAi] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hotspots' | 'map' | 'triage'>('hotspots');

  // Summary computations
  const totalComplaints = complaints.length;
  const criticalCount = complaints.filter((c) => c.severity >= 4).length;
  const overallAvgSeverity =
    totalComplaints > 0
      ? complaints.reduce((acc, c) => acc + c.severity, 0) / totalComplaints
      : 0;

  // Category counts
  const categoryCounts: Record<Category, number> = {
    'Water Supply': 0,
    Roads: 0,
    Electricity: 0,
    Sanitation: 0,
    'Public Safety': 0,
    Other: 0,
  };
  complaints.forEach((c) => {
    if (categoryCounts[c.category] !== undefined) {
      categoryCounts[c.category]++;
    }
  });

  // Ranked wards by priorityScore descending
  const sortedWards = [...wardMetrics].sort((a, b) => b.priorityScore - a.priorityScore);

  // Trigger batch AI recommendations with Gemini
  const handleRefreshAllRecommendations = async () => {
    setIsRefreshingAi(true);
    try {
      const results = await getBatchWardRecommendations(wardMetrics);
      results.forEach((res) => {
        onUpdateWardRecommendation(res.wardId, {
          recommendation: res.recommendation,
          priorityLevel: res.priority_level,
          suggestedActions: res.suggested_actions,
          leadDepartment: res.lead_department,
        });
      });
      setToastMessage('AI Policy recommendations updated successfully!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to refresh recommendations:', err);
      setToastMessage('Recommendation update failed. Please retry.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsRefreshingAi(false);
    }
  };

  // Trigger single ward AI recommendation
  const handleRefreshSingleWard = async (ward: WardMetric) => {
    try {
      const result = await getWardRecommendation(ward);
      onUpdateWardRecommendation(ward.id, {
        recommendation: result.recommendation,
        priorityLevel: result.priority_level,
        suggestedActions: result.suggested_actions,
        leadDepartment: result.lead_department,
      });
      setToastMessage(`Updated AI directive for ${ward.name}`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const getCategoryColor = (cat: Category) => {
    switch (cat) {
      case 'Water Supply':
        return 'bg-cyan-500';
      case 'Roads':
        return 'bg-blue-600';
      case 'Electricity':
        return 'bg-amber-500';
      case 'Sanitation':
        return 'bg-emerald-500';
      case 'Public Safety':
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  };

  const getCategoryIcon = (cat: Category) => {
    switch (cat) {
      case 'Water Supply':
        return <Droplets className="w-3.5 h-3.5 text-cyan-600" />;
      case 'Roads':
        return <Wrench className="w-3.5 h-3.5 text-blue-600" />;
      case 'Electricity':
        return <Zap className="w-3.5 h-3.5 text-amber-600" />;
      case 'Sanitation':
        return <Trash2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Public Safety':
        return <Shield className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return {
          label: '#1 CRITICAL HOTSPOT',
          bg: 'bg-red-600 text-white',
          border: 'border-red-600',
        };
      case 1:
        return {
          label: '#2 HIGH PRIORITY',
          bg: 'bg-orange-600 text-white',
          border: 'border-orange-600',
        };
      case 2:
        return {
          label: '#3 ELEVATED DEFICIT',
          bg: 'bg-amber-600 text-white',
          border: 'border-amber-600',
        };
      case 3:
      default:
        return {
          label: '#4 ROUTINE MONITORING',
          bg: 'bg-emerald-600 text-white',
          border: 'border-emerald-600',
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200 border border-slate-700">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Municipal Infrastructure Prioritization Dashboard
            </h1>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Firestore Ingest</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600">
            <span>Live query active on Firestore collection <strong>/complaints</strong></span>
            <span>•</span>
            <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              DB: ai-studio-nagrikai-df451c87-ec07-40a1-8c8a-afe7d4a7180a
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefreshAllRecommendations}
            disabled={isRefreshingAi}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-60 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAi ? 'animate-spin' : ''}`} />
            <span>{isRefreshingAi ? 'Consulting AI Engine...' : 'Regenerate AI Directives'}</span>
          </button>
        </div>
      </div>

      {/* 1. Summary Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Complaints */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Grievances</span>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {totalComplaints}
            </span>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Live in Firestore
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Calculated dynamically from <code className="font-mono text-emerald-700 font-bold">complaints.length</code> query
          </p>
        </div>

        {/* High Severity Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Critical Alerts (Sev 4-5)</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-red-600 font-mono">
              {criticalCount}
            </span>
            <span className="text-xs text-red-500 font-semibold">
              {totalComplaints > 0 ? ((criticalCount / totalComplaints) * 100).toFixed(0) : 0}% of volume
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Direct public safety / health hazards</p>
        </div>

        {/* Avg Severity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Average Severity</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {overallAvgSeverity.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500">/ 5.00</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Extracted via natural language triage model</p>
        </div>

        {/* Top Hotspot Ward */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Top Priority Hotspot</span>
            <Flame className="w-4 h-4 text-red-600" />
          </div>
          <div className="truncate">
            <span className="text-xl font-black text-slate-900 block truncate">
              {sortedWards[0]?.name.split(' - ')[1] || sortedWards[0]?.name}
            </span>
            <span className="text-xs font-mono font-bold text-red-600">
              Score: {sortedWards[0]?.priorityScore.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Highest combined demand &amp; deficit</p>
        </div>
      </div>

      {/* Complaints by Category Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Complaints Breakdown by Infrastructure Category
            </h3>
            <p className="text-xs text-slate-500">
              Live aggregated distribution across water, roads, electricity, sanitation, and safety
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 text-xs font-bold font-mono text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>{totalComplaints} Reports Total (Live Firestore Query)</span>
            </span>
          </div>
        </div>

        {/* Visual Stacked Progress Bar */}
        <div className="h-4 w-full rounded-full bg-slate-100 flex overflow-hidden p-0.5 gap-0.5 mb-4">
          {(Object.entries(categoryCounts) as [Category, number][]).map(([cat, count]) => {
            if (count === 0) return null;
            const pct = (count / totalComplaints) * 100;
            return (
              <div
                key={cat}
                style={{ width: `${pct}%` }}
                className={`h-full rounded-full ${getCategoryColor(cat)} transition-all duration-300`}
                title={`${cat}: ${count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Category Legend & Mini Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(Object.entries(categoryCounts) as [Category, number][]).map(([cat, count]) => {
            const pct = totalComplaints > 0 ? (count / totalComplaints) * 100 : 0;
            return (
              <div
                key={cat}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center space-x-2.5"
              >
                <div className="p-1.5 rounded-lg bg-white shadow-xs">
                  {getCategoryIcon(cat)}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    {count}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {cat} ({pct.toFixed(0)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prioritization Formula Explanation Card */}
      <div className="bg-linear-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-5 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-200 border border-blue-400/30 text-xs font-bold uppercase tracking-wider font-mono">
                Mandated DPI Prioritization Algorithm
              </span>
              <span className="text-xs text-blue-200 hidden sm:inline">
                data.gov.in Demographic Integration
              </span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-bold tracking-tight text-white">
              priority_score = (complaint_count × 0.4) + (avg_severity × 0.4) + (population_weight × 0.2)
            </div>
            <p className="text-xs text-blue-200/90 leading-relaxed max-w-3xl">
              Equitably balances citizen demand volume (40%), acute hazard severity (40%), and structural infrastructure deficit (20%) calibrated against public census metrics.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-2 bg-white/10 backdrop-blur-xs px-3.5 py-2.5 rounded-xl border border-white/15 text-xs">
            <Info className="w-4 h-4 text-blue-300" />
            <div>
              <span className="font-bold block">Objective Resource Allocation</span>
              <span className="text-blue-200 text-[11px]">Prevents squeaky-wheel bias</span>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Tabs: Ranked Hotspots vs Spatial Map vs Triage Feed */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-1">
          <button
            onClick={() => setActiveTab('hotspots')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'hotspots'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Top Priority Hotspots &amp; AI Directives ({sortedWards.length})
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'map'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Civic GIS Spatial Map
          </button>
          <button
            onClick={() => setActiveTab('triage')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'triage'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Grievances Ledger &amp; Triage ({complaints.length})
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing real-time municipal priority rankings
        </div>
      </div>

      {/* TAB 1: Ranked Hotspots Cards */}
      {activeTab === 'hotspots' && (
        <div className="space-y-5">
          {sortedWards.map((ward, index) => {
            const rankBadge = getRankBadge(index);
            const isHighest = index === 0;

            return (
              <div
                key={ward.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
                  isHighest
                    ? 'border-red-300 ring-2 ring-red-500/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Ward Card Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/60">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Ward Identity */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${rankBadge.bg}`}
                        >
                          {rankBadge.label}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {ward.zone}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">
                          Pop: {ward.population.toLocaleString()} (Deficit Weight: {ward.populationWeight})
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                        {ward.name}
                      </h2>
                    </div>

                    {/* Priority Score Breakdown Badge */}
                    <div className="flex items-center space-x-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs self-start lg:self-center">
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Priority Score
                        </span>
                        <span className="text-2xl font-black text-blue-700 font-mono">
                          {ward.priorityScore.toFixed(2)}
                        </span>
                      </div>

                      <div className="h-8 w-px bg-slate-200" />

                      <div className="text-xs text-slate-600 font-mono leading-tight">
                        <div className="text-[11px] text-slate-400">Formula Decomposition:</div>
                        <div>
                          ({ward.complaintCount} × 0.4) + ({ward.avgSeverity.toFixed(1)} × 0.4) + ({ward.populationWeight} × 0.2)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ward Content Body */}
                <div className="p-5 sm:p-6 space-y-5">
                  {/* Metric Chips & Category Distribution */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Complaints count */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">
                        Active Complaints
                      </span>
                      <div className="flex items-baseline space-x-2 mt-1">
                        <span className="text-xl font-bold text-slate-900 font-mono">
                          {ward.complaintCount}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({((ward.complaintCount / totalComplaints) * 100).toFixed(0)}% of city total)
                        </span>
                      </div>
                    </div>

                    {/* Avg Severity */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">
                        Average Severity
                      </span>
                      <div className="flex items-baseline space-x-2 mt-1">
                        <span className="text-xl font-bold text-slate-900 font-mono">
                          {ward.avgSeverity.toFixed(1)} / 5.0
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-xs ${
                            ward.avgSeverity >= 4
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {ward.avgSeverity >= 4 ? 'High Urgency' : 'Moderate'}
                        </span>
                      </div>
                    </div>

                    {/* Dominant Category */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">
                        Category Spread
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {Object.entries(ward.categoryBreakdown).map(([cat, cnt]) => {
                          if (cnt === 0) return null;
                          return (
                            <span
                              key={cat}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white border border-slate-200 text-slate-700"
                            >
                              {getCategoryIcon(cat as Category)}
                              <span>
                                {cat}: <b>{cnt}</b>
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendation Card (Gemini 3.8 Flash) */}
                  <div className="bg-linear-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 rounded-xl p-4 sm:p-5 border border-blue-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                          AI Policymaker Recommendation
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                        Lead Dept: {ward.aiRecommendation?.leadDepartment || 'Civic Infrastructure Wing'}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-800 leading-relaxed font-sans">
                      "{ward.aiRecommendation?.recommendation ||
                        `${ward.name} demands immediate municipal prioritization due to persistent infrastructure breakdowns with high severity. Rapid field mobilization and targeted resource dispatch are recommended.`}"
                    </p>

                    {/* Suggested Action Directives */}
                    {ward.aiRecommendation?.suggestedActions && (
                      <div className="mt-3 pt-3 border-t border-blue-200/60">
                        <span className="text-[11px] font-bold text-slate-600 block mb-1.5 uppercase tracking-wider">
                          Suggested Action Directives:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {ward.aiRecommendation.suggestedActions.map((action, idx) => (
                            <div
                              key={idx}
                              className="flex items-center space-x-1.5 p-2 rounded-lg bg-white/90 border border-blue-100 text-xs text-slate-700 font-medium"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate">{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-500">
                      Sample incidents: {ward.latestComplaints.map((c) => c.summary).slice(0, 2).join(' • ')}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRefreshSingleWard(ward)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                        title="Re-run AI analysis for this ward"
                      >
                        Re-analyze
                      </button>
                      <button
                        onClick={() => {
                          setSelectedWardId(ward.id);
                          setActiveTab('triage');
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200"
                      >
                        View {ward.complaintCount} Complaints
                      </button>
                      <button
                        onClick={() => setDispatchWard(ward)}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm shadow-blue-600/20"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Issue Dispatch Notice</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Civic GIS Spatial Map */}
      {activeTab === 'map' && (
        <WardMap
          wards={wardMetrics}
          selectedWardId={selectedWardId}
          onSelectWard={(id) => setSelectedWardId(id)}
          complaints={complaints}
          onSelectComplaint={(c) => {
            setSelectedWardId(c.wardId);
            setActiveTab('triage');
          }}
        />
      )}

      {/* TAB 3: Grievance Ledger & Triage Feed */}
      {activeTab === 'triage' && (
        <ComplaintsTable
          complaints={complaints}
          onUpdateStatus={onUpdateComplaintStatus}
          selectedWardFilter={selectedWardId}
          onClearWardFilter={() => setSelectedWardId(null)}
        />
      )}

      {/* Dispatch Work Order Modal */}
      {dispatchWard && (
        <DispatchModal
          ward={dispatchWard}
          onClose={() => setDispatchWard(null)}
          onDispatchSuccess={(wardName, action) => {
            setToastMessage(`Dispatched work order for ${wardName}: ${action}`);
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
};
