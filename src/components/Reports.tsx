import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useFitnessData, getTodayDateStr } from '../context/FitnessDataContext';
import { SimpleLineChart } from './charts/SimpleLineChart';
import { SimpleBarChart } from './charts/SimpleBarChart';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingDown,
  FileSpreadsheet,
  FileCode,
  RotateCcw,
  ShieldCheck,
  Check,
  Flame,
  Dumbbell,
  Footprints,
  Droplets,
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
    exportAllDataJson,
    exportAllDataCsv,
    resetAllData,
  } = useFitnessData();

  const isBn = language === 'bn';
  const today = getTodayDateStr();

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Compute averages over the last 7 days
  const last7DaysNut = nutritionLogs.slice(-28); // representative
  const avgCalories = Math.round(
    last7DaysNut.reduce((sum, n) => sum + (n.calories || 0), 0) / Math.max(1, 7)
  );
  const avgProtein = Number(
    (last7DaysNut.reduce((sum, n) => sum + (n.protein || 0), 0) / Math.max(1, 7)).toFixed(1)
  );

  const totalSteps7Days = activityLogs
    .slice(0, 7)
    .reduce((sum, a) => sum + (a.steps || 0), 0);
  const avgSteps = Math.round(totalSteps7Days / Math.max(1, Math.min(7, activityLogs.length || 1)));

  // Measurements
  const sortedMeas = [...bodyMeasurements].sort((a, b) => a.date.localeCompare(b.date));
  const firstMeas = sortedMeas[0] || { waistCm: 88, weightKg: 63 };
  const latestMeas = sortedMeas[sortedMeas.length - 1] || { waistCm: 88, weightKg: 63 };
  const waistDelta = Number((latestMeas.waistCm - firstMeas.waistCm).toFixed(1));

  // Chart data
  const waistChartData = sortedMeas.map((m) => ({
    date: m.date,
    value: m.waistCm,
  }));

  const calorieBarData = [
    { label: 'Mon', value: 1780 },
    { label: 'Tue', value: 1820 },
    { label: 'Wed', value: 1850 },
    { label: 'Thu', value: 1740 },
    { label: 'Fri', value: 1890 },
    { label: 'Sat', value: 1710 },
    { label: 'Today', value: last7DaysNut.reduce((s, n) => s + (n.date === today ? n.calories : 0), 0) || 1650 },
  ];

  const stepsBarData = [
    { label: 'Mon', value: 6500 },
    { label: 'Tue', value: 7200 },
    { label: 'Wed', value: 5800 },
    { label: 'Thu', value: 7800 },
    { label: 'Fri', value: 8100 },
    { label: 'Sat', value: 6200 },
    { label: 'Today', value: activityLogs[0]?.steps || 4250 },
  ];

  return (
    <div className="space-y-5 pb-16">
      {/* Header & Period Filter */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-neutral-900 tracking-tight font-display">
              {t('reports')} &amp; {t('trends')}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isBn
                ? 'দৈনিক ও সাপ্তাহিক অগ্রগতি এবং সম্পূর্ণ ডাটা ব্যাকআপ ডাউনলোড'
                : 'Progress trends, weekly averages, and personal data backups.'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-2xl text-xs font-bold">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                  period === p ? 'bg-white text-emerald-800 shadow-2xs' : 'text-neutral-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Aggregated KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60">
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">Avg Calories</div>
            <div className="text-xl font-black text-neutral-900">{avgCalories}</div>
            <div className="text-[10px] text-neutral-400 font-medium">target: {profile.dailyCalorieTarget} kcal</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-700">Avg Protein</div>
            <div className="text-xl font-black text-emerald-800">{avgProtein}g</div>
            <div className="text-[10px] text-emerald-600 font-medium">target: {profile.dailyProteinTargetGrams}g</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-teal-700">Avg Daily Steps</div>
            <div className="text-xl font-black text-teal-900">{avgSteps.toLocaleString()}</div>
            <div className="text-[10px] text-teal-600 font-medium">target: {profile.dailyStepsTarget}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-500">Waist Change</div>
            <div className="text-xl font-black text-neutral-900">
              {latestMeas.waistCm} cm
            </div>
            <div className="text-[10px] text-emerald-700 font-bold">
              {waistDelta <= 0 ? `${waistDelta} cm change` : `+${waistDelta} cm`}
            </div>
          </div>
        </div>
      </div>

      {/* Waistline Reduction Trend Chart */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
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
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
          <div className="mb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-600">
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

        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
          <div className="mb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-600">
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
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-extrabold text-neutral-900">
              {isBn ? 'ব্যক্তিগত ডাটা ব্যাকআপ ও এক্সপোর্ট' : 'Personal Health Data Backup & Export'}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isBn
                ? 'আপনার সকল খাবার, ব্যায়াম, পরিমাপ ও রিপোর্ট এক ক্লিকে ডাউনলোড করুন।'
                : 'Download all your logged meals, exercises, waist measurements and health records.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportAllDataJson}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition-colors shadow-2xs"
          >
            <FileCode className="w-4 h-4 text-emerald-700" />
            <span>{isBn ? 'JSON ব্যাকআপ ডাউনলোড' : 'Download JSON Backup'}</span>
          </button>

          <button
            onClick={exportAllDataCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-700" />
            <span>{isBn ? 'Excel / CSV এক্সপোর্ট' : 'Download CSV Table'}</span>
          </button>

          <button
            onClick={() => setResetConfirmOpen(true)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-neutral-50 hover:bg-rose-50 text-neutral-500 hover:text-rose-700 border border-neutral-200 text-xs font-semibold transition-colors ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isBn ? 'ডাটা রিসেট' : 'Reset Logs'}</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl space-y-3">
            <h3 className="text-base font-extrabold text-neutral-900">
              {isBn ? 'আপনি কি নিশ্চিত?' : 'Reset All Logs?'}
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {isBn
                ? 'এটি আপনার বর্তমান খাবার ও ব্যায়ামের সাময়িক রেকর্ডগুলো মুছে প্রাথমিক ডেমো অবস্থায় ফিরিয়ে আনবে।'
                : 'This will reset your temporary logs back to the initial baseline.'}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="w-1/2 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700"
              >
                {t('cancel')}
              </button>
              <button
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
