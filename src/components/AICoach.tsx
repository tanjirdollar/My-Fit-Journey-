import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useFitnessData, getTodayDateStr } from '../context/FitnessDataContext';
import { CoachResponsePayload } from '../server/geminiService';
import {
  Bot,
  Sparkles,
  Send,
  Check,
  Bookmark,
  ShieldAlert,
  Loader2,
  BookmarkCheck,
  ChevronRight,
  TrendingDown,
  Info,
} from 'lucide-react';

export const AICoach: React.FC = () => {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const {
    nutritionLogs,
    exerciseLogs,
    activityLogs,
    bodyMeasurements,
    habitLogs,
    saveAICoachNote,
    aiCoachNotes,
  } = useFitnessData();

  const isBn = language === 'bn';
  const today = getTodayDateStr();

  // Input & state
  const [queryInput, setQueryInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [adviceResult, setAdviceResult] = useState<CoachResponsePayload | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute today's summary for coach context
  const todayNutrition = nutritionLogs.filter((n) => n.date === today);
  const totalCalories = todayNutrition.reduce((sum, n) => sum + (n.calories || 0), 0);
  const totalProtein = Number(todayNutrition.reduce((sum, n) => sum + (n.protein || 0), 0).toFixed(1));

  const todayActivity = activityLogs.find((a) => a.date === today) || {
    steps: 0,
    walkingDurationMinutes: 0,
    distanceKm: 0,
  };

  const todayHabit = habitLogs.find((h) => h.date === today) || {
    waterGlasses: 0,
    sittingBreaks: 0,
    walkingDone: false,
    exerciseDone: false,
    mealLogged: false,
    vegetableMet: false,
    sleepRoutineMet: false,
  };

  const todayExercises = exerciseLogs.filter((e) => e.date === today);
  const latestMeas = bodyMeasurements[bodyMeasurements.length - 1] || {
    weightKg: 63,
    waistCm: 88,
    bmi: 23.14,
    waistToHeightRatio: 0.533,
  };

  const quickPrompts = [
    t('coachPrompt1'),
    t('coachPrompt2'),
    t('coachPrompt3'),
    t('coachPrompt4'),
  ];

  const handleConsultCoach = async (promptText?: string) => {
    const textToSend = promptText || queryInput;
    if (!textToSend.trim() && !promptText) return;

    setLoading(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      const response = await fetch('/api/gemini/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: textToSend,
          language,
          userProfile: {
            age: profile.age,
            gender: profile.gender,
            heightCm: profile.heightCm,
            weightKg: latestMeas.weightKg,
            waistCm: latestMeas.waistCm,
            bmi: latestMeas.bmi,
            whtr: latestMeas.waistToHeightRatio,
            routine: 'Sedentary office/desk work, currently does not exercise regularly',
          },
          todaySummary: {
            calories: totalCalories,
            protein: totalProtein,
            steps: todayActivity.steps,
            walkingMinutes: todayActivity.walkingDurationMinutes,
            waterGlasses: todayHabit.waterGlasses,
            sittingBreaks: todayHabit.sittingBreaks,
            workoutsLogged: todayExercises.length,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data: CoachResponsePayload = await response.json();
      setAdviceResult(data);
      setQueryInput('');
    } catch (err) {
      console.error('Coach request failed:', err);
      setErrorMsg(
        isBn
          ? 'কোচের পরামর্শ পেতে কিছুটা বিলম্ব হচ্ছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
          : 'Unable to reach AI Coach right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToNotes = async () => {
    if (!adviceResult) return;
    await saveAICoachNote({
      date: today,
      focusArea: adviceResult.focusArea,
      advice: adviceResult.advice,
      actionItems: adviceResult.actionItems?.join('\n') || '',
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-700/80 border border-emerald-400/30 flex items-center justify-center text-white">
              <Bot className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-xs uppercase font-extrabold tracking-wider bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-200 border border-emerald-400/20">
              Gemini 3.8 Flash • Server-Side
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight font-display">
            {t('aiCoachTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl leading-relaxed">
            {isBn
              ? 'আপনার ৩৮ বছর বয়স, ১৬৫ সেমি উচ্চতা ও ৬৩ কেজি ওজন বজায় রেখে ৮৮ সেমি কোমর ধীরে ধীরে কমিয়ে ৮৫ ও ৮২.৫ সেমিতে আনার বাস্তবসম্মত নির্দেশনা।'
              : 'Practical, conservative lifestyle recommendations for gradual waistline reduction without extreme calorie cuts.'}
          </p>
        </div>

        <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
      </div>

      {/* Medical Safety Disclaimer */}
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span className="text-[11px]">{t('aiDisclaimer')}</span>
      </div>

      {/* Quick Prompts Selector */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
          {t('coachSuggestions')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleConsultCoach(prompt)}
              disabled={loading}
              className="p-3 text-left rounded-2xl bg-neutral-50 hover:bg-emerald-50/80 border border-neutral-200/70 hover:border-emerald-300 transition-all text-xs text-neutral-800 font-semibold group flex items-center justify-between"
            >
              <span className="line-clamp-2">{prompt}</span>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-700 group-hover:translate-x-1 shrink-0 ml-2 transition-transform" />
            </button>
          ))}
        </div>
      </div>

      {/* Free-form Input Form */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <h3 className="text-sm font-extrabold text-neutral-900 mb-2">
          {isBn ? 'আপনার নিজস্ব প্রশ্ন লিখুন' : 'Ask a Specific Health or Routine Question'}
        </h3>
        <p className="text-xs text-neutral-500 mb-3">
          {isBn
            ? 'খাবার, হাঁটার সময়, স্কোয়াট বা ডেস্কে বসার বিরতি নিয়ে আপনার যেকোনো দ্বিধা জানান।'
            : 'Ask about meal tweaks, walking timing, squat technique, or sitting breaks.'}
        </p>

        <div className="space-y-3">
          <textarea
            rows={3}
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder={
              isBn
                ? 'যেমন: দুপুরের খাবারে ভাত ও ডালের আদর্শ অনুপাত কত হওয়া উচিত?'
                : 'e.g. How should I pace my 30 minutes of daily walking around work hours?'
            }
            className="w-full p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">
              {isBn ? 'তথ্য সার্ভারের মাধ্যমে সুরক্ষিতভাবে বিশ্লেষিত হয়' : 'Secure server-side processing'}
            </span>

            <button
              onClick={() => handleConsultCoach()}
              disabled={loading || !queryInput.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('analyzing')}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('askButton')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Coach Advice Result Card */}
      {adviceResult && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-500/40 shadow-md animate-fade-in space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                {adviceResult.focusArea}
              </span>
              <h3 className="text-base sm:text-lg font-black text-neutral-900 mt-1.5 font-display">
                {isBn ? 'কোচের সুনির্দিষ্ট পরামর্শ' : 'Personalized Coach Recommendation'}
              </h3>
            </div>

            <button
              onClick={handleSaveToNotes}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
            >
              {savedSuccess ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{isBn ? 'সংরক্ষিত!' : 'Saved to Notes!'}</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isBn ? 'নোট রাখুন' : 'Save Advice'}</span>
                </>
              )}
            </button>
          </div>

          <div className="text-xs sm:text-sm text-neutral-800 leading-relaxed whitespace-pre-line bg-neutral-50/70 p-4 rounded-2xl border border-neutral-100">
            {adviceResult.advice}
          </div>

          {adviceResult.actionItems && adviceResult.actionItems.length > 0 && (
            <div>
              <div className="text-xs font-bold text-neutral-900 mb-2">
                {isBn ? 'আজকের জন্য করণীয় পদক্ষেপসমূহ:' : 'Key Action Steps for Today:'}
              </div>
              <ul className="space-y-1.5 text-xs text-neutral-700">
                {adviceResult.actionItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Saved Coach Notes History */}
      {aiCoachNotes.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
          <h3 className="text-sm font-extrabold text-neutral-900 mb-3">
            {isBn ? 'পূর্বে সংরক্ষিত কোচের পরামর্শ' : 'Previously Saved Coach Advice'}
          </h3>

          <div className="space-y-3">
            {aiCoachNotes.map((note) => (
              <div
                key={note.id}
                className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/70 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                  <span className="font-bold text-emerald-800 uppercase tracking-wider">
                    {note.focusArea}
                  </span>
                  <span>{note.date}</span>
                </div>
                <div className="text-neutral-800 leading-relaxed">{note.advice}</div>
                {note.actionItems && (
                  <div className="text-[11px] text-neutral-600 pt-1 border-t border-neutral-200/40">
                    <strong className="text-neutral-700">Actions:</strong> {note.actionItems}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
