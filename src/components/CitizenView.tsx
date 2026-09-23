import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Volume2,
  Globe2,
  Info,
  Clock,
  Layers,
  ChevronDown,
  Camera,
  Upload,
  X,
  Image as ImageIcon,
  Copy,
  Check,
  Search,
  UserCheck,
  PlusCircle,
  FolderOpen,
  Database
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { Category, Complaint, Severity, WardData } from '../types';
import { useSpeechRecognition, SupportedLanguage } from '../hooks/useSpeechRecognition';
import { classifyComplaint } from '../services/api';
import { TrackComplaintLookup } from './TrackComplaintLookup';
import { MyComplaintsList } from './MyComplaintsList';

interface CitizenViewProps {
  wards: WardData[];
  complaints: Complaint[];
  onComplaintSubmitted: (complaint: Complaint) => Promise<{ docId: string; databaseId: string }> | Promise<any> | void;
  onNavigateToDashboard: () => void;
  citizenUser?: FirebaseUser | null;
  onOpenCitizenAuth?: () => void;
  activeTab?: 'submit' | 'track' | 'my-complaints';
  onTabChange?: (tab: 'submit' | 'track' | 'my-complaints') => void;
  initialTrackId?: string;
  onClearInitialTrackId?: () => void;
}

const CATEGORY_OPTIONS: Category[] = [
  'Water Supply',
  'Roads',
  'Electricity',
  'Sanitation',
  'Public Safety',
  'Other',
];

const SAMPLE_PROMPTS = [
  {
    lang: 'हिंदी (Hindi)',
    langCode: 'hi-IN' as SupportedLanguage,
    category: 'Water Supply',
    wardId: 'ward-7',
    text: 'पिछले 10 दिनों से हमारे इलाके में पीने का पानी बिल्कुल नहीं आ रहा है, टैंकर माफिया 2000 रुपये लूट रहे हैं।',
    previewLabel: 'Water Outage (10 Days)',
  },
  {
    lang: 'मराठी (Marathi)',
    langCode: 'mr-IN' as SupportedLanguage,
    category: 'Roads',
    wardId: 'ward-12',
    text: 'रस्त्यावर २ फुटांचे मोठे खड्डे पडले आहेत, काल रात्री दोन दुचाकीस्वार घसरून गंभीर जखमी झाले.',
    previewLabel: 'Dangerous Road Craters',
  },
  {
    lang: 'English',
    langCode: 'en-IN' as SupportedLanguage,
    category: 'Sanitation',
    wardId: 'ward-19',
    text: 'Open sewage storm drain overflowing directly into residential lane near municipal school. Foul stench and disease hazard.',
    previewLabel: 'Sewage Overflow Hazard',
  },
  {
    lang: 'हिंदी (Hindi)',
    langCode: 'hi-IN' as SupportedLanguage,
    category: 'Electricity',
    wardId: 'ward-7',
    text: 'स्कूल के मुख्य द्वार के सामने बिजली का खंभा झुक गया है और तार में से तेज चिंगारी निकल रही है!',
    previewLabel: 'Sparking Electric Wire',
  },
];

export const CitizenView: React.FC<CitizenViewProps> = ({
  wards,
  complaints,
  onComplaintSubmitted,
  onNavigateToDashboard,
  citizenUser,
  onOpenCitizenAuth,
  activeTab: controlledTab,
  onTabChange: setControlledTab,
  initialTrackId,
  onClearInitialTrackId,
}) => {
  const [internalTab, setInternalTab] = useState<'submit' | 'track' | 'my-complaints'>('submit');
  const currentTab = controlledTab !== undefined ? controlledTab : internalTab;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedWardId, setSelectedWardId] = useState(wards[0]?.id || 'ward-7');
  const [selectedCategory, setSelectedCategory] = useState<string>('Auto-detect with AI');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmittedComplaint, setLastSubmittedComplaint] = useState<Complaint | null>(null);
  const [isGpsLocating, setIsGpsLocating] = useState(false);
  const [hasCopiedId, setHasCopiedId] = useState(false);
  const [trackQueryId, setTrackQueryId] = useState<string>(initialTrackId || '');

  // Live Firestore database write status
  const [firestoreSyncState, setFirestoreSyncState] = useState<{
    status: 'idle' | 'saving' | 'synced' | 'failed';
    docId?: string;
    databaseId?: string;
    error?: string;
  }>({ status: 'idle' });

  // Clear confirmation and reset when navigating between tabs
  const setTab = (tab: 'submit' | 'track' | 'my-complaints') => {
    setLastSubmittedComplaint(null);
    setFirestoreSyncState({ status: 'idle' });
    if (setControlledTab) setControlledTab(tab);
    setInternalTab(tab);
  };

  // Reset confirmation view and form state whenever citizenUser changes (e.g. login or logout)
  useEffect(() => {
    setLastSubmittedComplaint(null);
    setFirestoreSyncState({ status: 'idle' });
    setName('');
    setPhone('');
    setDescription('');
    setAttachedPhoto(null);
    setSubmitError(null);
  }, [citizenUser]);

  // Photo upload state
  const [attachedPhoto, setAttachedPhoto] = useState<{
    file: File;
    dataUrl: string;
    base64Data: string;
    mimeType: string;
  } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Web Speech API hook
  const {
    isListening,
    transcript,
    interimTranscript,
    language,
    setLanguage,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: isSpeechSupported,
    recordingSeconds,
    error: speechError,
  } = useSpeechRecognition((newText) => {
    setDescription(newText);
  });

  // Handle voice toggle
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  // Quick preset sample text
  const applySamplePrompt = (sample: typeof SAMPLE_PROMPTS[0]) => {
    setDescription(sample.text);
    setSelectedWardId(sample.wardId);
    setSelectedCategory(sample.category);
    setLanguage(sample.langCode);
    setSubmitError(null);
  };

  // Simulate GPS auto-location
  const handleAutoLocate = () => {
    setIsGpsLocating(true);
    setTimeout(() => {
      // Pick random ward or closest
      const randomWard = wards[Math.floor(Math.random() * wards.length)];
      if (randomWard) {
        setSelectedWardId(randomWard.id);
      }
      setIsGpsLocating(false);
    }, 600);
  };

  // Process selected image file
  const handleFileProcess = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSubmitError('Please select a valid image file (JPG or PNG).');
      return;
    }
    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError('Image size exceeds 10MB limit. Please select a smaller photo.');
      return;
    }

    setSubmitError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Extract pure base64
      const base64Data = dataUrl.split(',')[1] || '';
      setAttachedPhoto({
        file,
        dataUrl,
        base64Data,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleRemovePhoto = () => {
    setAttachedPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit Complaint with Gemini AI
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setSubmitError('Please describe the infrastructure issue or record a voice note.');
      return;
    }

    if (isListening) {
      stopListening();
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const targetWard = wards.find((w) => w.id === selectedWardId) || wards[0];

    try {
      // Build image payload if attached
      const imagePayload = attachedPhoto
        ? {
            inlineData: {
              data: attachedPhoto.base64Data,
              mimeType: attachedPhoto.mimeType,
            },
          }
        : undefined;

      // Real Gemini API Call via server proxy
      const classificationResult = await classifyComplaint({
        description: description.trim(),
        ward: targetWard.name,
        name: name.trim() || undefined,
        selectedCategory:
          selectedCategory !== 'Auto-detect with AI' ? selectedCategory : undefined,
        image: imagePayload,
      });

      const { data } = classificationResult;

      // Generate random offset coordinates near ward center
      const latOffset = (Math.random() - 0.5) * 0.006;
      const lngOffset = (Math.random() - 0.5) * 0.006;

      // Compute unified ID: Find the maximum numerical suffix among existing complaints, or start at 720
      const existingNumericIds = complaints
        .map((c) => {
          const match = c.id.match(/^NGK-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((num) => num > 0);
      const maxExisting = existingNumericIds.length > 0 ? Math.max(...existingNumericIds) : 719;
      const nextIdNumber = maxExisting + 1;
      const unifiedComplaintId = `NGK-${nextIdNumber}`;

      const newComplaint: Complaint = {
        id: unifiedComplaintId,
        name: name.trim() || (citizenUser?.displayName ? citizenUser.displayName : 'Concerned Citizen'),
        phone: phone.trim() || undefined,
        wardId: targetWard.id,
        wardName: targetWard.name,
        description: description.trim(),
        category: data.category,
        severity: data.severity,
        summary: data.summary,
        translatedText: data.translated_text,
        sentiment: data.sentiment,
        detectedLanguage: data.detected_language,
        keyEntities: data.key_entities,
        rationale: data.rationale,
        photoUrl: attachedPhoto ? attachedPhoto.dataUrl : undefined,
        imageAnalysisNote: data.image_analysis_note,
        citizenUserId: citizenUser ? citizenUser.uid : undefined,
        citizenEmail: citizenUser ? citizenUser.email || undefined : undefined,
        timestamp: new Date().toISOString(),
        coordinates: {
          lat: targetWard.centerCoords.lat + latOffset,
          lng: targetWard.centerCoords.lng + lngOffset,
        },
        status: 'Triage',
        source: transcript ? 'voice_note' : 'citizen_web',
      };

      setFirestoreSyncState({ status: 'saving', docId: unifiedComplaintId });
      try {
        const syncRes = await onComplaintSubmitted(newComplaint);
        setFirestoreSyncState({
          status: 'synced',
          docId: unifiedComplaintId,
          databaseId: (syncRes as any)?.databaseId || 'ai-studio-nagrikai-df451c87-ec07-40a1-8c8a-afe7d4a7180a',
        });
        console.log(`[CitizenView] Confirmed write in Firestore for document ${unifiedComplaintId}`);
      } catch (firestoreErr: any) {
        console.error(`[CitizenView] Firestore write caught error for document ${unifiedComplaintId}:`, firestoreErr);
        setFirestoreSyncState({
          status: 'failed',
          docId: unifiedComplaintId,
          databaseId: 'ai-studio-nagrikai-df451c87-ec07-40a1-8c8a-afe7d4a7180a',
          error: firestoreErr?.message || String(firestoreErr),
        });
      }

      setLastSubmittedComplaint(newComplaint);

      // Reset form
      setDescription('');
      resetTranscript();
      setAttachedPhoto(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      setSubmitError(err.message || 'Failed to submit complaint. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryFirestoreSync = async () => {
    if (!lastSubmittedComplaint) return;
    setFirestoreSyncState({ status: 'saving', docId: lastSubmittedComplaint.id });
    try {
      const res = await onComplaintSubmitted(lastSubmittedComplaint);
      setFirestoreSyncState({
        status: 'synced',
        docId: lastSubmittedComplaint.id,
        databaseId: (res as any)?.databaseId || 'ai-studio-nagrikai-df451c87-ec07-40a1-8c8a-afe7d4a7180a',
      });
      console.log(`[CitizenView] Retry write succeeded for document ${lastSubmittedComplaint.id}`);
    } catch (err: any) {
      console.error(`[CitizenView] Retry Firestore write failed for document ${lastSubmittedComplaint.id}:`, err);
      setFirestoreSyncState({
        status: 'failed',
        docId: lastSubmittedComplaint.id,
        databaseId: 'ai-studio-nagrikai-df451c87-ec07-40a1-8c8a-afe7d4a7180a',
        error: err?.message || String(err),
      });
    }
  };

  const getSeverityBadge = (sev: Severity) => {
    switch (sev) {
      case 5:
        return {
          bg: 'bg-red-500 text-white',
          border: 'border-red-600',
          label: 'Severity 5 / 5 (Critical Emergency)',
          desc: 'High immediate hazard, prolonged outage, or imminent health threat.',
        };
      case 4:
        return {
          bg: 'bg-orange-500 text-white',
          border: 'border-orange-600',
          label: 'Severity 4 / 5 (High Urgency)',
          desc: 'Significant structural or sanitary breakdown requiring expedited dispatch.',
        };
      case 3:
        return {
          bg: 'bg-amber-500 text-white',
          border: 'border-amber-600',
          label: 'Severity 3 / 5 (Moderate Disruption)',
          desc: 'Regular municipal service failure affecting community routine.',
        };
      case 2:
        return {
          bg: 'bg-blue-500 text-white',
          border: 'border-blue-600',
          label: 'Severity 2 / 5 (Low Disruption)',
          desc: 'Minor defect or localized cosmetic infrastructure issue.',
        };
      case 1:
      default:
        return {
          bg: 'bg-emerald-500 text-white',
          border: 'border-emerald-600',
          label: 'Severity 1 / 5 (Routine / Minor)',
          desc: 'Scheduled preventative maintenance or slight aesthetic concern.',
        };
    }
  };

  const selectedWard = wards.find((w) => w.id === selectedWardId) || wards[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Multilingual Voice &amp; Text Grievance Ingest</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Citizen Infrastructure Redressal Portal
        </h1>
        <p className="mt-2 text-base text-slate-600 max-w-2xl mx-auto">
          Report road hazards, water leaks, power failures, or sanitation problems.
          Our automated AI engine classifies your complaint, translates multilingual input, and prioritizes government action.
        </p>

        {/* Citizen Auth banner if not logged in */}
        {!citizenUser && onOpenCitizenAuth && (
          <div className="mt-4 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100/90 border border-slate-200 text-xs text-slate-700">
            <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Submission is 100% open with no login required.</span>
            <button
              onClick={onOpenCitizenAuth}
              className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ml-1"
            >
              Sign In (Optional)
            </button>
            <span className="text-slate-400">to save grievances under your citizen account.</span>
          </div>
        )}
      </div>

      {/* Citizen Portal Navigation Tabs */}
      <div className="flex items-center justify-center mb-8">
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 border border-slate-200 shadow-inner">
          <button
            type="button"
            onClick={() => setTab('submit')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'submit'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Lodge Grievance (Open)</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('track')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'track'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track My Complaint</span>
          </button>

          {citizenUser ? (
            <button
              type="button"
              onClick={() => setTab('my-complaints')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'my-complaints'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>My Complaints</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                {
                  complaints.filter(
                    (c) =>
                      c.citizenUserId === citizenUser.uid ||
                      (c.citizenEmail && c.citizenEmail.toLowerCase() === citizenUser.email?.toLowerCase())
                  ).length
                }
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenCitizenAuth}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Sign in with your citizen account to view history"
            >
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>My Complaints (Sign In)</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB CONTENT 1: TRACK COMPLAINT LOOKUP */}
      {currentTab === 'track' && (
        <TrackComplaintLookup
          complaints={complaints}
          initialSearchId={trackQueryId}
          onClearInitialId={() => {
            setTrackQueryId('');
            if (onClearInitialTrackId) onClearInitialTrackId();
          }}
        />
      )}

      {/* TAB CONTENT 2: MY COMPLAINTS (LOGGED IN CITIZEN) */}
      {currentTab === 'my-complaints' && citizenUser && (
        <MyComplaintsList
          complaints={complaints}
          userEmail={citizenUser.email || 'Citizen User'}
          userId={citizenUser.uid}
          onTrackSpecificId={(id) => {
            setTrackQueryId(id);
            setTab('track');
          }}
          onOpenSubmitNew={() => setTab('submit')}
        />
      )}

      {/* TAB CONTENT 3: LODGE GRIEVANCE (SUBMISSION FORM & CONFIRMATION) */}
      {currentTab === 'submit' && (
        <>
      {/* Confirmation View after submission */}
      {lastSubmittedComplaint ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-slate-900">Complaint Logged Successfully</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-800">
                    #{lastSubmittedComplaint.id}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Ingested into Municipal Public Infrastructure Ledger • AI Classification Verified
                </p>
              </div>
            </div>
            <button
              onClick={() => setLastSubmittedComplaint(null)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Submit Another</span>
            </button>
          </div>

          {/* Real-time Firestore Database Write Status & Error Banner */}
          {firestoreSyncState.status === 'failed' && (
            <div className="mt-5 p-4 rounded-xl bg-red-50 border-2 border-red-400 text-red-900 shadow-sm animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-red-900">
                      Firestore Database Write Failed
                    </h4>
                    <p className="text-xs text-red-800 mt-1 leading-relaxed">
                      The grievance was triaged, but writing to Firestore collection <strong>"complaints"</strong> in database <strong>{firestoreSyncState.databaseId}</strong> failed.
                    </p>
                    <div className="mt-2 p-2 rounded bg-red-100/90 font-mono text-[11px] text-red-950 border border-red-200 break-all">
                      {firestoreSyncState.error}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRetryFirestoreSync}
                  className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Firestore Write</span>
                </button>
              </div>
            </div>
          )}

          {firestoreSyncState.status === 'synced' && (
            <div className="mt-5 p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-xs animate-in fade-in">
              <div className="flex items-center space-x-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-emerald-950">✓ Successfully Persisted to Firestore</span>
                  <div className="text-[11px] text-emerald-800 flex items-center space-x-2 mt-0.5">
                    <span>Collection: <strong>complaints</strong></span>
                    <span>•</span>
                    <span>Document: <code className="font-mono font-bold bg-emerald-100 px-1 rounded text-emerald-900">{lastSubmittedComplaint.id}</code></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-800 bg-emerald-100/70 px-2 py-1 rounded-md border border-emerald-200 self-start sm:self-auto">
                <Database className="w-3 h-3 text-emerald-600" />
                <span>DB: {firestoreSyncState.databaseId}</span>
              </div>
            </div>
          )}

          {firestoreSyncState.status === 'saving' && (
            <div className="mt-5 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center space-x-2.5 text-xs animate-pulse">
              <Database className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Writing document <code className="font-mono font-bold">{lastSubmittedComplaint.id}</code> to Firestore collection <strong>"complaints"</strong>...</span>
            </div>
          )}

          {/* PART 1 Prominent Complaint ID Display & Copy Button */}
          <div className="mt-6 p-5 rounded-2xl bg-linear-to-r from-blue-50 via-indigo-50/50 to-blue-50 border border-blue-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                  Official Complaint Reference ID
                </span>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-blue-900 tracking-tight">
                    #{lastSubmittedComplaint.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`#${lastSubmittedComplaint.id}`);
                      setHasCopiedId(true);
                      setTimeout(() => setHasCopiedId(false), 2200);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-blue-700 font-bold text-xs border border-blue-200 shadow-xs transition-all cursor-pointer"
                    title="Copy Complaint ID"
                  >
                    {hasCopiedId ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-blue-600" />
                        <span>Copy ID</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTrackQueryId(lastSubmittedComplaint.id);
                  setTab('track');
                }}
                className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Track Status Live</span>
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center space-x-2 text-xs text-blue-950 font-medium">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Save this ID to track your complaint status anytime.
              </span>
            </div>
          </div>

          {/* AI Insights Card */}
          <div className="mt-6 bg-slate-50 rounded-xl p-5 border border-slate-200/80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  AI Extraction Summary
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {lastSubmittedComplaint.detectedLanguage
                  ? `Language: ${lastSubmittedComplaint.detectedLanguage}`
                  : 'Automated Triaging'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Category */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                  Identified Category
                </span>
                <span className="text-base font-bold text-blue-700 mt-1 inline-flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-600 mr-2"></span>
                  {lastSubmittedComplaint.category}
                </span>
              </div>

              {/* Severity Score */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                  Calculated Severity Score
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      getSeverityBadge(lastSubmittedComplaint.severity).bg
                    }`}
                  >
                    Level {lastSubmittedComplaint.severity} / 5
                  </span>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div
                        key={lvl}
                        className={`w-3.5 h-2 rounded-xs ${
                          lvl <= lastSubmittedComplaint.severity
                            ? lvl >= 4
                              ? 'bg-red-500'
                              : lvl === 3
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 mb-3">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                Official AI Summary (English)
              </span>
              <p className="text-sm font-semibold text-slate-800 mt-1">
                "{lastSubmittedComplaint.summary}"
              </p>
            </div>

            {/* AI Photo Analysis Proof Card (if photo attached) */}
            {lastSubmittedComplaint.imageAnalysisNote && (
              <div className="bg-indigo-50/80 border border-indigo-200/90 rounded-xl p-4 mb-3 animate-in fade-in">
                <div className="flex items-start space-x-3">
                  {lastSubmittedComplaint.photoUrl ? (
                    <img
                      src={lastSubmittedComplaint.photoUrl}
                      alt="Submitted Infrastructure"
                      className="w-16 h-16 object-cover rounded-lg border border-indigo-200 shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5 text-indigo-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center space-x-1.5">
                      <span>📷 AI Photo Analysis</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-indigo-200 text-indigo-800 text-[10px]">Multimodal Vision Verified</span>
                    </span>
                    <p className="text-xs text-indigo-950 mt-1 leading-relaxed font-medium">
                      {lastSubmittedComplaint.imageAnalysisNote}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Original vs Translated (if different) */}
            {lastSubmittedComplaint.translatedText &&
              lastSubmittedComplaint.translatedText !== lastSubmittedComplaint.description && (
                <div className="bg-white p-4 rounded-lg border border-slate-200 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                      Cross-Lingual Translation (from {lastSubmittedComplaint.detectedLanguage || 'Indic'})
                    </span>
                    <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-600 italic">
                    "{lastSubmittedComplaint.translatedText}"
                  </p>
                </div>
              )}

            {/* Severity Rationale & Sentiment */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-500">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-slate-700">Sentiment:</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold text-[11px]">
                  {lastSubmittedComplaint.sentiment}
                </span>
                {lastSubmittedComplaint.keyEntities && lastSubmittedComplaint.keyEntities.length > 0 && (
                  <span className="text-slate-400 hidden sm:inline">
                    • Entities: {lastSubmittedComplaint.keyEntities.join(', ')}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">
                Ward: {lastSubmittedComplaint.wardName}
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                This complaint has been factored into {lastSubmittedComplaint.wardName}'s real-time priority score.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setLastSubmittedComplaint(null);
                  setFirestoreSyncState({ status: 'idle' });
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Submit Another Grievance</span>
              </button>

              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-colors cursor-pointer"
              >
                <span>View in Policymaker Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Submission Form */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {/* Quick Preset Selector */}
          <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Try Realistic Multi-Lingual Demos (1-Tap Fill)</span>
              </span>
              <span className="text-[11px] text-slate-500">English • हिंदी • मराठी</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {SAMPLE_PROMPTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applySamplePrompt(sample)}
                  className="text-left p-2.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800 group-hover:text-blue-700">
                      {sample.previewLabel}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-slate-100 text-slate-600 font-medium">
                      {sample.lang.split(' ')[0]}
                    </span>
                  </div>
                  <p className="text-slate-500 truncate text-[11px]">{sample.text}</p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Citizen Details Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Citizen Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kulkarni (or anonymous)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone / WhatsApp <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98230 44102"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm"
                />
              </div>
            </div>

            {/* Ward & Category Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Locality / Municipal Ward <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoLocate}
                    disabled={isGpsLocating}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>{isGpsLocating ? 'Detecting GPS...' : 'Auto-locate'}</span>
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={selectedWardId}
                    onChange={(e) => setSelectedWardId(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm font-medium text-slate-800 pr-10"
                  >
                    {wards.map((ward) => (
                      <option key={ward.id} value={ward.id}>
                        {ward.name} ({ward.zone})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Pop: {selectedWard.population.toLocaleString()} • Deficit Index: {selectedWard.populationWeight}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category <span className="text-slate-400 font-normal lowercase">(auto-suggested by AI)</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm font-medium text-slate-800 pr-10"
                  >
                    <option value="Auto-detect with AI">✨ Auto-detect with AI</option>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Roads, Water, Electricity, Sanitation, or Public Safety
                </p>
              </div>
            </div>

            {/* Description & Speech Recognition Box */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Complaint Description <span className="text-red-500">*</span>
                </label>

                {/* Speech Language Selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">Voice Language:</span>
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setLanguage('en-IN')}
                      className={`px-2 py-0.5 rounded-md ${
                        language === 'en-IN'
                          ? 'bg-white text-blue-700 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('hi-IN')}
                      className={`px-2 py-0.5 rounded-md ${
                        language === 'hi-IN'
                          ? 'bg-white text-blue-700 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      हिंदी
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('mr-IN')}
                      className={`px-2 py-0.5 rounded-md ${
                        language === 'mr-IN'
                          ? 'bg-white text-blue-700 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      मराठी
                    </button>
                  </div>
                </div>
              </div>

              {/* Textarea with voice integration */}
              <div className="relative">
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Describe the infrastructure breakdown in English, हिंदी, or मराठी... (e.g. "Water pipeline burst near market", "पिछले 10 दिनों से पानी नहीं आया", "रस्त्यावर मोठे खड्डे पडले आहेत")`}
                  className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    isListening
                      ? 'border-red-400 bg-red-50/20 focus:border-red-500'
                      : 'border-slate-300 focus:border-blue-600'
                  }`}
                />

                {/* Voice Record Overlay / Button */}
                <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
                      isListening
                        ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-300'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                    }`}
                    title={
                      isSpeechSupported
                        ? `Record Voice Note in ${language === 'hi-IN' ? 'Hindi' : language === 'mr-IN' ? 'Marathi' : 'English'}`
                        : 'Web Speech API not supported in this browser'
                    }
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Stop ({recordingSeconds}s)</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-blue-600" />
                        <span>Record Voice Note</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Active Audio Wave Indicator */}
              {isListening && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between text-xs text-red-800 animate-in fade-in">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <span className="w-1.5 h-4 bg-red-600 animate-bounce rounded-full" />
                      <span className="w-1.5 h-6 bg-red-500 animate-bounce delay-75 rounded-full" />
                      <span className="w-1.5 h-3 bg-red-600 animate-bounce delay-150 rounded-full" />
                    </div>
                    <span className="font-semibold">
                      Listening in {language === 'hi-IN' ? 'Hindi' : language === 'mr-IN' ? 'Marathi' : 'English'}...
                    </span>
                  </div>
                  {interimTranscript && (
                    <span className="italic text-slate-600 max-w-xs truncate">
                      "{interimTranscript}"
                    </span>
                  )}
                </div>
              )}

              {speechError && (
                <p className="mt-1.5 text-xs text-amber-600 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{speechError}</span>
                </p>
              )}
            </div>

            {/* Optional Photo Upload Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Attach Photo (Optional)</span>
                </label>
                <span className="text-[11px] text-slate-400">JPG, PNG (Max 10MB) • Multimodal AI verification</span>
              </div>

              {attachedPhoto ? (
                /* Thumbnail Preview with Remove Button */
                <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/50">
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={attachedPhoto.dataUrl}
                      alt="Uploaded preview"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-xs shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {attachedPhoto.file.name}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-sm bg-blue-100 text-blue-700">
                          {(attachedPhoto.file.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        <span>Ready for AI vision classification &amp; severity verification</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors shrink-0 ml-2"
                    title="Remove attached photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Drag-and-drop / Click-to-browse box */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                    isDraggingOver
                      ? 'border-blue-600 bg-blue-50/50 scale-[1.01]'
                      : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60 bg-white'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileProcess(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="flex flex-col items-center justify-center space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-slate-700">
                      <span className="font-bold text-blue-600 hover:underline">Click to browse</span> or drag and drop photo here
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Help officials prioritize by showing potholes, leaks, garbage or broken wires
                    </p>
                  </div>
                </div>
              )}
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-md shadow-blue-600/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Analyzing Complaint with AI...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Grievance to Municipal Engine</span>
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-slate-400 mt-2">
                Real-time AI Classification, Severity Scoring &amp; Translation
              </p>
            </div>
          </form>
        </div>
      )}
      </>
      )}
    </div>
  );
};
