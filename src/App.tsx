/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Category, Complaint, ComplaintStatus, Severity, WardData, WardMetric } from './types';
import { INITIAL_WARDS } from './data/seedData';
import { Header } from './components/Header';
import { CitizenView } from './components/CitizenView';
import { DashboardView } from './components/DashboardView';
import { OfficerLogin } from './components/OfficerLogin';
import { CitizenAuthModal } from './components/CitizenAuthModal';
import { useAuth } from './contexts/AuthContext';
import {
  saveComplaintToFirestore,
  updateComplaintStatusInFirestore,
  subscribeToLiveComplaints,
} from './services/firestoreService';

const INITIAL_RECOMMENDATIONS: Record<
  string,
  {
    recommendation: string;
    priorityLevel: 'Critical' | 'High' | 'Medium' | 'Low';
    suggestedActions: string[];
    leadDepartment: string;
  }
> = {
  'ward-7': {
    recommendation:
      'Ward 7 demands immediate top priority due to an acute cluster of critical drinking water shortages and bursting sewage mains directly endangering public health in dense market lanes. Rapid inter-departmental mobilization is required to deploy emergency water tankers and dispatch specialized sewer jetting crews to contain cholera risks.',
    priorityLevel: 'Critical',
    suggestedActions: [
      'Dispatch 8 emergency water tankers to Shivaji Nagar Sectors 2 & 4',
      'Deploy suction jetting machines to arrest market sewer spill',
      'Isolate sparking high-tension transformer on Lane 4',
    ],
    leadDepartment: 'Municipal Water Supply & Public Health Engineering',
  },
  'ward-12': {
    recommendation:
      'Ward 12 ranks high in priority due to severe road cratering along arterial tech transit corridors and localized electrical voltage surges damaging domestic infrastructure. PWD road patch teams should immediately resurface 100ft road while MSEDCL inspects transformer substation stepping regulators.',
    priorityLevel: 'High',
    suggestedActions: [
      'Order emergency cold-mix asphalt patching on 100ft arterial route',
      'Inspect substation tap-changer to stabilize 310V electrical spikes',
      'Accelerate repair of damaged water pipeline in Block C',
    ],
    leadDepartment: 'Roads & Traffic Engineering Department',
  },
  'ward-19': {
    recommendation:
      'Ward 19 requires targeted intervention to clear chronic storm drain silt and address uncovered manholes that pose life-threatening hazards to pedestrians during monsoon surges. Municipal drainage engineers must immediately de-silt the Nehru Nagar nallah and erect heavy-duty safety barricades over exposed sewers.',
    priorityLevel: 'High',
    suggestedActions: [
      'Deploy backhoe loaders to dredge silted riverfront storm nallah',
      'Barricade and install cast-iron covers on open roadway manholes',
      'Restore water and power connections to community toilet block #4',
    ],
    leadDepartment: 'Storm Water Drainage & Disaster Management',
  },
  'ward-4': {
    recommendation:
      'Ward 4 maintains routine operational stability with low incident severity and organized civic layout, requiring standard preventative maintenance. Municipal horticulturists should schedule routine pruning along Sector 2 promenade and traffic police should re-stripe pedestrian crosswalks.',
    priorityLevel: 'Routine' as any,
    suggestedActions: [
      'Prune overgrown tree branches near telephone cables',
      'Repaint thermoplastic pedestrian zebra crossing on Gandhi Park road',
      'Replace flickering streetlight fixture on Pole #14',
    ],
    leadDepartment: 'Horticulture & Routine Maintenance Wing',
  },
};

export default function App() {
  const { currentUser: citizenUser, logout: citizenLogout } = useAuth();
  const [isCitizenAuthModalOpen, setIsCitizenAuthModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'citizen' | 'policymaker'>('citizen');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [citizenActiveTab, setCitizenActiveTab] = useState<'submit' | 'track' | 'my-complaints'>('submit');
  
  // Real-time complaints state directly populated from live Firestore /complaints collection
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const [isInitialSyncing, setIsInitialSyncing] = useState<boolean>(true);

  const [wardRecommendations, setWardRecommendations] = useState<
    Record<
      string,
      {
        recommendation: string;
        priorityLevel: 'Critical' | 'High' | 'Medium' | 'Low';
        suggestedActions: string[];
        leadDepartment: string;
      }
    >
  >(INITIAL_RECOMMENDATIONS);

  // Subscribe to live Firestore collection in real-time
  useEffect(() => {
    console.log('[App] Connecting real-time onSnapshot listener to Firestore /complaints...');
    const unsubscribe = subscribeToLiveComplaints(
      (liveComplaints) => {
        setIsFirestoreConnected(true);
        setIsInitialSyncing(false);
        // Pure mirror of live Firestore database:
        // If empty (0 documents), state remains [] and stays at 0.
        // No automatic creation or seeding is ever performed.
        setComplaints(liveComplaints);
      },
      (error) => {
        setIsInitialSyncing(false);
        console.error('[App] Firestore real-time listener error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Compute metrics per ward using formula:
  // priority_score = (complaint_count * 0.4) + (avg_severity * 0.4) + (population_weight * 0.2)
  const wardMetrics: WardMetric[] = useMemo(() => {
    return INITIAL_WARDS.map((ward) => {
      const wardComplaints = complaints.filter((c) => c.wardId === ward.id);
      const count = wardComplaints.length;
      const avgSeverity =
        count > 0
          ? wardComplaints.reduce((acc, c) => acc + c.severity, 0) / count
          : 0;

      // Formula exact calculation
      const priorityScore =
        count * 0.4 + avgSeverity * 0.4 + ward.populationWeight * 0.2;

      // Category breakdown
      const categoryBreakdown: Record<Category, number> = {
        'Water Supply': 0,
        Roads: 0,
        Electricity: 0,
        Sanitation: 0,
        'Public Safety': 0,
        Other: 0,
      };

      const severityCounts: Record<Severity, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      wardComplaints.forEach((c) => {
        if (categoryBreakdown[c.category] !== undefined) {
          categoryBreakdown[c.category]++;
        }
        if (severityCounts[c.severity] !== undefined) {
          severityCounts[c.severity]++;
        }
      });

      return {
        ...ward,
        complaintCount: count,
        avgSeverity,
        priorityScore,
        categoryBreakdown,
        severityCounts,
        latestComplaints: wardComplaints.slice(0, 8),
        aiRecommendation: wardRecommendations[ward.id],
      };
    });
  }, [complaints, wardRecommendations]);

  // Add new complaint (from citizen submission)
  const handleComplaintSubmitted = useCallback(async (newComplaint: Complaint) => {
    setComplaints((prev) => [newComplaint, ...prev]);
    // Save to Firestore and return promise to caller for verification & error display
    return await saveComplaintToFirestore(newComplaint);
  }, []);

  // Update complaint status (from triage table)
  const handleUpdateStatus = useCallback((id: string, newStatus: ComplaintStatus) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    // Update in Firestore asynchronously
    updateComplaintStatusInFirestore(id, newStatus).catch(() => {});
  }, []);

  // Update ward recommendation
  const handleUpdateWardRecommendation = useCallback(
    (
      wardId: string,
      rec: {
        recommendation: string;
        priorityLevel: 'Critical' | 'High' | 'Medium' | 'Low';
        suggestedActions: string[];
        leadDepartment: string;
      }
    ) => {
      setWardRecommendations((prev) => ({
        ...prev,
        [wardId]: rec,
      }));
    },
    []
  );

  const [citizenSessionKey, setCitizenSessionKey] = useState<number>(0);

  const handleCitizenLogout = useCallback(async () => {
    try {
      await citizenLogout();
    } finally {
      // Force clean form state on logout
      setCitizenActiveTab('submit');
      setCitizenSessionKey((k) => k + 1);
    }
  }, [citizenLogout]);

  const handleViewChange = useCallback((view: 'citizen' | 'policymaker') => {
    if (view === 'citizen') {
      setCitizenActiveTab('submit');
      // If clicking Citizen Portal while already in Citizen Portal, reset to fresh form
      if (currentView === 'citizen') {
        setCitizenSessionKey((k) => k + 1);
      }
    }
    setCurrentView(view);
  }, [currentView]);

  const criticalComplaintsCount = useMemo(() => {
    return complaints.filter((c) => c.severity >= 4).length;
  }, [complaints]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation Header */}
      <Header
        currentView={currentView}
        onViewChange={handleViewChange}
        totalComplaints={complaints.length}
        criticalCount={criticalComplaintsCount}
        isAdminAuthenticated={isAdminAuthenticated}
        onLogout={() => setIsAdminAuthenticated(false)}
        citizenUser={citizenUser}
        onOpenCitizenAuth={() => setIsCitizenAuthModalOpen(true)}
        onCitizenLogout={handleCitizenLogout}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentView === 'citizen' ? (
          <CitizenView
            key={`citizen-${citizenUser ? citizenUser.uid : 'anon'}-${citizenSessionKey}`}
            wards={INITIAL_WARDS}
            complaints={complaints}
            onComplaintSubmitted={handleComplaintSubmitted}
            onNavigateToDashboard={() => setCurrentView('policymaker')}
            citizenUser={citizenUser}
            onOpenCitizenAuth={() => setIsCitizenAuthModalOpen(true)}
            activeTab={citizenActiveTab}
            onTabChange={setCitizenActiveTab}
          />
        ) : !isAdminAuthenticated ? (
          <OfficerLogin
            onLoginSuccess={() => setIsAdminAuthenticated(true)}
            onCancelToCitizen={() => setCurrentView('citizen')}
          />
        ) : (
          <DashboardView
            wardMetrics={wardMetrics}
            complaints={complaints}
            onUpdateComplaintStatus={handleUpdateStatus}
            onUpdateWardRecommendation={handleUpdateWardRecommendation}
            isFirestoreConnected={isFirestoreConnected}
            isInitialSyncing={isInitialSyncing}
          />
        )}
      </main>

      {/* Optional Citizen Auth Modal */}
      <CitizenAuthModal
        isOpen={isCitizenAuthModalOpen}
        onClose={() => setIsCitizenAuthModalOpen(false)}
        onSuccess={() => {
          // If in citizen view, optionally switch to my-complaints
          if (currentView === 'citizen') {
            setCitizenActiveTab('my-complaints');
          }
        }}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">Nagrik AI</span>
            <span>•</span>
            <span>AI for Digital Public Infrastructure (DPI) &amp; Governance</span>
          </div>

          <div className="flex items-center space-x-4 text-slate-400">
            <span>Automated Grievance Classification</span>
            <span>•</span>
            <span>data.gov.in Demographic Indices</span>
            <span>•</span>
            <span>Web Speech Multilingual Ingest</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
