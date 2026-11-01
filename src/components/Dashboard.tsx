import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useFitnessData, getTodayDateStr } from '../context/FitnessDataContext';
import { WhTrGauge } from './WhTrGauge';
import { TabKey } from './Navbar';
import {
  Flame,
  Dumbbell,
  Droplets,
  Footprints,
  Clock,
  Moon,
  Scale,
  Plus,
  Coffee,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Armchair,
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: TabKey) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const {
    nutritionLogs,
    exerciseLogs,
    activityLogs,
    bodyMeasurements,
    habitLogs,
    sleepLogs,
    incrementWater,
    incrementSittingBreak,
  } = useFitnessData();

  const isBn = language === 'bn';
  const today = getTodayDateStr();

  // Compute today's totals
  const todayNutrition = nutritionLogs.filter((n) => n.date === today);
  const totalCalories = todayNutrition.reduce((sum, n) => sum + (n.calories || 0), 0);
  const totalProtein = Number(todayNutrition.reduce((sum, n) => sum + (n.protein || 0), 0).toFixed(1));
  const totalCarbs = Number(todayNutrition.reduce((sum, n) => sum + (n.carbs || 0), 0).toFixed(1));
  const totalFat = Number(todayNutrition.reduce((sum, n) => sum + (n.fat || 0), 0).toFixed(1));

  // Exercise & Activity
  const todayExercises = exerciseLogs.filter((e) => e.date === today);
  const exerciseDurationTotal = todayExercises.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
  const exerciseCaloriesBurned = todayExercises.reduce((sum, e) => sum + (e.caloriesBurned || 0), 0);

  const todayActivity = activityLogs.find((a) => a.date === today) || {
    steps: 0,
    walkingDurationMinutes: 0,
    distanceKm: 0,
  };

  // Habits
  const todayHabit = habitLogs.find((h) => h.date === today) || {
    waterGlasses: 0,
    sittingBreaks: 0,
    walkingDone: false,
    exerciseDone: false,
    mealLogged: false,
    vegetableMet: false,
    sleepRoutineMet: false,
  };

  // Sleep
  const recentSleep = sleepLogs[0];

  // Latest Measurements
  const latestMeasurement =
    bodyMeasurements[bodyMeasurements.length - 1] || {
      weightKg: 63,
      waistCm: 88,
      bmi: 23.14,
      waistToHeightRatio: 0.533,
    };

  // Targets
  const calorieTarget = profile.dailyCalorieTarget || 1850;
  const proteinTarget = profile.dailyProteinTargetGrams || 75;
  const stepsTarget = profile.dailyStepsTarget || 7000;
  const waterTarget = profile.dailyWaterTargetGlasses || 9;
  const walkMinutesTarget = profile.dailyWalkingMinutesTarget || 35;

  // Goal completion calculations
  const goalsList = [
    { name: isBn ? 'ক্যালোরি সীমা' : 'Calorie Target', met: totalCalories > 0 && totalCalories <= calorieTarget + 100 },
    { name: isBn ? 'প্রোটিন লক্ষ্য' : 'Protein Target', met: totalProtein >= proteinTarget * 0.8 },
    { name: isBn ? 'স্টেপস লক্ষ্য' : 'Steps Target', met: todayActivity.steps >= stepsTarget * 0.7 },
    { name: isBn ? 'পর্যাপ্ত পানি' : 'Hydration', met: todayHabit.waterGlasses >= waterTarget * 0.7 },
    { name: isBn ? 'বসার বিরতি' : 'Desk Breaks', met: todayHabit.sittingBreaks >= 3 },
  ];
  const completedGoalsCount = goalsList.filter((g) => g.met).length;
  const goalPercentage = Math.round((completedGoalsCount / goalsList.length) * 100);

  return (
    <div className="space-y-5 pb-16">
      {/* Personalized Health Mission Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-800 to-emerald-700 text-white rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-900/60 text-emerald-200 border border-emerald-500/30">
                <TrendingDown className="w-3.5 h-3.5" />
                {isBn ? 'কোমরের মেদ কমানো ও লাইফস্টাইল রুটিন' : 'Waistline & Recomposition Focus'}
              </span>
              <span className="text-xs text-emerald-200/80">38 yrs • 165 cm</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight font-display">
              {isBn ? 'স্বাগতম, তানজির!' : 'Welcome back, Tanjir!'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl leading-relaxed">
              {isBn
                ? `বর্তমান ওজন ৬৩ কেজি ঠিক রেখে কোমর ৮৮ সেমি থেকে ৮৫ সেমি ও পরবর্তীতে ৮২.৫ সেমিতে আনার দৈনিক অগ্রযাত্রা।`
                : `Maintaining baseline 63 kg while trimming waist from 88 cm toward 85 cm and under 82.5 cm without extreme dieting.`}
            </p>
          </div>

          {/* Goal progress circle badge */}
          <div className="flex items-center gap-3 bg-emerald-900/40 p-3 rounded-2xl border border-emerald-500/20 self-start md:self-auto">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-emerald-950/60"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-300 transition-all duration-500"
                  strokeDasharray={`${goalPercentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[11px] font-black">{goalPercentage}%</span>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-emerald-200 font-bold">
                {isBn ? 'দৈনিক লক্ষ্য' : 'Daily Goals'}
              </div>
              <div className="text-xs text-white font-medium">
                {completedGoalsCount} of {goalsList.length} {isBn ? 'পূরণ হয়েছে' : 'completed'}
              </div>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      </div>

      {/* Quick Action Floating Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => onNavigate('nutrition')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 hover:bg-emerald-50 text-neutral-800 dark:text-neutral-200 hover:text-emerald-800 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs text-xs font-semibold whitespace-nowrap transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-600" />
          <span>{t('addMeal')}</span>
        </button>

        <button
          onClick={() => onNavigate('exercise')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 hover:bg-emerald-50 text-neutral-800 dark:text-neutral-200 hover:text-emerald-800 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs text-xs font-semibold whitespace-nowrap transition-colors"
        >
          <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
          <span>{t('logExercise')}</span>
        </button>

        <button
          onClick={incrementWater}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80 text-xs font-semibold whitespace-nowrap transition-colors"
        >
          <Droplets className="w-3.5 h-3.5 text-sky-600" />
          <span>+ {isBn ? '১ গ্লাস পানি' : '1 Glass Water'}</span>
        </button>

        <button
          onClick={incrementSittingBreak}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/70 text-xs font-semibold whitespace-nowrap transition-colors"
          title="Take a 2-minute standing or walking break from desk"
        >
          <Armchair className="w-3.5 h-3.5 text-amber-600" />
          <span>+ {isBn ? 'বসার বিরতি' : 'Desk Break'}</span>
        </button>

        <button
          onClick={() => onNavigate('aiCoach')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap shadow-2xs transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
          <span>{t('askCoach')}</span>
        </button>
      </div>

      {/* WHtR Visual Gauge Section */}
      <WhTrGauge
        waistCm={latestMeasurement.waistCm}
        heightCm={profile.heightCm}
        targetWaistCm={profile.targetWaistCm}
      />

      {/* Primary Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Calories Card */}
        <div
          onClick={() => onNavigate('nutrition')}
          className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('calories')}</span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">{totalCalories}</span>
            <span className="text-xs text-neutral-400 font-medium">/ {calorieTarget} kcal</span>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                totalCalories > calorieTarget ? 'bg-amber-500' : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min(100, (totalCalories / calorieTarget) * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-neutral-500 dark:text-neutral-400 flex justify-between">
            <span>{Math.max(0, calorieTarget - totalCalories)} kcal {isBn ? 'বাকি' : 'left'}</span>
            <span>{todayNutrition.length} {isBn ? 'টি পদ' : 'items'}</span>
          </div>
        </div>

        {/* Protein Card */}
        <div
          onClick={() => onNavigate('nutrition')}
          className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('protein')}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">{totalProtein}g</span>
            <span className="text-xs text-neutral-400 font-medium">/ {proteinTarget}g</span>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (totalProtein / proteinTarget) * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-neutral-500 dark:text-neutral-400 flex justify-between">
            <span>{isBn ? 'পেশী ও সায়তির জন্য' : 'Muscle preservation'}</span>
            <span className="font-semibold">{Math.round((totalProtein / proteinTarget) * 100)}%</span>
          </div>
        </div>

        {/* Steps & Walking Card */}
        <div
          onClick={() => onNavigate('exercise')}
          className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('steps')}</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Footprints className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {todayActivity.steps.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-400 font-medium">/ {stepsTarget}</span>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (todayActivity.steps / stepsTarget) * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-neutral-500 dark:text-neutral-400 flex justify-between">
            <span>{todayActivity.walkingDurationMinutes || 0}m {isBn ? 'হাঁটা' : 'walk'}</span>
            <span>{todayActivity.distanceKm || 0} km</span>
          </div>
        </div>

        {/* Water Hydration Card */}
        <div
          onClick={() => onNavigate('habits')}
          className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('water')}</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {todayHabit.waterGlasses}
            </span>
            <span className="text-xs text-neutral-400 font-medium">/ {waterTarget} {isBn ? 'গ্লাস' : 'gl'}</span>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (todayHabit.waterGlasses / waterTarget) * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-neutral-500 dark:text-neutral-400 flex justify-between">
            <span>~{(todayHabit.waterGlasses * 0.25).toFixed(1)}L / {(waterTarget * 0.25).toFixed(1)}L</span>
            <span className="font-semibold">{Math.round((todayHabit.waterGlasses / waterTarget) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Secondary Dashboard Row: Sitting Breaks, Sleep, Measurements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Sitting Breaks & Sedentary Habit Counter */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Armchair className="w-4 h-4 text-amber-600" />
                {t('sittingBreaks')}
              </span>
              <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-200/60">
                {isBn ? 'ডেস্ক কাজের বিরতি' : 'Desk Sedentary Relief'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {isBn
                ? 'একটানা বসে থাকলে পেটে চর্বি জমে। প্রতি ১ ঘণ্টায় ২ মিনিটের জন্য উঠে দাঁড়ান বা হাঁটুন।'
                : 'Prolonged sitting promotes visceral abdominal fat. Take a 2-min active walking break every hour.'}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <div className="text-xl font-black text-neutral-900 dark:text-neutral-100">{todayHabit.sittingBreaks}</div>
              <div className="text-[10px] text-neutral-400">{t('breakCounter')}</div>
            </div>
            <button
              onClick={incrementSittingBreak}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition-all"
            >
              + {isBn ? 'বিরতি নিন' : 'Stand / Walk'}
            </button>
          </div>
        </div>

        {/* Sleep Snapshot */}
        <div
          onClick={() => onNavigate('sleep')}
          className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between cursor-pointer hover:border-emerald-300 transition-all group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-indigo-600" />
                {t('sleep')}
              </span>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
                {isBn ? 'গত রাতের হিসাব' : 'Last Night'}
              </span>
            </div>
            {recentSleep ? (
              <div className="mt-1">
                <div className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
                  {Math.floor(recentSleep.durationMinutes / 60)}h {recentSleep.durationMinutes % 60}m
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {recentSleep.bedtime} - {recentSleep.wakeTime} ({recentSleep.quality}/5 ★)
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-400 mt-2">
                {isBn ? 'ঘুমের সময় রেকর্ড করা হয়নি।' : 'No sleep logged yet.'}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-400 font-semibold">
            <span>{isBn ? 'ঘুমের বিবরণ দেখুন' : 'View sleep logs'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Body Measurements Snapshot */}
        <div
          onClick={() => onNavigate('body')}
          className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between cursor-pointer hover:border-emerald-300 transition-all group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                {t('body')}
              </span>
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
                {latestMeasurement.date}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="bg-neutral-50 dark:bg-neutral-800/70 p-2 rounded-xl">
                <div className="text-[10px] text-neutral-400 uppercase font-semibold">{t('waistline')}</div>
                <div className="text-lg font-black text-neutral-900 dark:text-neutral-100">{latestMeasurement.waistCm} cm</div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Target: {profile.targetWaistCm}cm</div>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800/70 p-2 rounded-xl">
                <div className="text-[10px] text-neutral-400 uppercase font-semibold">{t('weight')}</div>
                <div className="text-lg font-black text-neutral-900 dark:text-neutral-100">{latestMeasurement.weightKg} kg</div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">BMI: {latestMeasurement.bmi}</div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
            <span>{isBn ? 'ইতিহাস ও চার্ট দেখুন' : 'Update & View charts'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* AI Coach Callout Widget */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <span>{t('aiCoachTitle')}</span>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 dark:text-emerald-200 px-1.5 py-0.2 rounded font-mono font-semibold">
                Gemini 3 Flash
              </span>
            </div>
            <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1 max-w-xl leading-relaxed">
              {isBn
                ? 'আপনার ওজন ৬৩ কেজি বজায় রেখে পেট কমানোর কৌশল, খাবারের প্রোটিন বাড়ানো এবং ডেস্কে কাজের ক্লান্তি দূর করার জন্য পরামর্শ নিন।'
                : 'Get tailored advice on keeping your 63 kg mass while tightening your waist, balancing Bengali meals, and active desk routines.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('aiCoach')}
          className="shrink-0 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
        >
          <span>{isBn ? 'পরামর্শ নিন' : 'Consult Coach'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Today's Meals Quick List */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {isBn ? 'আজকের খাবারের তালিকা' : "Today's Logged Meals"}
          </div>
          <button
            onClick={() => onNavigate('nutrition')}
            className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
          >
            <span>{isBn ? 'সব দেখুন ও যোগ করুন' : 'View all & Add'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayNutrition.length === 0 ? (
          <div className="text-center py-6 text-neutral-400 text-xs">
            {t('noDataYet')}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {todayNutrition.slice(0, 4).map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {isBn && item.foodNameBn ? item.foodNameBn : item.foodName}
                  </div>
                  <div className="text-[11px] text-neutral-400 capitalize">
                    {t(item.mealType)} • {item.portion} {item.unit}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-neutral-900 dark:text-neutral-100">{item.calories} kcal</div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">{item.protein}g protein</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
