export type Category =
  | 'Roads'
  | 'Water Supply'
  | 'Electricity'
  | 'Sanitation'
  | 'Public Safety'
  | 'Other';

export type Severity = 1 | 2 | 3 | 4 | 5;

export type ComplaintStatus =
  | 'Triage'
  | 'Under Inspection'
  | 'Work Order Issued'
  | 'Resolved';

export interface Complaint {
  id: string;
  name?: string;
  phone?: string;
  wardId: string;
  wardName: string;
  description: string;
  category: Category;
  severity: Severity;
  summary: string;
  translatedText?: string;
  sentiment: string;
  detectedLanguage?: string;
  keyEntities?: string[];
  rationale?: string;
  photoUrl?: string; // base64 or URL of attached photo
  imageAnalysisNote?: string; // AI photo verification & severity note
  citizenUserId?: string; // Firebase Auth user UID if submitted while logged in
  citizenEmail?: string; // Citizen email if submitted while logged in
  timestamp: string; // ISO date string
  coordinates: {
    lat: number;
    lng: number;
  };
  status: ComplaintStatus;
  source: 'citizen_web' | 'voice_note' | 'sample_seed';
}

export interface WardData {
  id: string;
  name: string;
  zone: string;
  population: number;
  populationWeight: number; // Deficit/Population weight from data.gov.in (e.g. 4.2 - 9.5)
  centerCoords: {
    lat: number;
    lng: number;
  };
  colorTheme: string;
  description: string;
}

export interface WardMetric extends WardData {
  complaintCount: number;
  avgSeverity: number;
  priorityScore: number;
  categoryBreakdown: Record<Category, number>;
  severityCounts: Record<Severity, number>;
  latestComplaints: Complaint[];
  aiRecommendation?: {
    recommendation: string;
    priorityLevel: 'Critical' | 'High' | 'Medium' | 'Low';
    suggestedActions: string[];
    leadDepartment: string;
  };
  isAiLoading?: boolean;
}

export interface ClassificationResponse {
  category: Category;
  severity: Severity;
  summary: string;
  translated_text: string;
  sentiment: string;
  detected_language?: string;
  key_entities?: string[];
  rationale?: string;
  image_analysis_note?: string;
}
