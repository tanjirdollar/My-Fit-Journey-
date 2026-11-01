import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useFitnessData, getTodayDateStr } from '../context/FitnessDataContext';
import { CsvExportCategory } from '../types';
import { SimpleLineChart } from './charts/SimpleLineChart';
import { SimpleBarChart } from './charts/SimpleBarChart';
import {
  FileSpreadsheet,
  FileCode,
  RotateCcw,
  FolderArchive,
  Check,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const {
    nutritionLogs,
    exerciseLogs,
    activityLogs,
    bodyMeasurements,
    habitLogs,
    sleepLogs,
    healthRecords,
    aiCoachNotes,
    favoriteFoodIds,
    customFoods,
    exportAllDataJson,
    exportAllDataCsv,
    resetAllData,
  } = useFitnessData();

  const isBn = language === 'bn';
  const today = getTodayDateStr();

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [selectedCsvCategory, setSelectedCsvCategory] = useState<CsvExportCategory>('all_zip');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const showExportFeedback = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  // Build date range based on selected period (daily = 1 day, weekly = 7 days, monthly = 30 days)
  const numDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
  const dateRange: string[] = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dateRange.push(`${y}-${m}-${day}`);
  }

  // Filter logs in selected period
  const periodNutrition = nutritionLogs.filter((n) => dateRange.includes(n.date));
  const loggedNutDates = Array.from(new Set(periodNutrition.map((n) => n.date)));
  const activeNutDaysCount = Math.max(1, loggedNutDates.length);

  const avgCalories = Math.round(
    periodNutrition.reduce((sum, n) => sum + (n.calories || 0), 0) / activeNutDaysCount
  );
  const avgProtein = Number(
    (periodNutrition.reduce((sum, n) => sum + (n.protein || 0), 0) / activeNutDaysCount).toFixed(1)
  );

  const periodActivity = activityLogs.filter((a) => dateRange.includes(a.date));
  const totalStepsInPeriod = periodActivity.reduce((sum, a) => sum + (a.steps || 0), 0);
  const avgSteps = Math.round(totalStepsInPeriod / Math.max(1, periodActivity.length));

  // Measurements
  const sortedMeas = [...bodyMeasurements].sort((a, b) => a.date.localeCompare(b.date));
  const firstMeas = sortedMeas[0] || { waistCm: 88, weightKg: 63 };
  const latestMeas = sortedMeas[sortedMeas.length - 1] || { waistCm: 88, weightKg: 63 };
  const waistDelta = Number((latestMeas.waistCm - firstMeas.waistCm).toFixed(1));

  // Chart data from real saved records
  const chartDates = period === 'monthly' ? dateRange.slice(-10) : dateRange;

  const waistChartData = sortedMeas.map((m) => ({
    date: m.date,
    value: m.waistCm,
  }));

  const calorieBarData = chartDates.map((dStr) => {
    const dayCals = nutritionLogs
      .filter((n) => n.date === dStr)
      .reduce((sum, n) => sum + (n.calories || 0), 0);
    return {
      label: dStr === today ? (isBn ? 'আজ' : 'Today') : dStr.slice(5),
      value: dayCals,
    };
  });

  const stepsBarData = chartDates.map((dStr) => {
    const act = activityLogs.find((a) => a.date === dStr);
    return {
      label: dStr === today ? (isBn ? 'আজ' : 'Today') : dStr.slice(5),
      value: act?.steps || 0,
    };
  });

  const csvCategoryOptions: { value: CsvExportCategory; labelEn: string; labelBn: string; count?: number }[] = [
    {
      value: 'all_zip',
      labelEn: 'All 11 Categories (Separate CSVs in .ZIP)',
      labelBn: 'সব ১১টি বিভাগ (আলাদা CSV সহ .ZIP ফাইল)',
    },
    {
      value: 'all_combined_csv',
      labelEn: 'All 11 Categories (Single Combined .CSV)',
      labelBn: 'সব ১১টি বিভাগ (একটি সমন্বিত .CSV ফাইল)',
    },
    {
      value: 'user_profile',
      labelEn: '01. User Profile',
      labelBn: '০১. ইউজার প্রোফাইল (User Profile)',
      count: 1,
    },
    {
      value: 'body_measurements',
      labelEn: '02. Body Measurements',
      labelBn: '০২. শারীরিক পরিমাপ (Body Measurements)',
      count: bodyMeasurements.length,
    },
    {
      value: 'nutrition_logs',
      labelEn: '03. Nutrition Logs',
      labelBn: '০৩. খাবারের হিসাব (Nutrition Logs)',
      count: nutritionLogs.length,
    },
    {
      value: 'exercise_logs',
      labelEn: '04. Exercise Logs',
      labelBn: '০৪. ব্যায়ামের হিসাব (Exercise Logs)',
      count: exerciseLogs.length,
    },
    {
      value: 'activity_logs',
      labelEn: '05. Activity & Steps Logs',
      labelBn: '০৫. হাঁটা ও স্টেপস (Activity Logs)',
      count: activityLogs.length,
    },
    {
      value: 'habit_logs',
      labelEn: '06. Habit & Hydration Logs',
      labelBn: '০৬. অভ্যাস ও পানি পান (Habit Logs)',
      count: habitLogs.length,
    },
    {
      value: 'sleep_logs',
      labelEn: '07. Sleep Logs',
      labelBn: '০৭. ঘুমের হিসাব (Sleep Logs)',
      count: sleepLogs.length,
    },
    {
      value: 'health_records',
      labelEn: '08. Health Records (BP, Glucose, HbA1c, Lipid)',
      labelBn: '০৮. মেডিকেল রিপোর্ট (Health Records)',
      count: healthRecords.length,
    },
    {
      value: 'ai_coach_notes',
      labelEn: '09. AI Coach Notes',
      labelBn: '০৯. এআই কোচ পরামর্শ (AI Coach Notes)',
      count: aiCoachNotes.length,
    },
    {
      value: 'favorite_foods',
      labelEn: '10. Favorite Foods',
      labelBn: '১০. প্রিয় খাবার তালিকা (Favorite Foods)',
      count: favoriteFoodIds.length,
    },
    {
      value: 'custom_foods',
      labelEn: '11. Custom Food Templates',
      labelBn: '১১. নিজস্ব তৈরি খাবার (Custom Food Templates)',
      count: customFoods.length,
    },
  ];

  return (
    <div className="space-y-5 pb-16">
      {/* Header & Period Filter */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight font-display">
              {t('reports')} &amp; {t('trends')}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isBn
                ? 'দৈনিক ও সাপ্তাহিক অগ্রগতি এবং সম্পূর্ণ ডাটা ব্যাকআপ ডাউনলোড'
                : 'Progress trends, weekly averages, and personal data backups.'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl text-xs font-bold">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                  period === p ? 'bg-white dark:bg-neutral-900 text-emerald-800 dark:text-emerald-300 shadow-2xs' : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Aggregated KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 dark:bg-neutral-800/70 p-3.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-800">
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">Avg Calories</div>
            <div className="text-xl font-black text-neutral-900 dark:text-neutral-100">{avgCalories}</div>
            <div className="text-[10px] text-neutral-400 font-medium">target: {profile.dailyCalorieTarget} kcal</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Avg Protein</div>
            <div className="text-xl font-black text-emerald-800 dark:text-emerald-300">{avgProtein}g</div>
            <div className="text-[10px] text-emerald-600 font-medium">target: {profile.dailyProteinTargetGrams}g</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400">Avg Daily Steps</div>
            <div className="text-xl font-black text-teal-900 dark:text-teal-200">{avgSteps.toLocaleString()}</div>
            <div className="text-[10px] text-teal-600 font-medium">target: {profile.dailyStepsTarget}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400">Waist Change</div>
            <div className="text-xl font-black text-neutral-900 dark:text-neutral-100">
              {latestMeas.waistCm} cm
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
              {waistDelta <= 0 ? `${waistDelta} cm change` : `+${waistDelta} cm`}
            </div>
          </div>
        </div>
      </div>

      {/* Waistline Reduction Trend Chart */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <SimpleLineChart
          data={waistChartData}
          title={isBn ? 'কোমরের মাপ অগ্রগতি (লক্ষ্য: ৮৫ সেমি)' : 'Waistline Progress toward 85cm & 82.5cm Goal'}
          unit="cm"
          targetValue={profile.targetWaistCm}
          targetLabel="Intermediate Goal"
          lineColor="#059669"
        />
      </div>

      {/* Weekly Nutrition & Steps Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="mb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              {isBn ? 'সাপ্তাহিক ক্যালোরি ইনটেক' : 'Weekly Calorie Intake Consistency'}
            </h3>
          </div>
          <SimpleBarChart
            data={calorieBarData}
            targetValue={profile.dailyCalorieTarget}
            unit="kcal"
            barColor="#ea580c"
            targetLabel="Target"
          />
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="mb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              {isBn ? 'সাপ্তাহিক স্টেপস ও হাঁটা' : 'Weekly Step Count'}
            </h3>
          </div>
          <SimpleBarChart
            data={stepsBarData}
            targetValue={profile.dailyStepsTarget}
            unit="steps"
            barColor="#0d9488"
            targetLabel="Goal"
          />
        </div>
      </div>

      {/* Data Export & Backup Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
              {isBn ? 'ব্যক্তিগত ডাটা ব্যাকআপ ও এক্সপোর্ট (UTF-8 BOM)' : 'Complete Personal Health Data Backup & CSV Export'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isBn
                ? 'প্রোফাইল, পরিমাপ, খাবার, ব্যায়াম, স্টেপস, অভ্যাস, ঘুম, মেডিকেল রিপোর্ট, এআই কোচ নোট, প্রিয় খাবার ও নিজস্ব খাবার — সব ১১টি বিভাগ Excel-বান্ধব বাংলা UTF-8 ফরম্যাটে ডাউনলোড করুন।'
                : 'Export all 11 data categories (Profile, Measurements, Nutrition, Exercise, Activity, Habits, Sleep, Health Records, AI Coach Notes, Favorites, and Custom Foods) with UTF-8 BOM for full Bengali Excel compatibility.'}
            </p>
          </div>
        </div>

        {exportNotice && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Category selector & action buttons */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-neutral-50 dark:bg-neutral-800/70 p-3.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-800">
          <div className="md:col-span-6">
            <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
              {isBn ? 'CSV এক্সপোর্ট ফরম্যাট / বিভাগ নির্বাচন করুন' : 'Select CSV Export Format or Category'}
            </label>
            <select
              value={selectedCsvCategory}
              onChange={(e) => setSelectedCsvCategory(e.target.value as CsvExportCategory)}
              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
            >
              {csvCategoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {isBn ? opt.labelBn : opt.labelEn}
                  {opt.count !== undefined ? ` (${opt.count})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6 flex flex-wrap items-center gap-2.5 md:pt-4">
            <button
              type="button"
              onClick={() => {
                exportAllDataCsv(selectedCsvCategory);
                showExportFeedback(
                  isBn
                    ? 'CSV / ZIP ডাউনলোড শুরু হয়েছে (বাংলা UTF-8 BOM সহ)!'
                    : 'CSV / ZIP export downloaded (with UTF-8 BOM for Excel)!'
                );
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              {selectedCsvCategory === 'all_zip' ? (
                <FolderArchive className="w-4 h-4" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <span>
                {selectedCsvCategory === 'all_zip'
                  ? isBn
                    ? 'সব CSV ফাইল (.ZIP) ডাউনলোড'
                    : 'Download All CSVs (.ZIP)'
                  : isBn
                  ? 'নির্বাচিত CSV ডাউনলোড'
                  : 'Download Selected CSV'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportAllDataCsv('all_combined_csv');
                showExportFeedback(
                  isBn
                    ? 'সমন্বিত সম্পূর্ণ CSV ডাউনলোড সম্পন্ন!'
                    : 'Complete Combined CSV downloaded!'
                );
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-900 dark:text-teal-200 border border-teal-200 dark:border-teal-800/70 text-xs font-bold transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              <span>{isBn ? 'একক CSV টেবিল' : 'Combined CSV'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportAllDataJson();
                showExportFeedback(
                  isBn
                    ? 'JSON ব্যাকআপ ফাইল ডাউনলোড সম্পন্ন!'
                    : 'Full JSON Backup downloaded!'
                );
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/70 text-xs font-bold transition-colors"
            >
              <FileCode className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>{isBn ? 'JSON ব্যাকআপ' : 'JSON Backup'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-neutral-400">
            {isBn
              ? 'নিরাপত্তা নোট: এক্সপোর্ট ফাইলে কোনো API কী বা গোপন টোকেন অন্তর্ভুক্ত করা হয় না।'
              : 'Security Note: Exports strictly contain your personal health logs and exclude any API keys or tokens.'}
          </span>

          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/70 hover:bg-rose-50 text-neutral-500 dark:text-neutral-400 hover:text-rose-700 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isBn ? 'ডাটা রিসেট' : 'Reset Logs'}</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl space-y-3">
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-neutral-100">
              {isBn ? 'আপনি কি নিশ্চিত?' : 'Reset All Logs?'}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {isBn
                ? 'এটি আপনার বর্তমান খাবার ও ব্যায়ামের সাময়িক রেকর্ডগুলো মুছে প্রাথমিক ডেমো অবস্থায় ফিরিয়ে আনবে।'
                : 'This will reset your temporary logs back to the initial baseline.'}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="w-1/2 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await resetAllData();
                  setResetConfirmOpen(false);
                }}
                className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                {isBn ? 'হ্যাঁ, রিসেট করুন' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
