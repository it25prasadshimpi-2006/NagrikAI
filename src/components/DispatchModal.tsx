import React, { useState } from 'react';
import {
  X,
  FileCheck,
  Building,
  Calendar,
  AlertOctagon,
  Clock,
  Printer,
  CheckCircle,
  ShieldCheck,
  SendHorizontal
} from 'lucide-react';
import { WardMetric } from '../types';

interface DispatchModalProps {
  ward: WardMetric | null;
  onClose: () => void;
  onDispatchSuccess: (wardName: string, actionTitle: string) => void;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  ward,
  onClose,
  onDispatchSuccess,
}) => {
  const [officerName, setOfficerName] = useState('Dr. S. K. Ramanathan, IAS');
  const [priorityTier, setPriorityTier] = useState('Immediate Emergency (24h SLA)');
  const [budgetSource, setBudgetSource] = useState('Municipal Disaster & Contingency Reserve (DPI Fund)');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!ward) return null;

  const topCategory = Object.entries(ward.categoryBreakdown).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || 'Infrastructure';

  const defaultAction =
    ward.aiRecommendation?.suggestedActions?.[0] ||
    `Deploy emergency response and repair taskforce to ${ward.name}`;

  const handleAuthorize = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      setIsAuthorizing(false);
      setIsSuccess(true);
      setTimeout(() => {
        onDispatchSuccess(ward.name, defaultAction);
        onClose();
      }, 1200);
    }, 800);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                MUNICIPAL RAPID INTERVENTION WORK ORDER
              </h3>
              <p className="text-[11px] text-slate-400">
                Authorized via Nagrik AI DPI Algorithmic Prioritization Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-slate-900">Work Order Dispatched!</h4>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              Notice #{ward.id.toUpperCase()}-WO-{Math.floor(1000 + Math.random() * 9000)} has been routed to the{' '}
              <span className="font-semibold text-slate-800">
                {ward.aiRecommendation?.leadDepartment || 'Municipal Operations Department'}
              </span>
              . Field teams notified via SMS / Government Gateway.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Hotspot Summary Bar */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                  Target Priority Zone
                </span>
                <span className="text-lg font-extrabold text-slate-900">
                  {ward.name}
                </span>
                <span className="text-xs text-slate-500 block">
                  {ward.zone} • Population: {ward.population.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                  Algorithmic Score
                </span>
                <span className="text-2xl font-black text-blue-700 font-mono">
                  {ward.priorityScore.toFixed(2)}
                </span>
                <span className="text-[11px] font-bold text-red-600 block">
                  {ward.complaintCount} Complaints • Avg Sev {ward.avgSeverity.toFixed(1)}/5
                </span>
              </div>
            </div>

            {/* AI Recommendation in Order */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase text-slate-700 mb-1.5">
                <AlertOctagon className="w-4 h-4 text-amber-600" />
                <span>AI Advisory Justification</span>
              </div>
              <p className="text-xs font-medium text-slate-800 leading-relaxed italic">
                "{ward.aiRecommendation?.recommendation ||
                  `${ward.name} requires prompt intervention due to aggregated civic failures across ${topCategory}.`}"
              </p>
            </div>

            {/* Suggested Actions Checklist */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Mandated Action Directives
              </span>
              <div className="space-y-2">
                {(ward.aiRecommendation?.suggestedActions || [
                  `Deploy rapid emergency response team from ${topCategory} wing`,
                  `Set up temporary citizen redressal kiosk in ${ward.name}`,
                  `Execute priority work order under municipal contingency funds`,
                ]).map((action, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2.5 p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800"
                  >
                    <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span className="font-medium">{action}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Responsible Municipal Department
                </label>
                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 font-semibold text-slate-800">
                  {ward.aiRecommendation?.leadDepartment || 'Public Health & Civic Works'}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Dispatch Priority SLA
                </label>
                <select
                  value={priorityTier}
                  onChange={(e) => setPriorityTier(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Immediate Emergency (24h SLA)">Immediate Emergency (24h SLA)</option>
                  <option value="High Priority (48h SLA)">High Priority (48h SLA)</option>
                  <option value="Standard Ward Plan (7 Days)">Standard Ward Plan (7 Days)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Authorizing Municipal Commissioner
                </label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Budget Code Allocation
                </label>
                <input
                  type="text"
                  value={budgetSource}
                  onChange={(e) => setBudgetSource(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Order</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAuthorize}
                  disabled={isAuthorizing}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/25 transition-all disabled:opacity-60"
                >
                  {isAuthorizing ? (
                    <span>Authorizing &amp; Transmitting...</span>
                  ) : (
                    <>
                      <SendHorizontal className="w-4 h-4" />
                      <span>Issue Municipal Work Order</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
