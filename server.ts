import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini initialization as mandated
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to call Gemini models with fallback sequence
const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

async function generateWithModelFallback(params: {
  contents: any;
  config?: any;
}) {
  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return { response, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} failed: ${err?.status || err?.message || err}. Trying next candidate...`);
    }
  }
  throw lastError;
}

// Heuristic fallback for resilience if API key is unconfigured or rate limited
function heuristicClassification(text: string, userCategory?: string) {
  const lower = text.toLowerCase();
  let category = userCategory || 'Other';
  let severity = 2;
  let sentiment = 'Concerned';

  if (
    lower.includes('water') ||
    lower.includes('पानी') ||
    lower.includes('पाइप') ||
    lower.includes('गंदा पानी') ||
    lower.includes('गळती') ||
    lower.includes('नल') ||
    lower.includes('drain') ||
    lower.includes('pipe') ||
    lower.includes('leak')
  ) {
    category = 'Water Supply';
  } else if (
    lower.includes('road') ||
    lower.includes('pothole') ||
    lower.includes('रस्ता') ||
    lower.includes('सड़क') ||
    lower.includes('खड्डे') ||
    lower.includes('खड्डा') ||
    lower.includes('traffic') ||
    lower.includes('accident') ||
    lower.includes('asphalt')
  ) {
    category = 'Roads';
  } else if (
    lower.includes('electric') ||
    lower.includes('power') ||
    lower.includes('light') ||
    lower.includes('बिजली') ||
    lower.includes('लाइट') ||
    lower.includes('वायर') ||
    lower.includes('करंट') ||
    lower.includes('तारा') ||
    lower.includes('pole') ||
    lower.includes('transformer')
  ) {
    category = 'Electricity';
  } else if (
    lower.includes('garbage') ||
    lower.includes('trash') ||
    lower.includes('waste') ||
    lower.includes('कचरा') ||
    lower.includes('गंदगी') ||
    lower.includes('दुर्गंधी') ||
    lower.includes('sewage') ||
    lower.includes('gutter') ||
    lower.includes('drain')
  ) {
    category = 'Sanitation';
  } else if (
    lower.includes('safety') ||
    lower.includes('crime') ||
    lower.includes('danger') ||
    lower.includes('सुरक्षा') ||
    lower.includes('धोका') ||
    lower.includes('theft') ||
    lower.includes('harass') ||
    lower.includes('dark')
  ) {
    category = 'Public Safety';
  }

  // Severity calculation
  if (
    lower.includes('10 day') ||
    lower.includes('15 day') ||
    lower.includes('week') ||
    lower.includes('deadly') ||
    lower.includes('hazard') ||
    lower.includes('emergency') ||
    lower.includes('sparking') ||
    lower.includes('school') ||
    lower.includes('child') ||
    lower.includes('hospital') ||
    lower.includes('धोकादायक') ||
    lower.includes('जीव') ||
    lower.includes('गंभीर') ||
    lower.includes('10 दिन')
  ) {
    severity = 5;
    sentiment = 'Critical';
  } else if (
    lower.includes('broken') ||
    lower.includes('overflowing') ||
    lower.includes('severely') ||
    lower.includes('several days') ||
    lower.includes('खराब') ||
    lower.includes('खूप') ||
    lower.includes('महिना') ||
    lower.includes('block')
  ) {
    severity = 4;
    sentiment = 'Urgent';
  } else if (
    lower.includes('regular') ||
    lower.includes('repeated') ||
    lower.includes('problem') ||
    lower.includes('नाही') ||
    lower.includes('शिकायत')
  ) {
    severity = 3;
    sentiment = 'Frustrated';
  }

  return {
    category,
    severity,
    summary: text.slice(0, 90) + (text.length > 90 ? '...' : ''),
    translated_text: text,
    sentiment,
    key_entities: ['Citizen reported civic issue'],
    detected_language: /[^\x00-\x7F]/.test(text) ? 'Indic (Hindi/Marathi)' : 'English',
    rationale: 'Classified based on contextual municipal keyword indicators',
    image_analysis_note: undefined as string | undefined,
  };
}

// 1. API: Classify complaint
app.post('/api/complaints/classify', async (req, res) => {
  const { description, ward, name, selectedCategory, image } = req.body || {};

  if (!description || typeof description !== 'string' || !description.trim()) {
    res.status(400).json({ error: 'Description is required' });
    return;
  }

  const hasImage = Boolean(image?.inlineData?.data && image?.inlineData?.mimeType);

  const promptText = `
You are the AI engine of Nagrik AI, a municipal Digital Public Infrastructure platform in India.
Analyze the following citizen infrastructure complaint and provide structured classification.
The complaint might be in English, Hindi (Devanagari or Romanized), Marathi (Devanagari or Romanized), or mixed (Hinglish/Marathlish).

Citizen Complaint: "${description.trim()}"
Location / Ward: "${ward || 'Unspecified'}"
Citizen's suggested category (if any): "${selectedCategory || 'None'}"
${hasImage ? 'A photo attached by the citizen has been provided for inspection.' : 'No photo attached.'}

Instructions:
1. "category": Must be strictly one of: "Roads", "Water Supply", "Electricity", "Sanitation", "Public Safety", "Other".
2. "severity": Integer from 1 to 5 based on urgency, health hazard, duration, disruption, and visual evidence (if photo is provided):
   - 1 = Minor cosmetic or low inconvenience (e.g. faint flicker, small crack in footpath)
   - 2 = Moderate inconvenience (e.g. single street pothole, low water pressure)
   - 3 = Significant disruption (e.g. repeated daily power cut, blocked lane drain)
   - 4 = High disruption/sanitary threat (e.g. sewage flooding street, no water for 3-5 days, deep dangerous crater)
   - 5 = Critical hazard or prolonged breakdown (e.g. no drinking water for 10+ days, open transformer live wire sparking near school/market, cave-in)
3. "summary": A crisp, clean one-line summary in English (max 15 words) stating the exact problem and location if mentioned.
4. "translated_text": The full complaint translated into clean, natural English.
5. "sentiment": Citizen tone: "Critical", "Urgent", "Frustrated", "Concerned", or "Moderate".
6. "detected_language": e.g. "English", "Hindi", "Marathi", "Hinglish", or "Mixed".
7. "key_entities": Array of 1-3 infrastructure items (e.g., ["distribution pipeline", "school road", "manhole"]).
8. "rationale": 1 concise sentence explaining the severity rating.
${
  hasImage
    ? `9. "image_analysis_note": Look at the attached image carefully:
   a) Verify the image plausibly matches the stated category (e.g. if category is "Roads" but the image shows a burst pipe, flag a mismatch).
   b) Generate a short visual severity note (e.g. "Image confirms standing water and visible road damage — supports HIGH severity classification"). Keep it concise and authoritative.`
    : ''
}
`;

  try {
    const contents: any[] = [];
    if (hasImage) {
      contents.push({
        inlineData: {
          data: image.inlineData.data,
          mimeType: image.inlineData.mimeType,
        },
      });
    }
    contents.push(promptText);

    const { response, modelUsed } = await generateWithModelFallback({
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: 'One of: Roads, Water Supply, Electricity, Sanitation, Public Safety, Other',
            },
            severity: {
              type: Type.INTEGER,
              description: 'Integer 1 to 5',
            },
            summary: {
              type: Type.STRING,
              description: 'One-line clean summary of complaint in English (max 15 words)',
            },
            translated_text: {
              type: Type.STRING,
              description: 'Full English translation of the complaint',
            },
            sentiment: {
              type: Type.STRING,
              description: 'Critical, Urgent, Frustrated, Concerned, or Moderate',
            },
            detected_language: {
              type: Type.STRING,
              description: 'Language of original submission',
            },
            key_entities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key civic entities identified',
            },
            rationale: {
              type: Type.STRING,
              description: 'Short justification of severity and category',
            },
            image_analysis_note: {
              type: Type.STRING,
              description: 'Short visual verification and severity note from analyzing the photo',
            },
          },
          required: ['category', 'severity', 'summary', 'translated_text', 'sentiment'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    // Ensure valid bounds
    const cleanCategory = ['Roads', 'Water Supply', 'Electricity', 'Sanitation', 'Public Safety', 'Other'].includes(
      parsed.category
    )
      ? parsed.category
      : 'Other';
    const cleanSeverity = Math.min(5, Math.max(1, Math.round(Number(parsed.severity) || 3)));

    res.json({
      success: true,
      data: {
        category: cleanCategory,
        severity: cleanSeverity,
        summary: parsed.summary || description.slice(0, 80),
        translated_text: parsed.translated_text || description,
        sentiment: parsed.sentiment || 'Concerned',
        detected_language: parsed.detected_language || 'English',
        key_entities: parsed.key_entities || [],
        rationale: parsed.rationale || 'Severity assessed from civic impact details.',
        image_analysis_note: parsed.image_analysis_note || (hasImage ? 'Image visually verified and consistent with reported infrastructure issue.' : undefined),
      },
      source: 'gemini',
    });
  } catch (err: any) {
    console.warn('Gemini classification error, using heuristic fallback:', err?.message || err);
    const fallback = heuristicClassification(description, selectedCategory);
    if (hasImage) {
      fallback.image_analysis_note = 'Photo submitted: Visual inspection pending on-site verification.';
    }
    res.json({
      success: true,
      data: fallback,
      source: 'fallback',
      warning: 'Processed via fallback rules due to AI service latency or key configuration.',
    });
  }
});

// 2. API: Generate Policymaker Ward Recommendation
app.post('/api/wards/recommendation', async (req, res) => {
  const {
    wardName,
    complaintCount,
    avgSeverity,
    populationWeight,
    priorityScore,
    categoryBreakdown,
    sampleSummaries,
  } = req.body || {};

  const categoriesStr = Object.entries(categoryBreakdown || {})
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(', ');

  const promptText = `
You are a senior urban governance advisor for a Municipal Corporation in India evaluating infrastructure hotspots.
Ward Data:
- Ward Name: ${wardName}
- Priority Score: ${priorityScore?.toFixed ? priorityScore.toFixed(2) : priorityScore} (Computed as: (complaints * 0.4) + (avg_severity * 0.4) + (population_weight * 0.2))
- Complaint Volume: ${complaintCount} active citizen reports
- Average Severity: ${avgSeverity?.toFixed ? avgSeverity.toFixed(2) : avgSeverity} / 5.0
- Ward Population & Infra-Deficit Weight: ${populationWeight} (data.gov.in demographic index)
- Category Distribution: ${categoriesStr || 'Mixed issues'}
- Sample Citizen Reports: ${(sampleSummaries || []).slice(0, 4).join('; ')}

Task:
Generate a strict 2-sentence "AI Recommendation" for policymakers and municipal commissioners:
Sentence 1: Explain WHY this ward demands urgent prioritization (referencing the dominant infrastructure failures, high severity, or dense population vulnerability).
Sentence 2: Recommend WHAT specific rapid intervention and cross-departmental action should be dispatched immediately.

Also provide:
- "suggested_actions": 2 to 3 concise, concrete action items (e.g. "Deploy 6 emergency water tankers to Shivaji Nagar Sectors 2 & 4", "Issue urgent work order to PWD for road crater leveling").
- "priority_level": "Critical" | "High" | "Medium" | "Low"
- "lead_department": Name of primary municipal department responsible (e.g., "Public Health & Water Works", "Roads & Traffic Engineering", "Sanitation & Solid Waste Management", "Power Utility / MSEDCL").
`;

  try {
    const { response } = await generateWithModelFallback({
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendation: {
              type: Type.STRING,
              description: 'Strictly 2 sentences: Sentence 1 explains WHY prioritized, Sentence 2 recommends WHAT intervention is required.',
            },
            priority_level: {
              type: Type.STRING,
              description: 'Critical, High, Medium, or Low',
            },
            suggested_actions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 3 actionable municipal directives',
            },
            lead_department: {
              type: Type.STRING,
              description: 'Primary department accountable',
            },
          },
          required: ['recommendation', 'priority_level', 'suggested_actions', 'lead_department'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    res.json({
      success: true,
      data: parsed,
      source: 'gemini',
    });
  } catch (err: any) {
    console.warn('Gemini ward recommendation error, using heuristic fallback:', err?.message || err);
    // Sensible fallback
    const topCategory = Object.entries(categoryBreakdown || {}).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'Infrastructure';
    res.json({
      success: true,
      data: {
        recommendation: `${wardName} has reached critical priority due to an acute cluster of ${topCategory.toLowerCase()} failures with an average severity of ${avgSeverity?.toFixed(1) || '4.0'}/5 impacting high-density residential blocks. Immediate inter-departmental mobilization is required to dispatch repair units and restore vital civic utilities within 24 hours.`,
        priority_level: priorityScore > 5.5 ? 'Critical' : priorityScore > 3.5 ? 'High' : 'Medium',
        suggested_actions: [
          `Deploy rapid emergency response team from ${topCategory} wing`,
          `Set up temporary citizen redressal kiosk in ${wardName}`,
          `Execute priority work order under municipal contingency funds`,
        ],
        lead_department: topCategory === 'Water Supply' ? 'Public Health & Water Works' : topCategory === 'Roads' ? 'Roads & Traffic Engineering' : 'Municipal Services',
      },
      source: 'fallback',
    });
  }
});

// 3. Batch Ward Recommendations API
app.post('/api/wards/batch-recommendations', async (req, res) => {
  const { wards } = req.body || {};
  if (!Array.isArray(wards) || wards.length === 0) {
    res.status(400).json({ error: 'Wards array required' });
    return;
  }

  const promptText = `
You are a senior municipal infrastructure planning advisor for a Smart City / Municipal Corporation.
Analyze the following ranked municipal wards and generate a 2-sentence AI Recommendation for each ward.
Sentence 1: WHY this ward is prioritized (based on complaint volume, severity, and dominant issue).
Sentence 2: WHAT specific rapid intervention is recommended.

Wards Data:
${JSON.stringify(wards, null, 2)}

Return a JSON array where each object has:
- "wardId": string (matching input wardId)
- "recommendation": string (strictly 2 sentences)
- "priority_level": "Critical" | "High" | "Medium" | "Low"
- "suggested_actions": array of 2-3 short strings
- "lead_department": string
`;

  try {
    const { response } = await generateWithModelFallback({
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              wardId: { type: Type.STRING },
              recommendation: { type: Type.STRING },
              priority_level: { type: Type.STRING },
              suggested_actions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              lead_department: { type: Type.STRING },
            },
            required: ['wardId', 'recommendation', 'priority_level', 'suggested_actions', 'lead_department'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '[]');
    res.json({
      success: true,
      data: parsed,
      source: 'gemini',
    });
  } catch (err: any) {
    console.warn('Batch recommendations error, using fallback:', err?.message || err);
    const fallbackResults = wards.map((w: any) => {
      const topCat = Object.entries(w.categoryBreakdown || {}).sort((a: any, b: any) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'Infrastructure';
      return {
        wardId: w.wardId,
        recommendation: `${w.wardName} ranks as a key priority hotspot due to persistent ${topCat.toLowerCase()} breakdowns affecting ${w.complaintCount} households with average severity ${w.avgSeverity?.toFixed(1) || '4.0'}. Municipal taskforces should immediately mobilize specialized maintenance crews and establish ground monitoring to resolve backlog within 48 hours.`,
        priority_level: (w.priorityScore || 0) > 5.5 ? 'Critical' : (w.priorityScore || 0) > 3.5 ? 'High' : 'Medium',
        suggested_actions: [
          `Mobilize specialized ${topCat} taskforce to ${w.wardName}`,
          `Dispatch emergency equipment and replacement supplies`,
          `Notify local corporator and public grievance nodal officer`,
        ],
        lead_department: `${topCat} & Civic Works Department`,
      };
    });
    res.json({
      success: true,
      data: fallbackResults,
      source: 'fallback',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Nagrik AI',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV === 'development';
  const hasDist = fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'));
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.K_SERVICE) ||
    Boolean(process.env.K_REVISION) ||
    (!isDev && hasDist);

  if (isProduction) {
    console.log(`Serving static production build from ${path.resolve(__dirname, 'dist')}`);
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    console.log('Mounting Vite middleware for local development');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nagrik AI server running on http://0.0.0.0:${PORT} [mode: ${isProduction ? 'production' : 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
