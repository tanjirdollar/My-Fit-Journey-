import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useFitnessData, getTodayDateStr } from '../context/FitnessDataContext';
import { SimpleBarChart } from './charts/SimpleBarChart';
import {
  Droplets,
  Armchair,
  CheckCircle2,
  Circle,
  Plus,
  Minus,
  Sparkles,
  Footprints,
  Salad,
  Moon,
  Dumbbell,
  Utensils,
} from 'lucide-react';

export const HabitsTracker: React.FC = () => {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const {
    habitLogs,
    incrementWater,
    decrementWater,
    incrementSittingBreak,
    toggleHabitCheck,
  } = useFitnessData();
  const isBn = language === 'bn';
  const today = getTodayDateStr();

  const todayHabit = habitLogs.find((h) => h.date === today) || {
    waterGlasses: 0,
    sittingBreaks: 0,
    walkingDone: false,
    exerciseDone: false,
    mealLogged: false,
    vegetableMet: false,
    sleepRoutineMet: false,
  };

  const waterTarget = profile.dailyWaterTargetGlasses || 9;

  // Habits checklist definitions
  const habitsList = [
    {
      key: 'walkingDone' as const,
      label: t('habitWalking'),
      desc: isBn ? 'খাবারের পর বা সকালে ৩০-৪০ মিনিট হাঁটা' : 'Accumulate 30-40 mins active walking',
      icon: Footprints,
      color: 'text-teal-600 bg-teal-50',
    },
    {
      key: 'mealLogged' as const,
      label: isBn ? 'সকল বেলার খাবার রেকর্ড করা' : 'Log All Daily Meals',
      desc: isBn ? 'ক্যালোরি ও প্রোটিনের সঠিক হিসাব রাখা' : 'Maintain mindful portion awareness',
      icon: Utensils,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      key: 'vegetableMet' as const,
      label: t('habitVeggies'),
      desc: isBn ? 'প্রতিবেলা খাবারে পালং/লাল শাক বা সালাদ' : 'Eat high fiber leafy greens/salad with lunch & dinner',
      icon: Salad,
      color: 'text-emerald-700 bg-emerald-50',
    },
    {
      key: 'exerciseDone' as const,
      label: t('habitStrength'),
      desc: isBn ? 'স্কোয়াট, পুশ-আপ ও ৩০ সেকেন্ড প্ল্যাঙ্ক' : 'Perform bodyweight squats, push-ups and planks',
      icon: Dumbbell,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      key: 'sleepRoutineMet' as const,
      label: t('habitSleep'),
      desc: isBn ? 'রাত ১১টার মধ্যে স্ক্রিন বন্ধ করে ঘুম' : 'Wind down before 11 PM and achieve 7+ hours',
      icon: Moon,
      color: 'text-purple-600 bg-purple-50',
    },
  ];

  // Water weekly chart data (last 7 days)
  const last7DaysData = habitLogs.slice(-7).map((h) => ({
    label: h.date.slice(5),
    value: h.waterGlasses,
  }));

  return (
    <div className="space-y-5 pb-16">
      {/* Habits Header */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <h2 className="text-xl font-black text-neutral-900 tracking-tight font-display">
          {t('habits')} &amp; {isBn ? 'জীবনধারা' : 'Lifestyle Habits'}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          {isBn
            ? 'স্থায়ীভাবে পেট কমাতে ও সুস্থ থাকতে দৈনন্দিন ছোট ছোট অভ্যাসের ধারাবাহিকতা'
            : 'Sustainable fat reduction through daily hydration, sitting relief, and consistent routines.'}
        </p>
      </div>

      {/* Hydration Tracker Card */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Droplets className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-neutral-900">
                {isBn ? 'পানি পান ট্র্যাকার (Hydration)' : 'Daily Water Tracker'}
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {isBn
                ? '১ গ্লাস ≈ ২৫০ মিলি। মেটাবলিজম ও হজমের জন্য দৈনিক ৯ গ্লাস (২.২৫ লিটার) পানি পান করুন।'
                : '1 glass ≈ 250ml. Drink 9 glasses (~2.25L) daily to support metabolism and digestion.'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-sky-900">{todayHabit.waterGlasses}</span>
            <span className="text-xs text-neutral-400 font-semibold"> / {waterTarget}</span>
            <div className="text-[10px] text-sky-700 font-medium">
              ~{(todayHabit.waterGlasses * 0.25).toFixed(2)} Liters
            </div>
          </div>
        </div>

        {/* Visual Glass Counter Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 my-4">
          {Array.from({ length: Math.max(waterTarget, todayHabit.waterGlasses) }).map((_, idx) => {
            const isFilled = idx < todayHabit.waterGlasses;
            return (
              <button
                key={idx}
                onClick={isFilled && idx === todayHabit.waterGlasses - 1 ? decrementWater : incrementWater}
                className={`h-11 rounded-xl flex flex-col items-center justify-center border transition-all ${
                  isFilled
                    ? 'bg-sky-500 border-sky-600 text-white shadow-2xs scale-100'
                    : 'bg-neutral-50 border-neutral-200/80 text-neutral-300 hover:border-sky-300'
                }`}
                title={`Glass ${idx + 1}`}
              >
                <Droplets className={`w-4 h-4 ${isFilled ? 'fill-white' : ''}`} />
                <span className="text-[9px] font-bold mt-0.5">{idx + 1}</span>
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <button
            onClick={decrementWater}
            disabled={todayHabit.waterGlasses === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-semibold hover:bg-neutral-50 disabled:opacity-40"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>- 1 {isBn ? 'গ্লাস' : 'Glass'}</span>
          </button>

          <button
            onClick={incrementWater}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ 1 {isBn ? 'গ্লাস পানি পান করেছি' : 'Add Glass'}</span>
          </button>
        </div>
      </div>

      {/* Sedentary Desk Sitting Relief Card */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-neutral-900">
                {isBn ? 'ডেস্কে কাজের বিরতি ও হাঁটা' : 'Sedentary Work & Desk Breaks'}
              </h3>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                {isBn
                  ? 'একটানা ৮ ঘণ্টা বসে কাজ করলে রক্তে ইনসুলিন অকার্যকর হয় এবং পেটে মেদ জমে। প্রতি ৫০ মিনিট পর চেয়ার ছেড়ে ২ মিনিট হালকা হাঁটুন।'
                  : 'Prolonged sitting blunts glucose clearance and concentrates visceral fat. Stand and walk for 2 minutes every hour.'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-2xl font-black text-amber-900">{todayHabit.sittingBreaks}</span>
            <div className="text-[10px] text-neutral-400 font-semibold">{t('breakCounter')}</div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-xs text-amber-800 font-medium">
            {isBn ? 'আজকের লক্ষ্য: অন্তত ৫-৬ বার বিরতি নেওয়া' : 'Target: 5-6 short breaks during workday'}
          </span>
          <button
            onClick={incrementSittingBreak}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            + {t('takeBreakNow')}
          </button>
        </div>
      </div>

      {/* Daily Habits Checklist */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold text-neutral-900">
            {t('dailyChecklist')}
          </h3>
          <span className="text-xs text-neutral-500 font-medium">{today}</span>
        </div>

        <div className="space-y-2">
          {habitsList.map((habit) => {
            const Icon = habit.icon;
            const isChecked = !!todayHabit[habit.key];

            return (
              <div
                key={habit.key}
                onClick={() => toggleHabitCheck(habit.key)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isChecked
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-neutral-50/70 border-neutral-200/80 hover:bg-neutral-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${habit.color}`}>
                    <Icon className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isChecked ? 'text-emerald-950 line-through opacity-80' : 'text-neutral-900'}`}>
                      {habit.label}
                    </div>
                    <div className="text-[11px] text-neutral-500">{habit.desc}</div>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  {isChecked ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <Circle className="w-5 h-5 text-neutral-300" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7-Day Hydration Trend */}
      {last7DaysData.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
          <div className="mb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-600">
              {isBn ? 'গত ৭ দিনের পানি পানের চার্ট (গ্লাস)' : '7-Day Hydration Consistency (Glasses)'}
            </h3>
          </div>
          <SimpleBarChart
            data={last7DaysData}
            targetValue={waterTarget}
            unit="gl"
            barColor="#0284c7"
            targetLabel="Goal"
          />
        </div>
      )}
    </div>
  );
};
