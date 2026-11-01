import { createRequire } from 'module';
import type {
  AIFoodComponent,
  AIFoodConfidence,
  AIFoodRecognitionResult,
} from '../types/index.ts';
import { logFoodRecognitionDiagnostic } from './firebaseAdmin.ts';

if (typeof (globalThis as any).require === 'undefined') {
  (globalThis as any).require = createRequire(import.meta.url);
}

let cachedGenAiModule: typeof import('@google/genai') | null = null;
async function getGenAiSdk(): Promise<typeof import('@google/genai')> {
  if (!cachedGenAiModule) {
    cachedGenAiModule = await import('@google/genai');
  }
  return cachedGenAiModule;
}

export interface CoachRequestPayload {
  userQuery?: string;
  language?: 'en' | 'bn';
  userProfile?: {
    age: number;
    gender: string;
    heightCm: number;
    weightKg: number;
    waistCm: number;
    bmi: number;
    whtr: number;
    routine: string;
  };
  todaySummary?: {
    calories: number;
    protein: number;
    steps: number;
    walkingMinutes: number;
    waterGlasses: number;
    sittingBreaks: number;
    workoutsLogged: number;
  };
}

export interface CoachResponsePayload {
  focusArea: string;
  advice: string;
  actionItems: string[];
}

export async function generateCoachAdvice(
  payload: CoachRequestPayload
): Promise<CoachResponsePayload> {
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY ||
    ''
  ).trim();
  const isBn = payload.language === 'bn';

  if (!apiKey) {
    // Provide high-quality expert lifestyle guidance if key is not configured yet
    if (isBn) {
      return {
        focusArea: 'কোমরের মেদ কমানো ও সক্রিয় রুটিন',
        advice:
          'আপনার উচ্চতা ১৬৫ সেমি এবং ওজন ৬৩ কেজি অনুযায়ী বিএমআই ২৩.১৪ (স্বাভাবিক সীমার মধ্যে)। তবে কোমরের মাপ ৮৮ সেমি হওয়ায় কোমর ও উচ্চতার অনুপাত (WHtR) ০.৫৩৩, যা পেটের অভ্যন্তরীণ ভিসেরাল ফ্যাট নির্দেশ করে। আপনার লক্ষ্য ওজন কমানো নয়, বরং পেটের মেদ কমিয়ে কোমরকে পর্যায়ক্রমে ৮৫ সেমি এবং পরবর্তীতে ৮২.৫ সেমির নিচে নিয়ে আসা। এজন্য প্রতিদিন খাবারের পর ১০-১৫ মিনিট করে দিনে মোট ৩০-৪০ মিনিট হাঁটুন, ভাত পরিমিত রেখে ডাল, ডিম ও শাকসবজি বাড়ান এবং প্রতি ঘণ্টায় চেয়ার ছেড়ে ২ মিনিট দাঁড়ান।',
        actionItems: [
          'প্রতিদিন খাবারের পর অন্তত ১০-১৫ মিনিট সক্রিয় হাঁটা',
          'সপ্তাহে ৩ দিন বডিওয়েট স্কোয়াট, ইনক্লাইন পুশ-আপ ও ৩০ সেকেন্ড প্ল্যাঙ্ক হোল্ড',
          'খাবারে প্রোটিন (ডিম, মাছ, মসুর ডাল) নিশ্চিত করা ও তেল কমানো',
          'সারাদিন ডেস্কে বসে কাজ করার সময় প্রতি ঘণ্টায় বসার বিরতি নেওয়া',
        ],
      };
    }
    return {
      focusArea: 'Waist Circumference & Core Muscle Preservation',
      advice:
        'At 165 cm and 63 kg, your BMI of 23.14 is within normal weight range. However, your waist circumference of 88 cm results in a waist-to-height ratio (WHtR) of ~0.533, indicating mild central/visceral adiposity. The goal is body recomposition—not aggressive weight loss. Target gradually reducing waist to 85 cm and eventually <82.5 cm (WHtR <0.50). Focus on daily 30-40 min walking, 70-80g protein, hourly desk breaks, and bodyweight squats/planks 3x/week.',
      actionItems: [
        'Accumulate 30-40 minutes of brisk walking daily, especially after main meals',
        'Incorporate 3 weekly sessions of bodyweight squats (3x12), push-ups, and planks (3x30s)',
        'Ensure 70-80g daily protein (fish, eggs, lentils) to preserve lean mass while trimming waist',
        'Take a 2-minute standing/walking break for every 50 minutes of seated desk work',
      ],
    };
  }

  const { GoogleGenAI } = await getGenAiSdk();
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const profile = payload.userProfile || {
    age: 38,
    gender: 'male',
    heightCm: 165,
    weightKg: 63,
    waistCm: 88,
    bmi: 23.14,
    whtr: 0.533,
    routine: 'Sedentary desk work',
  };

  const summary = payload.todaySummary || {
    calories: 0,
    protein: 0,
    steps: 0,
    walkingMinutes: 0,
    waterGlasses: 0,
    sittingBreaks: 0,
    workoutsLogged: 0,
  };

  const systemInstruction = `You are a conservative, practical, and empathetic AI Health and Lifestyle Coach for 'MyFit Journey'.
The client is a 38-year-old male.
Baseline measurements:
- Height: 165 cm
- Current Weight: 63 kg (Normal BMI ~23.14)
- Current Waist Circumference: 88 cm
- Waist-to-Height Ratio (WHtR): 0.533 (elevated visceral adiposity risk)
- Target: Reduce waist toward 85 cm, and ultimately < 82.5 cm (WHtR < 0.50) WITHOUT aggressive weight loss (preserve 63 kg lean mass).
- Occupation: Sedentary desk work, currently low exercise baseline.
- Plan: Build up to 30-40 minutes daily walking, 3x/week strength/core routine (squats, push-ups, plank, glute bridge, stretching), 70-80g dietary protein, high vegetables/shak, hourly sitting breaks, 2.5L water.

CRITICAL RULES:
1. NEVER diagnose diseases or prescribe medications.
2. NEVER invent missing measurements.
3. Be culturally familiar with Bengali nutrition (cooked rice, roti, rui fish, masoor dal, leafy greens/palong shak, eggs, avoiding excess mustard oil/fried singara/paratha).
4. If language is 'bn', respond in fluent, warm, correct Bengali (বাংলা). If 'en', respond in clear English.
5. Provide actionable, practical advice and return a clean structured response with:
- focusArea (short title)
- advice (2-3 concise paragraphs, encouraging and conservative)
- actionItems (3-4 bullet action items)`;

  const prompt = `Client request/query: "${payload.userQuery || 'Please review my current progress and provide targeted lifestyle guidance for today.'}"
Client status:
- Profile: Age ${profile.age}, ${profile.gender}, Height ${profile.heightCm}cm, Weight ${profile.weightKg}kg, Waist ${profile.waistCm}cm (WHtR: ${profile.whtr})
- Today's logged metrics: Calories: ${summary.calories} kcal, Protein: ${summary.protein}g, Steps: ${summary.steps}, Walking: ${summary.walkingMinutes} mins, Water: ${summary.waterGlasses} glasses, Sitting Breaks: ${summary.sittingBreaks}, Strength Workouts: ${summary.workoutsLogged}
- Preferred Language: ${isBn ? 'Bengali (বাংলা)' : 'English'}

Provide your response in JSON format with keys:
"focusArea": string,
"advice": string,
"actionItems": string[]
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    return {
      focusArea: parsed.focusArea || (isBn ? 'জীবনধারা পরামর্শ' : 'Lifestyle Guidance'),
      advice: parsed.advice || text,
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    };
  } catch (error) {
    console.error('Gemini generation error:', error);
    if (isBn) {
      return {
        focusArea: 'কোমরের মেদ কমানো ও দৈনিক রুটিন',
        advice:
          'আপনার বর্তমান ওজন ৬৩ কেজি বজায় রেখে পেটের চর্বি কমানোর মূল চাবিকাঠি হলো প্রতিদিন ৩০-৪০ মিনিট হাঁটা এবং খাবারে পর্যাপ্ত প্রোটিন ও শাকসবজি রাখা। ডেস্কে একটানা বসে না থেকে প্রতি ঘণ্টায় একটু হেঁটে আসুন।',
        actionItems: [
          'প্রতিদিন ৩০ মিনিট স্বাভাবিক বা দ্রুত হাঁটা',
          'খাবারে অতিরিক্ত ভাত কমিয়ে ডাল, ডিম বা মাছের পরিমাণ বাড়ানো',
          'প্রতি ঘণ্টায় চেয়ার ছেড়ে ২ মিনিটের জন্য দাঁড়ানো',
        ],
      };
    }
    return {
      focusArea: 'Waistline & Daily Habit Focus',
      advice:
        'Focus on regular brisk walking, maintaining your current weight around 63 kg while tightening the abdominal wall with planks and squats. Stay consistent with sitting breaks and adequate hydration.',
      actionItems: [
        'Complete 30-40 minutes of daily walking',
        'Add 12 squats and a 30s plank hold to your daily routine',
        'Drink a glass of water every 1.5 to 2 hours during desk work',
      ],
    };
  }
}

// ============================================================================
// AI Food Recognition (Server-Side Gemini Vision Analysis)
// ============================================================================

export interface FoodImageAnalysisRequest {
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  language?: 'en' | 'bn';
  correlationId?: string;
}

const DEFAULT_DISCLAIMER_BN =
  'সতর্কতা: কেবল ছবির ওপর ভিত্তি করে রান্নার তেল, চিনি, লুকানো উপাদান এবং খাবারের প্রকৃত ওজন শতভাগ নিখুঁতভাবে নির্ধারণ করা কঠিন। সংরক্ষণের আগে প্রয়োজনে পরিমাণ ও পুষ্টিমান সম্পাদনা করে নিন।';

const DEFAULT_DISCLAIMER_EN =
  'Note: Cooking oil, added sugar, hidden ingredients, and actual serving weight are difficult to determine from an image alone. Please review and adjust the values before saving.';

function clampNum(val: unknown, min: number, max: number, decimals = 1): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return min;
  const clamped = Math.max(min, Math.min(max, num));
  return decimals === 0 ? Math.round(clamped) : Number(clamped.toFixed(decimals));
}

/**
 * Normalizes and validates raw AI JSON output into a strict AIFoodRecognitionResult.
 * Ensures that unclear/non-food images never invent nutritional values, and mixed
 * meal components sum accurately.
 */
export function normalizeFoodRecognitionResult(raw: unknown): AIFoodRecognitionResult {
  const data = raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};

  const isFood = Boolean(data.isFood);
  const isBlurryOrDark = Boolean(data.isBlurryOrDark);

  const validConfidences: AIFoodConfidence[] = ['high', 'medium', 'low', 'unrecognized'];
  let confidenceLevel: AIFoodConfidence = validConfidences.includes(data.confidenceLevel)
    ? data.confidenceLevel
    : isFood && !isBlurryOrDark
    ? 'medium'
    : 'unrecognized';

  if (!isFood || isBlurryOrDark) {
    if (confidenceLevel === 'high' || confidenceLevel === 'medium') {
      confidenceLevel = isFood ? 'low' : 'unrecognized';
    }
  }

  // If image is not food or confidence is unrecognized, NEVER invent nutritional values
  const isUnclearOrUnrecognized = !isFood || confidenceLevel === 'unrecognized';

  const rawComponents = Array.isArray(data.components) ? data.components : [];
  const components: AIFoodComponent[] = isUnclearOrUnrecognized
    ? []
    : rawComponents
        .filter((c: any) => c && (c.nameBn || c.nameEn))
        .map((c: any, idx: number) => ({
          id:
            typeof c.id === 'string' && c.id.trim()
              ? c.id.trim()
              : `comp_${idx + 1}_${Date.now()}`,
          nameBn:
            typeof c.nameBn === 'string' && c.nameBn.trim()
              ? c.nameBn.trim()
              : typeof c.nameEn === 'string'
              ? c.nameEn.trim()
              : `উপাদান ${idx + 1}`,
          nameEn:
            typeof c.nameEn === 'string' && c.nameEn.trim()
              ? c.nameEn.trim()
              : typeof c.nameBn === 'string'
              ? c.nameBn.trim()
              : `Component ${idx + 1}`,
          estimatedGrams: clampNum(c.estimatedGrams, 1, 3000, 0),
          calories: clampNum(c.calories, 0, 5000, 0),
          protein: clampNum(c.protein, 0, 500, 1),
          carbs: clampNum(c.carbs, 0, 1000, 1),
          fat: clampNum(c.fat, 0, 500, 1),
          fiber: clampNum(c.fiber, 0, 200, 1),
        }));

  // Calculate totals from components when multiple components are identified
  let estimatedServingGrams = isUnclearOrUnrecognized
    ? 0
    : clampNum(data.estimatedServingGrams, 0, 5000, 0);
  let calories = isUnclearOrUnrecognized ? 0 : clampNum(data.calories, 0, 5000, 0);
  let protein = isUnclearOrUnrecognized ? 0 : clampNum(data.protein, 0, 500, 1);
  let carbs = isUnclearOrUnrecognized ? 0 : clampNum(data.carbs, 0, 1000, 1);
  let fat = isUnclearOrUnrecognized ? 0 : clampNum(data.fat, 0, 500, 1);
  let fiber = isUnclearOrUnrecognized ? 0 : clampNum(data.fiber, 0, 200, 1);

  if (!isUnclearOrUnrecognized && components.length > 0) {
    const sumGrams = components.reduce((acc, c) => acc + c.estimatedGrams, 0);
    const sumCalories = components.reduce((acc, c) => acc + c.calories, 0);
    const sumProtein = Number(
      components.reduce((acc, c) => acc + c.protein, 0).toFixed(1)
    );
    const sumCarbs = Number(
      components.reduce((acc, c) => acc + c.carbs, 0).toFixed(1)
    );
    const sumFat = Number(components.reduce((acc, c) => acc + c.fat, 0).toFixed(1));
    const sumFiber = Number(
      components.reduce((acc, c) => acc + c.fiber, 0).toFixed(1)
    );

    if (sumGrams > 0) estimatedServingGrams = clampNum(sumGrams, 1, 5000, 0);
    if (sumCalories > 0) calories = clampNum(sumCalories, 0, 5000, 0);
    protein = clampNum(sumProtein, 0, 500, 1);
    carbs = clampNum(sumCarbs, 0, 1000, 1);
    fat = clampNum(sumFat, 0, 500, 1);
    fiber = clampNum(sumFiber, 0, 200, 1);
  }

  const foodNameBn = isUnclearOrUnrecognized
    ? typeof data.foodNameBn === 'string' && data.foodNameBn.trim()
      ? data.foodNameBn.trim()
      : 'অস্পষ্ট বা অশনাক্তকৃত খাবার'
    : typeof data.foodNameBn === 'string' && data.foodNameBn.trim()
    ? data.foodNameBn.trim()
    : 'বাংলাদেশী খাবার';

  const foodNameEn = isUnclearOrUnrecognized
    ? typeof data.foodNameEn === 'string' && data.foodNameEn.trim()
      ? data.foodNameEn.trim()
      : 'Unrecognized or Unclear Image'
    : typeof data.foodNameEn === 'string' && data.foodNameEn.trim()
    ? data.foodNameEn.trim()
    : 'Bangladeshi Meal';

  const rawNotesBn =
    typeof data.assumptionsAndNotesBn === 'string' ? data.assumptionsAndNotesBn.trim() : '';
  const rawNotesEn =
    typeof data.assumptionsAndNotesEn === 'string' ? data.assumptionsAndNotesEn.trim() : '';

  const assumptionsAndNotesBn = rawNotesBn
    ? rawNotesBn.includes('তেল') && rawNotesBn.includes('ওজন')
      ? rawNotesBn
      : `${rawNotesBn} (${DEFAULT_DISCLAIMER_BN})`
    : DEFAULT_DISCLAIMER_BN;

  const assumptionsAndNotesEn = rawNotesEn
    ? rawNotesEn.toLowerCase().includes('oil') && rawNotesEn.toLowerCase().includes('weight')
      ? rawNotesEn
      : `${rawNotesEn} (${DEFAULT_DISCLAIMER_EN})`
    : DEFAULT_DISCLAIMER_EN;

  const qualityWarningBn =
    typeof data.qualityWarningBn === 'string' && data.qualityWarningBn.trim()
      ? data.qualityWarningBn.trim()
      : isBlurryOrDark
      ? 'ছবিটি ঝাপসা বা অন্ধকার হওয়ায় খাবারটি সঠিকভাবে চেনা যায়নি। অনুগ্রহ করে পর্যাপ্ত আলোতে পরিষ্কার ছবি তুলুন অথবা নিচে নিজ হাতে খাবারের তথ্য লিখুন।'
      : !isFood || confidenceLevel === 'unrecognized'
      ? 'ছবিতে কোনো স্পষ্ট খাবার শনাক্ত করা যায়নি। কোনো কাল্পনিক পুষ্টিমান যোগ করা হয়নি। আপনি চাইলে ম্যানুয়ালি খাবারের নাম ও পুষ্টিমান লিখতে পারেন।'
      : confidenceLevel === 'low'
      ? 'ছবিটি থেকে খাবারের পরিমাণ ও উপাদান সম্পর্কে কম নিশ্চয়তা পাওয়া গেছে। সংরক্ষণের আগে মানগুলো যাচাই করুন।'
      : undefined;

  const qualityWarningEn =
    typeof data.qualityWarningEn === 'string' && data.qualityWarningEn.trim()
      ? data.qualityWarningEn.trim()
      : isBlurryOrDark
      ? 'The image appears blurry or too dark to identify reliably. Please retake the photo in good lighting or enter the nutrition values manually below.'
      : !isFood || confidenceLevel === 'unrecognized'
      ? 'Could not confidently identify food in this image. No nutritional values were invented. You may enter the meal details manually below.'
      : confidenceLevel === 'low'
      ? 'Low confidence prediction due to visual ambiguity. Please double-check and edit the estimated values before saving.'
      : undefined;

  return {
    isFood,
    isBlurryOrDark,
    confidenceLevel,
    foodNameBn,
    foodNameEn,
    components,
    estimatedServingGrams,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    assumptionsAndNotesBn,
    assumptionsAndNotesEn,
    qualityWarningBn,
    qualityWarningEn,
  };
}

export class FoodRecognitionServiceError extends Error {
  statusCode: number;
  code: string;
  category:
    | 'GEMINI_CONFIG_FAILURE'
    | 'RATE_LIMIT_EXCEEDED'
    | 'GEMINI_SERVICE_UNAVAILABLE'
    | 'INVALID_AI_RESPONSE'
    | 'UNKNOWN_SERVER_ERROR';
  stage: 'GEMINI_API_REQUEST' | 'GEMINI_RESPONSE_PARSING';
  messageBn: string;

  constructor(options: {
    messageEn: string;
    messageBn: string;
    statusCode: number;
    code: string;
    category:
      | 'GEMINI_CONFIG_FAILURE'
      | 'RATE_LIMIT_EXCEEDED'
      | 'GEMINI_SERVICE_UNAVAILABLE'
      | 'INVALID_AI_RESPONSE'
      | 'UNKNOWN_SERVER_ERROR';
    stage: 'GEMINI_API_REQUEST' | 'GEMINI_RESPONSE_PARSING';
  }) {
    super(options.messageEn);
    this.name = 'FoodRecognitionServiceError';
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.category = options.category;
    this.stage = options.stage;
    this.messageBn = options.messageBn;
  }
}

export function extractJsonFromModelText(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) return '';

  // Strip ```json ... ``` or ``` ... ``` markdown fences if present
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export async function analyzeFoodImage(
  request: FoodImageAnalysisRequest
): Promise<AIFoodRecognitionResult> {
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY ||
    ''
  ).trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new FoodRecognitionServiceError({
      messageEn:
        'Gemini API configuration failure: GEMINI_API_KEY is missing or not configured on the server.',
      messageBn:
        'সার্ভারে Gemini API Key কনফিগার করা নেই। অনুগ্রহ করে সার্ভার এনভায়রনমেন্টে GEMINI_API_KEY সেট করুন অথবা ম্যানুয়ালি খাবারের তথ্য লিখুন।',
      statusCode: 500,
      code: 'GEMINI_CONFIG_ERROR',
      category: 'GEMINI_CONFIG_FAILURE',
      stage: 'GEMINI_API_REQUEST',
    });
  }

  if (request.correlationId) {
    logFoodRecognitionDiagnostic({
      correlationId: request.correlationId,
      stage: 'GEMINI_API_REQUEST',
      statusCode: 200,
      category: 'NONE',
      code: 'GEMINI_REQUEST_STARTED',
      message: 'Dispatching food image analysis request to Gemini API.',
      meta: { mimeType: request.mimeType },
    });
  }

  const { GoogleGenAI, Type } = await getGenAiSdk();
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const systemInstruction = `You are an expert Bangladeshi & South Asian Clinical Nutritionist and Food Vision Analyst for the 'MyFit Journey' application.
Your task is to analyze a photo of food and return accurate, conservative, structured nutritional estimates in both Bengali (বাংলা) and English.

CRITICAL GUIDELINES:
1. BANGLADESHI & BENGALI MEAL EXPERTISE:
   - Accurately recognize Bangladeshi staples and dishes: সাদা ভাত (Steamed White Rice), লাল চালের ভাত (Brown/Red Rice), আটার রুটি (Whole Wheat Roti/Chapati), পরোটা (Paratha), ভুনা খিচুড়ি বা পাতলা খিচুড়ি (Khichuri), রুই/কাতলা/ইলিশ/তেলাপিয়া/পাঙ্গাশ মাছের ঝোল বা ভাজা (Fish Curry / Fried Fish), মুরগির ঝোল/ভুনা (Chicken Curry), গরুর মাংস ভুনা (Beef Bhuna), মসুর ডাল (Masoor Dal), ডিম সিদ্ধ/ভাজি/ভুনা (Egg Boiled/Omelette/Curry), শাক ভাজি (Leafy Greens like Palong/Lal Shak), আলু/বেগুন/শিম/মাছ ভর্তা (Bhorta), মিক্সড সবজি (Mixed Labra/Bhaji), সিঙ্গারা/সমুচা/পুরি (Snacks), টক দই/মিষ্টি দই (Yogurt), ফল ও সালাদ.
2. MIXED MEAL COMPONENT BREAKDOWN:
   - When a plate contains multiple items (e.g., rice, fish curry, and vegetables; khichuri with egg; roti with chicken curry; dal, rice, and fried fish), you MUST identify each individual component separately in the "components" array.
   - Estimate the weight in grams (estimatedGrams) and nutritional breakdown (calories, protein, carbs, fat, fiber) for EACH component.
   - Sum the components so that top-level estimatedServingGrams, calories, protein, carbs, fat, and fiber match the sum of all identified components.
   - Even for a single food item, include 1 entry in "components" representing that item (or its main ingredients).
3. UNCLEAR, BLURRY, DARK, OR NON-FOOD IMAGES:
   - If the image is too blurry, too dark, obstructed, or does NOT show food:
     - Set "isFood": false (if non-food) or "isBlurryOrDark": true (if blurry/dark).
     - Set "confidenceLevel": "unrecognized" (or "low" if barely visible).
     - NEVER invent nutritional values when the image cannot be confidently identified! Set estimatedServingGrams: 0, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, and components: [] when unrecognized.
     - Explain the issue clearly in "qualityWarningBn" and "qualityWarningEn" so the user can enter values manually or retake the photo.
4. HONEST ASSUMPTIONS & LIMITATIONS DISCLAIMER:
   - In "assumptionsAndNotesBn" and "assumptionsAndNotesEn", explain your portion assumptions (e.g., standard medium dinner plate, moderate home-style oil) AND explicitly state that cooking oil, added sugar, hidden ingredients, and actual serving weight are difficult to determine from an image alone.`;

  const prompt = `Analyze this food image carefully.
Identify the dish or mixed meal in both Bengali (foodNameBn) and English (foodNameEn).
Break down all visible food items/components on the plate with their estimated gram weights and macronutrients (calories, protein, carbs, fat, fiber).
Return the analysis strictly following the JSON schema.`;

  const candidateModels = [
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-3.8-flash',
  ];

  let response: any = null;
  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              mimeType: request.mimeType,
              data: request.imageBase64,
            },
          },
          {
            text: prompt,
          },
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isFood: {
                type: Type.BOOLEAN,
                description:
                  'True if the image contains recognizable food or beverage.',
              },
              isBlurryOrDark: {
                type: Type.BOOLEAN,
                description:
                  'True if the image is too blurry, dark, or unclear for reliable analysis.',
              },
              confidenceLevel: {
                type: Type.STRING,
                enum: ['high', 'medium', 'low', 'unrecognized'],
                description:
                  'Confidence level of the food identification and portion estimate.',
              },
              foodNameBn: {
                type: Type.STRING,
                description:
                  'Overall meal or food name in Bengali (e.g., সাদা ভাত, রুই মাছের ঝোল ও শাক ভাজি).',
              },
              foodNameEn: {
                type: Type.STRING,
                description:
                  'Overall meal or food name in English (e.g., Steamed Rice, Rui Fish Curry & Spinach Stir-Fry).',
              },
              components: {
                type: Type.ARRAY,
                description:
                  'Individual food components identified in the meal.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nameBn: {
                      type: Type.STRING,
                      description: 'Component name in Bengali.',
                    },
                    nameEn: {
                      type: Type.STRING,
                      description: 'Component name in English.',
                    },
                    estimatedGrams: {
                      type: Type.NUMBER,
                      description:
                        'Estimated serving weight of this component in grams.',
                    },
                    calories: {
                      type: Type.NUMBER,
                      description:
                        'Estimated calories (kcal) for this component.',
                    },
                    protein: {
                      type: Type.NUMBER,
                      description:
                        'Estimated protein in grams for this component.',
                    },
                    carbs: {
                      type: Type.NUMBER,
                      description:
                        'Estimated carbohydrates in grams for this component.',
                    },
                    fat: {
                      type: Type.NUMBER,
                      description: 'Estimated fat in grams for this component.',
                    },
                    fiber: {
                      type: Type.NUMBER,
                      description:
                        'Estimated dietary fiber in grams for this component.',
                    },
                  },
                  required: [
                    'nameBn',
                    'nameEn',
                    'estimatedGrams',
                    'calories',
                    'protein',
                    'carbs',
                    'fat',
                    'fiber',
                  ],
                },
              },
              estimatedServingGrams: {
                type: Type.NUMBER,
                description:
                  'Total estimated serving weight in grams across all components.',
              },
              calories: {
                type: Type.NUMBER,
                description: 'Total estimated calories (kcal).',
              },
              protein: {
                type: Type.NUMBER,
                description: 'Total estimated protein in grams.',
              },
              carbs: {
                type: Type.NUMBER,
                description: 'Total estimated carbohydrates in grams.',
              },
              fat: {
                type: Type.NUMBER,
                description: 'Total estimated fat in grams.',
              },
              fiber: {
                type: Type.NUMBER,
                description: 'Total estimated dietary fiber in grams.',
              },
              assumptionsAndNotesBn: {
                type: Type.STRING,
                description:
                  'Assumptions and visual estimation notes in Bengali, explicitly mentioning that cooking oil, sugar, hidden ingredients, and actual serving weight are difficult to determine from an image alone.',
              },
              assumptionsAndNotesEn: {
                type: Type.STRING,
                description:
                  'Assumptions and visual estimation notes in English, explicitly mentioning that cooking oil, sugar, hidden ingredients, and actual serving weight are difficult to determine from an image alone.',
              },
              qualityWarningBn: {
                type: Type.STRING,
                description:
                  'Optional warning in Bengali if the image is blurry, dark, low-confidence, or non-food.',
              },
              qualityWarningEn: {
                type: Type.STRING,
                description:
                  'Optional warning in English if the image is blurry, dark, low-confidence, or non-food.',
              },
            },
            required: [
              'isFood',
              'isBlurryOrDark',
              'confidenceLevel',
              'foodNameBn',
              'foodNameEn',
              'components',
              'estimatedServingGrams',
              'calories',
              'protein',
              'carbs',
              'fat',
              'fiber',
              'assumptionsAndNotesBn',
              'assumptionsAndNotesEn',
            ],
          },
        },
      });
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      const status = typeof err?.status === 'number' ? err.status : 0;
      const rawMsg = err instanceof Error ? err.message : String(err);
      const lowerMsg = rawMsg.toLowerCase();
      // If 404, 429 rate limit, or 500/503 unavailable on primary model, try fallback model
      const isRetryableOnFallback =
        status === 404 ||
        status === 429 ||
        status === 503 ||
        status === 500 ||
        lowerMsg.includes('not found') ||
        lowerMsg.includes('no longer available') ||
        lowerMsg.includes('resource_exhausted') ||
        lowerMsg.includes('quota') ||
        lowerMsg.includes('unavailable') ||
        lowerMsg.includes('overloaded');
      if (!isRetryableOnFallback) {
        break;
      }
    }
  }

  if (lastError || !response) {
    const err = lastError;
    const status = typeof err?.status === 'number' ? err.status : 0;
    const rawMsg = err instanceof Error ? err.message : String(err);
    const lowerMsg = rawMsg.toLowerCase();

    if (
      status === 400 ||
      status === 401 ||
      status === 403 ||
      lowerMsg.includes('api_key_invalid') ||
      lowerMsg.includes('api key not valid') ||
      lowerMsg.includes('permission_denied')
    ) {
      throw new FoodRecognitionServiceError({
        messageEn:
          'Gemini API configuration error: The server API key or model configuration was rejected.',
        messageBn:
          'সার্ভারের Gemini API কনফিগারেশন বা API Key সঠিক নয়। অনুগ্রহ করে অ্যাডমিন সেটিংস যাচাই করুন বা ম্যানুয়ালি খাবারের তথ্য লিখুন।',
        statusCode: 500,
        code: 'GEMINI_CONFIG_ERROR',
        category: 'GEMINI_CONFIG_FAILURE',
        stage: 'GEMINI_API_REQUEST',
      });
    }

    if (
      status === 429 ||
      lowerMsg.includes('resource_exhausted') ||
      lowerMsg.includes('quota') ||
      lowerMsg.includes('rate limit')
    ) {
      throw new FoodRecognitionServiceError({
        messageEn:
          'Gemini API rate limit exceeded. Please wait a moment and try again, or enter meal details manually.',
        messageBn:
          'এআই সার্ভিসের অনুরোধের সীমা (Rate Limit) অতিক্রম করেছে। কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন অথবা ম্যানুয়ালি খাবারের তথ্য লিখুন।',
        statusCode: 429,
        code: 'GEMINI_RATE_LIMIT',
        category: 'RATE_LIMIT_EXCEEDED',
        stage: 'GEMINI_API_REQUEST',
      });
    }

    throw new FoodRecognitionServiceError({
      messageEn:
        'Gemini AI vision service is temporarily unavailable. Please try again shortly or enter values manually.',
      messageBn:
        'এআই ছবি বিশ্লেষণ সেবা সাময়িকভাবে অনুপলব্ধ। অনুগ্রহ করে একটু পর আবার চেষ্টা করুন বা ম্যানুয়ালি খাবারের তথ্য লিখুন।',
      statusCode: 503,
      code: 'GEMINI_SERVICE_UNAVAILABLE',
      category: 'GEMINI_SERVICE_UNAVAILABLE',
      stage: 'GEMINI_API_REQUEST',
    });
  }

  if (request.correlationId) {
    logFoodRecognitionDiagnostic({
      correlationId: request.correlationId,
      stage: 'GEMINI_RESPONSE_PARSING',
      statusCode: 200,
      category: 'NONE',
      code: 'PARSING_STARTED',
      message: 'Parsing structured JSON nutrition output from Gemini.',
    });
  }

  const rawText = typeof response?.text === 'string' ? response.text : '';
  const cleanedJsonText = extractJsonFromModelText(rawText);
  if (!cleanedJsonText) {
    throw new FoodRecognitionServiceError({
      messageEn:
        'Invalid AI response: Gemini returned an empty response for this image. Please try another photo or enter values manually.',
      messageBn:
        'এআই থেকে কোনো বৈধ ফলাফল পাওয়া যায়নি (Empty Response)। অনুগ্রহ করে পরিষ্কার আলোতে তোলা ছবি দিন অথবা ম্যানুয়ালি তথ্য লিখুন।',
      statusCode: 502,
      code: 'INVALID_AI_RESPONSE',
      category: 'INVALID_AI_RESPONSE',
      stage: 'GEMINI_RESPONSE_PARSING',
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedJsonText);
  } catch {
    throw new FoodRecognitionServiceError({
      messageEn:
        'Invalid AI response: Failed to parse structured nutrition JSON from Gemini.',
      messageBn:
        'এআই-এর উত্তর সঠিকভাবে বিশ্লেষণ করা যায়নি (Invalid AI JSON)। অনুগ্রহ করে পুনরায় চেষ্টা করুন বা ম্যানুয়ালি তথ্য লিখুন।',
      statusCode: 502,
      code: 'INVALID_AI_RESPONSE',
      category: 'INVALID_AI_RESPONSE',
      stage: 'GEMINI_RESPONSE_PARSING',
    });
  }

  return normalizeFoodRecognitionResult(parsed);
}

