import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  Target,
  User,
  ShieldCheck,
  Check,
  Scale,
  Flame,
  Dumbbell,
  Droplets,
  Footprints,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

export const GoalsSettings: React.FC = () => {
  const { t, language } = useLanguage();
  const { user, profile, updateProfile, isDemoUser } = useAuth();
  const isBn = language === 'bn';

  // Form states initialized with profile values
  const [displayName, setDisplayName] = useState<string>(profile.displayName || 'Tanjir');
  const [age, setAge] = useState<number>(profile.age || 38);
  const [heightCm, setHeightCm] = useState<number>(profile.heightCm || 165);
  const [targetWeightKg, setTargetWeightKg] = useState<number>(profile.targetWeightKg || 63);
  const [targetWaistCm, setTargetWaistCm] = useState<number>(profile.targetWaistCm || 85);
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState<number>(profile.dailyCalorieTarget || 1850);
  const [dailyProteinTargetGrams, setDailyProteinTargetGrams] = useState<number>(profile.dailyProteinTargetGrams || 75);
  const [dailyStepsTarget, setDailyStepsTarget] = useState<number>(profile.dailyStepsTarget || 7000);
  const [dailyWalkingMinutesTarget, setDailyWalkingMinutesTarget] = useState<number>(profile.dailyWalkingMinutesTarget || 35);
  const [dailyWaterTargetGlasses, setDailyWaterTargetGlasses] = useState<number>(profile.dailyWaterTargetGlasses || 9);
  const [weeklyWorkoutsTarget, setWeeklyWorkoutsTarget] = useState<number>(profile.weeklyWorkoutsTarget || 3);

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      displayName,
      age,
      heightCm,
      targetWeightKg,
      targetWaistCm,
      dailyCalorieTarget,
      dailyProteinTargetGrams,
      dailyStepsTarget,
      dailyWalkingMinutesTarget,
      dailyWaterTargetGlasses,
      weeklyWorkoutsTarget,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <h2 className="text-xl font-black text-neutral-900 tracking-tight font-display">
          {t('goals')} &amp; {t('profileAndTargets')}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          {isBn
            ? 'আপনার শারীরিক মাপ ও দৈনিক স্বাস্থ্য লক্ষ্যগুলো যেকোনো সময় নিজের মতো পরিবর্তন করুন।'
            : 'Customize your baseline metrics, waist targets, and daily fitness goals.'}
        </p>
      </div>

      {/* Profile & Target Goals Form */}
      <form onSubmit={handleSaveProfile} className="space-y-4">
        {/* Personal Baseline Info */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
            <User className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-extrabold text-neutral-900">
              {isBn ? 'ব্যক্তিগত তথ্য' : 'Personal Profile'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Name / নাম
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Age / বয়স
              </label>
              <input
                type="number"
                min="18"
                max="100"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value) || 38)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Height / উচ্চতা (cm)
              </label>
              <input
                type="number"
                min="100"
                max="230"
                value={heightCm}
                onChange={(e) => setHeightCm(parseInt(e.target.value) || 165)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>
        </div>

        {/* Waist & Weight Objectives */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
            <Scale className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-extrabold text-neutral-900">
              {isBn ? 'কোমর ও ওজন লক্ষ্যমাত্রা' : 'Waist & Weight Recomposition Targets'}
            </h3>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs text-emerald-950 leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              {isBn
                ? 'প্রাথমিক লক্ষ্য: ৬৩ কেজি ওজন বজায় রেখে কোমর ৮৮ সেমি থেকে প্রথমে ৮৫ সেমি এবং পরবর্তীতে ৮২.৫ সেমির নিচে নিয়ে আসা।'
                : 'Initial Target: Maintain approximately 63 kg mass, gradually reduce waist from 88 cm toward 85 cm and later below 82.5 cm (achieving WHtR < 0.50).'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {t('targetWaist')} (cm)
              </label>
              <input
                type="number"
                step="0.5"
                min="60"
                max="120"
                value={targetWaistCm}
                onChange={(e) => setTargetWaistCm(parseFloat(e.target.value) || 85)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-extrabold text-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              />
              <span className="text-[10px] text-neutral-400 mt-0.5 block">
                Target WHtR: {(targetWaistCm / heightCm).toFixed(3)}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {t('targetWeight')} (kg)
              </label>
              <input
                type="number"
                step="0.5"
                min="40"
                max="150"
                value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(parseFloat(e.target.value) || 63)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-extrabold text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              />
              <span className="text-[10px] text-neutral-400 mt-0.5 block">
                Maintain ~63kg while burning visceral fat
              </span>
            </div>
          </div>
        </div>

        {/* Daily & Weekly Habit Targets */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
            <Target className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-extrabold text-neutral-900">
              {isBn ? 'দৈনিক পুষ্টি ও ব্যায়ামের লক্ষ্য' : 'Daily Nutrition & Exercise Targets'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {t('dailyCalorieGoal')}
              </label>
              <input
                type="number"
                min="1200"
                max="4000"
                value={dailyCalorieTarget}
                onChange={(e) => setDailyCalorieTarget(parseInt(e.target.value) || 1850)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {t('dailyProteinGoal')}
              </label>
              <input
                type="number"
                min="40"
                max="200"
                value={dailyProteinTargetGrams}
                onChange={(e) => setDailyProteinTargetGrams(parseInt(e.target.value) || 75)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {t('dailyWaterGoal')}
              </label>
              <input
                type="number"
                min="4"
                max="20"
                value={dailyWaterTargetGlasses}
                onChange={(e) => setDailyWaterTargetGlasses(parseInt(e.target.value) || 9)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {t('dailyStepsGoal')}
              </label>
              <input
                type="number"
                step="500"
                min="2000"
                max="30000"
                value={dailyStepsTarget}
                onChange={(e) => setDailyStepsTarget(parseInt(e.target.value) || 7000)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {t('dailyWalkMinutesGoal')}
              </label>
              <input
                type="number"
                min="15"
                max="120"
                value={dailyWalkingMinutesTarget}
                onChange={(e) => setDailyWalkingMinutesTarget(parseInt(e.target.value) || 35)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {t('weeklyWorkoutsGoal')}
              </label>
              <input
                type="number"
                min="1"
                max="7"
                value={weeklyWorkoutsTarget}
                onChange={(e) => setWeeklyWorkoutsTarget(parseInt(e.target.value) || 3)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <Check className="w-4 h-4" />
              <span>{isBn ? 'লক্ষ্যমাত্রা সফলভাবে আপডেট করা হয়েছে!' : 'Targets updated successfully!'}</span>
            </span>
          ) : (
            <span className="text-[11px] text-neutral-400">
              {isDemoUser ? 'Demo mode: saved to browser storage' : 'Synced with Cloud Firestore'}
            </span>
          )}

          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            {t('save')}
          </button>
        </div>
      </form>
    </div>
  );
};
