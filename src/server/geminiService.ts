import { GoogleGenAI } from '@google/genai';

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

export async function generateCoachAdvice(payload: CoachRequestPayload): Promise<CoachResponsePayload> {
  const apiKey = process.env.GEMINI_API_KEY;
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
