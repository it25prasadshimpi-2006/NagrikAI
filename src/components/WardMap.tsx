import React, { useState } from 'react';
import {
  MapPin,
  Maximize2,
  Layers,
  Flame,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Activity,
  Droplets,
  Zap,
  Trash2,
  Shield,
  Wrench
} from 'lucide-react';
import { Category, Complaint, WardMetric } from '../types';

interface WardMapProps {
  wards: WardMetric[];
  selectedWardId: string | null;
  onSelectWard: (wardId: string) => void;
  complaints: Complaint[];
  onSelectComplaint?: (complaint: Complaint) => void;
}

export const WardMap: React.FC<WardMapProps> = ({
  wards,
  selectedWardId,
  onSelectWard,
  complaints,
  onSelectComplaint,
}) => {
  const [hoveredWard, setHoveredWard] = useState<string | null>(null);
  const [hoveredComplaint, setHoveredComplaint] = useState<Complaint | null>(null);
  const [mapMode, setMapMode] = useState<'svg-gis' | 'grid'>('svg-gis');

  const getPriorityColor = (score: number) => {
    if (score >= 5.5) {
      return {
        fill: '#fee2e2',
        border: '#ef4444',
        text: 'text-red-700',
        badge: 'bg-red-500 text-white',
        status: 'Critical Hotspot',
      };
    }
    if (score >= 3.5) {
      return {
        fill: '#fef3c7',
        border: '#f59e0b',
        text: 'text-amber-800',
        badge: 'bg-amber-500 text-white',
        status: 'Medium Priority',
      };
    }
    return {
      fill: '#d1fae5',
      border: '#10b981',
      text: 'text-emerald-800',
      badge: 'bg-emerald-500 text-white',
      status: 'Routine Service',
    };
  };

  // SVG coordinates for our 4 wards in a 800x480 canvas
  const WARD_POLYGONS: Record<string, { path: string; labelX: number; labelY: number }> = {
    'ward-7': {
      // Central Ward (Shivaji Nagar) - Core hub
      path: 'M 320,160 L 510,130 L 540,290 L 410,340 L 300,280 Z',
      labelX: 410,
      labelY: 220,
    },
    'ward-12': {
      // East Ward (Indiranagar) - Right side
      path: 'M 510,130 L 760,110 L 770,300 L 540,290 Z',
      labelX: 630,
      labelY: 200,
    },
    'ward-19': {
      // North Ward (Nehru Colony) - Top & river bank
      path: 'M 140,50 L 480,40 L 510,130 L 320,160 L 190,140 Z',
      labelX: 300,
      labelY: 100,
    },
    'ward-4': {
      // West Ward (Gandhi Park) - Left side
      path: 'M 80,180 L 300,280 L 410,340 L 380,440 L 110,430 L 70,300 Z',
      labelX: 210,
      labelY: 340,
    },
  };

  // Coordinates mapping from lat/lng to SVG space (800x480)
  // Lat range: 18.50 to 18.55; Lng range: 73.80 to 73.87
  const projectToSvg = (lat: number, lng: number) => {
    const minLat = 18.502;
    const maxLat = 18.552;
    const minLng = 73.805;
    const maxLng = 73.868;

    const x = ((lng - minLng) / (maxLng - minLng)) * 680 + 60;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 380 + 50;

    return { x: Math.max(70, Math.min(740, x)), y: Math.max(50, Math.min(430, y)) };
  };

  const getCategoryIcon = (cat: Category) => {
    switch (cat) {
      case 'Water Supply':
        return <Droplets className="w-2.5 h-2.5" />;
      case 'Roads':
        return <Wrench className="w-2.5 h-2.5" />;
      case 'Electricity':
        return <Zap className="w-2.5 h-2.5" />;
      case 'Sanitation':
        return <Trash2 className="w-2.5 h-2.5" />;
      case 'Public Safety':
        return <Shield className="w-2.5 h-2.5" />;
      default:
        return <HelpCircle className="w-2.5 h-2.5" />;
    }
  };

  const highestPriorityWard = [...wards].sort((a, b) => b.priorityScore - a.priorityScore)[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Map Control Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Municipal Ward GIS Prioritization Map</span>
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
              Live Spatial Clusters
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Color-coded by computed priority score • Hover/click wards or pins for incident telemetry
          </p>
        </div>

        {/* Legend & Toggle */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-500 shadow-xs" />
              <span className="font-medium text-slate-700">Critical (&gt;5.5)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500 shadow-xs" />
              <span className="font-medium text-slate-700">High (3.5–5.5)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 shadow-xs" />
              <span className="font-medium text-slate-700">Routine (&lt;3.5)</span>
            </div>
          </div>

          <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setMapMode('svg-gis')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                mapMode === 'svg-gis' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Spatial Map
            </button>
            <button
              onClick={() => setMapMode('grid')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                mapMode === 'grid' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Ward Cards Grid
            </button>
          </div>
        </div>
      </div>

      {mapMode === 'svg-gis' ? (
        <div className="relative w-full overflow-hidden bg-slate-900/5">
          {/* SVG Map Canvas */}
          <div className="w-full aspect-[16/9] max-h-[460px] relative">
            <svg
              viewBox="0 0 800 480"
              className="w-full h-full select-none"
              style={{ background: '#f8fafc' }}
            >
              {/* Defs for gradients & patterns */}
              <defs>
                <filter id="shadow" x="-5%" y="-5%" width="115%" height="115%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                </filter>
                <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
              </defs>

              {/* Grid Background */}
              <rect width="800" height="480" fill="url(#gridPattern)" />

              {/* Simulated River / Natural Drainage Channel */}
              <path
                d="M 40,240 Q 220,180 400,260 T 780,220"
                fill="none"
                stroke="#bfdbfe"
                strokeWidth="18"
                strokeLinecap="round"
                opacity="0.7"
              />
              <path
                d="M 40,240 Q 220,180 400,260 T 780,220"
                fill="none"
                stroke="#60a5fa"
                strokeWidth="4"
                strokeDasharray="6 6"
                opacity="0.8"
              />

              {/* Transit Arterial Highways */}
              <path
                d="M 120,440 L 410,220 L 760,110"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="6"
                opacity="0.9"
              />
              <path
                d="M 480,40 L 410,220 L 380,440"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="5"
                opacity="0.9"
              />

              {/* Ward Polygons */}
              {wards.map((ward) => {
                const poly = WARD_POLYGONS[ward.id];
                if (!poly) return null;
                const colors = getPriorityColor(ward.priorityScore);
                const isSelected = selectedWardId === ward.id;
                const isHovered = hoveredWard === ward.id;
                const isHighest = highestPriorityWard?.id === ward.id;

                return (
                  <g
                    key={ward.id}
                    onClick={() => onSelectWard(ward.id)}
                    onMouseEnter={() => setHoveredWard(ward.id)}
                    onMouseLeave={() => setHoveredWard(null)}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <path
                      d={poly.path}
                      fill={colors.fill}
                      stroke={isSelected ? '#1d4ed8' : colors.border}
                      strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.5}
                      strokeDasharray={isSelected ? 'none' : 'none'}
                      filter={isSelected || isHovered ? 'url(#shadow)' : undefined}
                      className="transition-all duration-200"
                      opacity={isHovered ? 1 : 0.9}
                    />

                    {/* Ward Center Label */}
                    <g transform={`translate(${poly.labelX}, ${poly.labelY})`}>
                      <rect
                        x="-70"
                        y="-22"
                        width="140"
                        height="44"
                        rx="8"
                        fill="white"
                        stroke={colors.border}
                        strokeWidth="1.5"
                        filter="url(#shadow)"
                      />
                      <text
                        textAnchor="middle"
                        y="-4"
                        className="text-[12px] font-bold fill-slate-900"
                        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                      >
                        {ward.name.split(' - ')[1] || ward.name}
                      </text>
                      <text
                        textAnchor="middle"
                        y="12"
                        className="text-[10px] font-extrabold fill-slate-700 font-mono"
                      >
                        Score: {ward.priorityScore.toFixed(2)} ({ward.complaintCount} reports)
                      </text>
                    </g>

                    {/* Radar Pulse on Highest Priority Ward */}
                    {isHighest && (
                      <g transform={`translate(${poly.labelX}, ${poly.labelY})`}>
                        <circle
                          r="34"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="2"
                          opacity="0.7"
                          className="animate-ping"
                        />
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Complaint Pins */}
              {complaints.map((c) => {
                const { x, y } = projectToSvg(c.coordinates.lat, c.coordinates.lng);
                const isHovered = hoveredComplaint?.id === c.id;
                const isSev5 = c.severity === 5;

                return (
                  <g
                    key={c.id}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredComplaint(c)}
                    onMouseLeave={() => setHoveredComplaint(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectComplaint) onSelectComplaint(c);
                    }}
                  >
                    {/* Severity Pin Circle */}
                    <circle
                      r={isHovered ? 8 : isSev5 ? 6 : 5}
                      fill={
                        c.severity >= 4
                          ? '#ef4444'
                          : c.severity === 3
                          ? '#f59e0b'
                          : '#3b82f6'
                      }
                      stroke="white"
                      strokeWidth={1.5}
                      className={isSev5 ? 'animate-pulse' : ''}
                    />

                    {isHovered && (
                      <circle
                        r="12"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Inspector Tooltip for Complaint */}
            {hoveredComplaint && (
              <div
                className="absolute z-20 pointer-events-none p-3 rounded-xl bg-slate-900 text-white shadow-xl text-xs max-w-xs animate-in fade-in duration-150 border border-slate-700"
                style={{
                  top: '12px',
                  right: '12px',
                }}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700/80 mb-1.5">
                  <span className="font-bold text-blue-400">
                    #{hoveredComplaint.id} • {hoveredComplaint.wardName.split(' - ')[0]}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded-xs font-bold text-[10px] ${
                      hoveredComplaint.severity >= 4
                        ? 'bg-red-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    Severity {hoveredComplaint.severity}/5
                  </span>
                </div>
                <p className="font-semibold text-white leading-tight mb-1">
                  {hoveredComplaint.summary}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Category: {hoveredComplaint.category}</span>
                  <span>{hoveredComplaint.sentiment}</span>
                </div>
              </div>
            )}

            {/* Ward Details Bottom Banner if selected */}
            {selectedWardId && (
              <div className="absolute left-3 bottom-3 right-3 bg-white/95 backdrop-blur-md rounded-xl p-3 border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-2 text-xs">
                {(() => {
                  const ward = wards.find((w) => w.id === selectedWardId);
                  if (!ward) return null;
                  const colors = getPriorityColor(ward.priorityScore);
                  return (
                    <>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors.badge}`}>
                          {colors.status}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{ward.name}</span>
                        <span className="text-slate-500 hidden md:inline">
                          Pop: {ward.population.toLocaleString()} • Deficit: {ward.populationWeight}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4">
                        <span className="font-bold text-blue-700 font-mono text-sm">
                          Formula Score: {ward.priorityScore.toFixed(2)}
                        </span>
                        <span className="text-slate-600 font-medium">
                          {ward.complaintCount} Grievances • Avg Sev {ward.avgSeverity.toFixed(1)}/5
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Ward Cards Grid View */
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50">
          {wards.map((ward) => {
            const colors = getPriorityColor(ward.priorityScore);
            const isSelected = selectedWardId === ward.id;
            return (
              <div
                key={ward.id}
                onClick={() => onSelectWard(ward.id)}
                className={`p-4 rounded-xl border bg-white cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.badge}`}>
                    {colors.status}
                  </span>
                  <span className="font-black text-lg text-blue-700 font-mono">
                    {ward.priorityScore.toFixed(2)}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">{ward.name}</h4>
                <p className="text-[11px] text-slate-500 mb-3">{ward.zone}</p>

                <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span>Complaints:</span>
                    <span className="font-bold text-slate-900">{ward.complaintCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Severity:</span>
                    <span className="font-bold text-slate-900">{ward.avgSeverity.toFixed(1)} / 5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pop Weight:</span>
                    <span className="font-bold text-slate-900">{ward.populationWeight}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
