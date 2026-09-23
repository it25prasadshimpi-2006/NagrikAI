import { ClassificationResponse, WardMetric } from '../types';

export async function classifyComplaint(payload: {
  description: string;
  ward?: string;
  name?: string;
  selectedCategory?: string;
  image?: {
    inlineData: {
      data: string;
      mimeType: string;
    };
  };
}): Promise<{ data: ClassificationResponse; source: string; warning?: string }> {
  const response = await fetch('/api/complaints/classify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Classification failed: HTTP ${response.status}`);
  }

  const result = await response.json();
  return result;
}

export async function getWardRecommendation(ward: WardMetric): Promise<{
  recommendation: string;
  priority_level: 'Critical' | 'High' | 'Medium' | 'Low';
  suggested_actions: string[];
  lead_department: string;
}> {
  const response = await fetch('/api/wards/recommendation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      wardId: ward.id,
      wardName: ward.name,
      complaintCount: ward.complaintCount,
      avgSeverity: ward.avgSeverity,
      populationWeight: ward.populationWeight,
      priorityScore: ward.priorityScore,
      categoryBreakdown: ward.categoryBreakdown,
      sampleSummaries: ward.latestComplaints.map((c) => c.summary).slice(0, 4),
    }),
  });

  if (!response.ok) {
    throw new Error(`Ward recommendation failed: HTTP ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function getBatchWardRecommendations(wards: WardMetric[]): Promise<
  Array<{
    wardId: string;
    recommendation: string;
    priority_level: 'Critical' | 'High' | 'Medium' | 'Low';
    suggested_actions: string[];
    lead_department: string;
  }>
> {
  const simplified = wards.map((w) => ({
    wardId: w.id,
    wardName: w.name,
    complaintCount: w.complaintCount,
    avgSeverity: Number(w.avgSeverity.toFixed(2)),
    populationWeight: w.populationWeight,
    priorityScore: Number(w.priorityScore.toFixed(2)),
    categoryBreakdown: w.categoryBreakdown,
    sampleSummaries: w.latestComplaints.map((c) => c.summary).slice(0, 3),
  }));

  const response = await fetch('/api/wards/batch-recommendations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ wards: simplified }),
  });

  if (!response.ok) {
    throw new Error(`Batch recommendations failed: HTTP ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}
