import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  useFitnessData,
  getTodayDateStr,
  getRecentDatesList,
} from '../context/FitnessDataContext';
import { SimpleBarChart } from './charts/SimpleBarChart';
import {
  Droplets,
  Armchair,
  CheckCircle2,
  Circle,
  Plus,
  Minus,
  Footprints,
  Salad,
  Moon,
  Dumbbell,
  Utensils,
  Calendar,
  Check,
  AlertCircle,
} from 'lucide-react';

export const HabitsTracker: React.FC = () => {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const {
    habitLogs,
    incrementWater,
    decrementWater,
    incrementSittingBreak,
    decrementSittingBreak,
    toggleHabitCheck,
  } = useFitnessData();
  const isBn = language === 'bn';
  const today = getTodayDateStr();

  // Date selection state (defaults to today's local date)
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const recentDates = getRecentDatesList(isBn, 7);

  // Feedback state
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setErrorMsg(null);
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  // Habits record for the currently selected date
  const selectedDateHabit = habitLogs.find((h) => h.date === selectedDate) || {
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

  const handleWaterIncrement = async () => {
    try {
      await incrementWater(selectedDate);
      showSuccess(
        isBn
          ? `${selectedDate} তারিখের পানি পানের হিসাব আপডেট করা হয়েছে।`
          : `Water intake updated for ${selectedDate}.`
      );
    } catch {
      setErrorMsg(isBn ? 'আপডেট করতে সমস্যা হয়েছে।' : 'Failed to update water intake.');
    }
  };

  const handleWaterDecrement = async () => {
    try {
      await decrementWater(selectedDate);
      showSuccess(
        isBn
          ? `${selectedDate} তারিখের পানি পানের হিসাব আপডেট করা হয়েছে।`
          : `Water intake updated for ${selectedDate}.`
      );
    } catch {
      setErrorMsg(isBn ? 'আপডেট করতে সমস্যা হয়েছে।' : 'Failed to update water intake.');
    }
  };

  const handleBreakIncrement = async () => {
    try {
      await incrementSittingBreak(selectedDate);
      showSuccess(
        isBn
          ? `${selectedDate} তারিখের কাজের বিরতি যোগ করা হয়েছে।`
          : `Sitting break recorded for ${selectedDate}.`
      );
    } catch {
      setErrorMsg(isBn ? 'আপডেট করতে সমস্যা হয়েছে।' : 'Failed to update sitting breaks.');
    }
  };

  const handleBreakDecrement = async () => {
    try {
      await decrementSittingBreak(selectedDate);
      showSuccess(
        isBn
          ? `${selectedDate} তারিখের কাজের বিরতি কমানো হয়েছে।`
          : `Sitting break adjusted for ${selectedDate}.`
      );
    } catch {
      setErrorMsg(isBn ? 'আপডেট করতে সমস্যা হয়েছে।' : 'Failed to update sitting breaks.');
    }
  };

  const handleToggleHabit = async (
    key: 'walkingDone' | 'exerciseDone' | 'mealLogged' | 'vegetableMet' | 'sleepRoutineMet'
  ) => {
    try {
      await toggleHabitCheck(key, selectedDate);
      showSuccess(
        isBn
          ? `${selectedDate} তারিখের অভ্যাসের তালিকা আপডেট করা হয়েছে।`
          : `Habit checklist updated for ${selectedDate}.`
      );
    } catch {
      setErrorMsg(isBn ? 'আপডেট করতে সমস্যা হয়েছে।' : 'Failed to update habit checklist.');
    }
  };

  // Water weekly chart data (sorted chronologically, last 7 logged days)
  const sortedHabits = [...habitLogs].sort((a, b) => a.date.localeCompare(b.date));
  const last7DaysData = sortedHabits.slice(-7).map((h) => ({
    label: h.date.slice(5),
    value: h.waterGlasses,
  }));

  const completedCount = habitsList.filter((h) => !!selectedDateHabit[h.key]).length;

  return (
    <div className="space-y-5 pb-16">
      {/* Habits Header & Date Selector */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight font-display">
              {t('habits')} &amp; {isBn ? 'জীবনধারা' : 'Lifestyle Habits'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isBn
                ? 'স্থায়ীভাবে পেট কমাতে ও সুস্থ থাকতে দৈনন্দিন ছোট ছোট অভ্যাসের ধারাবাহিকতা'
                : 'Sustainable fat reduction through daily hydration, sitting relief, and consistent routines.'}
            </p>
          </div>

          {/* Custom Date Input Picker */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 absolute left-3 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                aria-label={isBn ? 'তারিখ নির্বাচন করুন' : 'Select date'}
                className="pl-8 pr-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            {selectedDate !== today && (
              <button
                type="button"
                onClick={() => setSelectedDate(today)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 text-[11px] font-bold hover:bg-emerald-100 transition-colors"
              >
                {isBn ? 'আজ' : 'Today'}
              </button>
            )}
          </div>
        </div>

        {/* 7-Day Quick Date Selector Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {recentDates.map((d) => {
            const isSelected = d.dateStr === selectedDate;
            const hasHabitLog = habitLogs.some(
              (h) =>
                h.date === d.dateStr &&
                (h.waterGlasses > 0 ||
                  h.sittingBreaks > 0 ||
                  h.walkingDone ||
                  h.exerciseDone ||
                  h.mealLogged ||
                  h.vegetableMet ||
                  h.sleepRoutineMet)
            );
            return (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => setSelectedDate(d.dateStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-neutral-50 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-400 border-neutral-200/70 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <span>{d.isToday ? d.dayLabel : `${d.dayLabel} ${d.dayNum}`}</span>
                {hasHabitLog && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-emerald-200' : 'bg-emerald-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200 rounded-2xl px-4 py-3 text-xs font-bold flex items-center gap-2 shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-300 rounded-2xl px-4 py-3 text-xs font-bold flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Hydration Tracker Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
                  {isBn ? 'পানি পান ট্র্যাকার (Hydration)' : 'Daily Water Tracker'}
                </h3>
                <span className="text-[10px] font-bold text-sky-700">
                  {selectedDate === today
                    ? isBn
                      ? 'আজকের হিসাব'
                      : 'Today'
                    : selectedDate}
                </span>
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {isBn
                ? '১ গ্লাস ≈ ২৫০ মিলি। মেটাবলিজম ও হজমের জন্য দৈনিক ৯ গ্লাস (২.২৫ লিটার) পানি পান করুন।'
                : '1 glass ≈ 250ml. Drink 9 glasses (~2.25L) daily to support metabolism and digestion.'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-sky-900">{selectedDateHabit.waterGlasses}</span>
            <span className="text-xs text-neutral-400 font-semibold"> / {waterTarget}</span>
            <div className="text-[10px] text-sky-700 font-medium">
              ~{(selectedDateHabit.waterGlasses * 0.25).toFixed(2)} Liters
            </div>
          </div>
        </div>

        {/* Visual Glass Counter Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 my-4">
          {Array.from({ length: Math.max(waterTarget, selectedDateHabit.waterGlasses) }).map((_, idx) => {
            const isFilled = idx < selectedDateHabit.waterGlasses;
            return (
              <button
                key={idx}
                type="button"
                onClick={
                  isFilled && idx === selectedDateHabit.waterGlasses - 1
                    ? handleWaterDecrement
                    : handleWaterIncrement
                }
                className={`h-11 rounded-xl flex flex-col items-center justify-center border transition-all ${
                  isFilled
                    ? 'bg-sky-500 border-sky-600 text-white shadow-2xs scale-100'
                    : 'bg-neutral-50 dark:bg-neutral-800/70 border-neutral-200/80 dark:border-neutral-800 text-neutral-300 hover:border-sky-300'
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
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={handleWaterDecrement}
            disabled={selectedDateHabit.waterGlasses === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800/70 disabled:opacity-40"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>- 1 {isBn ? 'গ্লাস' : 'Glass'}</span>
          </button>

          <button
            type="button"
            onClick={handleWaterIncrement}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ 1 {isBn ? 'গ্লাস পানি পান করেছি' : 'Add Glass'}</span>
          </button>
        </div>
      </div>

      {/* Sedentary Desk Sitting Relief Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
                {isBn ? 'ডেস্কে কাজের বিরতি ও হাঁটা' : 'Sedentary Work & Desk Breaks'}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                {isBn
                  ? 'একটানা ৮ ঘণ্টা বসে কাজ করলে রক্তে ইনসুলিন অকার্যকর হয় এবং পেটে মেদ জমে। প্রতি ৫০ মিনিট পর চেয়ার ছেড়ে ২ মিনিট হালকা হাঁটুন।'
                  : 'Prolonged sitting blunts glucose clearance and concentrates visceral fat. Stand and walk for 2 minutes every hour.'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-2xl font-black text-amber-900 dark:text-amber-200">{selectedDateHabit.sittingBreaks}</span>
            <div className="text-[10px] text-neutral-400 font-semibold">{t('breakCounter')}</div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
            {isBn ? 'লক্ষ্য: অন্তত ৫-৬ বার বিরতি নেওয়া' : 'Target: 5-6 short breaks during workday'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBreakDecrement}
              disabled={selectedDateHabit.sittingBreaks === 0}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800/70 disabled:opacity-40"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>- 1</span>
            </button>
            <button
              type="button"
              onClick={handleBreakIncrement}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              + {t('takeBreakNow')}
            </button>
          </div>
        </div>
      </div>

      {/* Daily Habits Checklist */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
              {t('dailyChecklist')}
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isBn
                ? `সম্পন্ন হয়েছে: ${completedCount} / ${habitsList.length}`
                : `Completed: ${completedCount} / ${habitsList.length}`}
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            {selectedDate}
          </span>
        </div>

        <div className="space-y-2">
          {habitsList.map((habit) => {
            const Icon = habit.icon;
            const isChecked = !!selectedDateHabit[habit.key];

            return (
              <div
                key={habit.key}
                onClick={() => handleToggleHabit(habit.key)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isChecked
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/70'
                    : 'bg-neutral-50/70 dark:bg-neutral-800/60 border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${habit.color}`}>
                    <Icon className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isChecked ? 'text-emerald-950 dark:text-emerald-200 line-through opacity-80' : 'text-neutral-900 dark:text-neutral-100'}`}>
                      {habit.label}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{habit.desc}</div>
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
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="mb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
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
