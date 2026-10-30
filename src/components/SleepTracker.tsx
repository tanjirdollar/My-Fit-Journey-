import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useFitnessData, getTodayDateStr } from '../context/FitnessDataContext';
import { SimpleBarChart } from './charts/SimpleBarChart';
import {
  Moon,
  Sun,
  Clock,
  Star,
  Trash2,
  Plus,
  Check,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const SleepTracker: React.FC = () => {
  const { t, language } = useLanguage();
  const { sleepLogs, addSleep, deleteSleep } = useFitnessData();
  const isBn = language === 'bn';
  const today = getTodayDateStr();

  // Form states
  const [bedtime, setBedtime] = useState<string>('23:00');
  const [wakeTime, setWakeTime] = useState<string>('06:30');
  const [quality, setQuality] = useState<number>(4);
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(today);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Calculate duration automatically across midnight
  const calculateDurationMinutes = (start: string, end: string): number => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;

    if (endTotal <= startTotal) {
      endTotal += 24 * 60; // next day morning
    }
    return endTotal - startTotal;
  };

  const calculatedMinutes = calculateDurationMinutes(bedtime, wakeTime);
  const calculatedHours = (calculatedMinutes / 60).toFixed(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addSleep({
      date,
      bedtime,
      wakeTime,
      durationMinutes: calculatedMinutes,
      quality,
      notes,
    });
    setSavedSuccess(true);
    setNotes('');
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Recent sleep
  const latestSleep = sleepLogs[0];
  const avgDurationHours =
    sleepLogs.length > 0
      ? (
          sleepLogs.slice(0, 7).reduce((sum, s) => sum + s.durationMinutes, 0) /
          Math.min(7, sleepLogs.length) /
          60
        ).toFixed(1)
      : '7.5';

  const chartData = sleepLogs
    .slice(0, 7)
    .reverse()
    .map((s) => ({
      label: s.date.slice(5),
      value: Number((s.durationMinutes / 60).toFixed(1)),
    }));

  const qualityLabels = [
    '',
    isBn ? 'খারাপ / অস্থির ঘুম' : 'Poor / Restless',
    isBn ? 'চলনসই / বারবার ঘুম ভেঙেছে' : 'Fair / Woke up often',
    isBn ? 'ভালো ঘুম' : 'Good Sleep',
    isBn ? 'খুব প্রশান্তিময় ও ফ্রেশ' : 'Very Restful & Refreshed',
    isBn ? 'নিখুঁত ও গভীর ঘুম' : 'Optimal & Deep',
  ];

  return (
    <div className="space-y-5 pb-16">
      {/* Sleep Header */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-neutral-900 tracking-tight font-display">
              {t('sleep')}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isBn
                ? 'পেটের মেদ কমাতে ও কর্টিসল হরমোন নিয়ন্ত্রণে ৭-৮ ঘণ্টা নিয়মিত গভীর ঘুম অপরিহার্য।'
                : 'Crucial for cortisol regulation, insulin sensitivity, and visceral fat reduction.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-indigo-50 text-indigo-900 px-3 py-1.5 rounded-xl border border-indigo-200/60">
              {isBn ? `৭ দিনের গড়: ${avgDurationHours} ঘণ্টা` : `7-Day Avg: ${avgDurationHours} hrs`}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60 text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">Last Night</div>
            <div className="text-xl font-black text-neutral-900">
              {latestSleep ? `${Math.floor(latestSleep.durationMinutes / 60)}h ${latestSleep.durationMinutes % 60}m` : '7h 30m'}
            </div>
            <div className="text-[10px] text-neutral-400 font-medium">duration</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-indigo-700">Bedtime</div>
            <div className="text-xl font-black text-indigo-900">
              {latestSleep ? latestSleep.bedtime : '23:15'}
            </div>
            <div className="text-[10px] text-indigo-600 font-medium">target: 23:00</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-700">Quality</div>
            <div className="text-xl font-black text-amber-900">
              {latestSleep ? `${latestSleep.quality} / 5` : '4 / 5'} ★
            </div>
            <div className="text-[10px] text-amber-600 font-medium">restful</div>
          </div>
        </div>
      </div>

      {/* Log Sleep Form */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <h3 className="text-sm font-extrabold text-neutral-900 mb-3">
          {isBn ? 'ঘুমের সময় ও মান রেকর্ড করুন' : 'Log Sleep Session'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {t('bedtime')}
              </label>
              <div className="relative">
                <Moon className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  value={bedtime}
                  onChange={(e) => setBedtime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {t('wakeTime')}
              </label>
              <div className="relative">
                <Sun className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Date / তারিখ
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                required
              />
            </div>
          </div>

          {/* Auto Calculated Duration & Quality stars */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-neutral-500">Auto Duration: </span>
              <span className="text-sm font-black text-neutral-900">
                {Math.floor(calculatedMinutes / 60)} hrs {calculatedMinutes % 60} mins
              </span>
              <span className="text-xs text-neutral-400 ml-1.5">({calculatedHours} hrs)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-neutral-600 mr-1">Quality:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setQuality(star)}
                  className="p-1 text-amber-400 hover:scale-125 transition-transform"
                >
                  <Star
                    className={`w-4 h-4 ${
                      star <= quality ? 'fill-amber-400 text-amber-500' : 'text-neutral-300'
                    }`}
                  />
                </button>
              ))}
              <span className="text-[10px] font-semibold text-neutral-600 ml-1">
                {qualityLabels[quality]}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1">
              Sleep Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. no screen after 10:30 PM, woke up naturally refreshed"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {savedSuccess ? (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> {isBn ? 'ঘুমের রেকর্ড সংরক্ষিত হয়েছে!' : 'Sleep logged!'}
              </span>
            ) : (
              <span className="text-[11px] text-neutral-400">
                {isBn ? 'লক্ষ্য: প্রতি রাতে ৭-৮ ঘণ্টা' : 'Goal: 7-8 hours nightly'}
              </span>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              {t('save')}
            </button>
          </div>
        </form>
      </div>

      {/* 7-Day Sleep Duration Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
          <div className="mb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-600">
              {isBn ? 'গত ৭ দিনের ঘুমের সময় (ঘণ্টা)' : '7-Day Sleep Duration (Hours)'}
            </h3>
          </div>
          <SimpleBarChart
            data={chartData}
            targetValue={7.5}
            unit="h"
            barColor="#6366f1"
            targetLabel="Goal"
          />
        </div>
      )}

      {/* Sleep Logs History */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <h3 className="text-sm font-extrabold text-neutral-900 mb-3">
          {isBn ? 'ঘুমের ইতিহাস' : 'Sleep History'}
        </h3>

        <div className="divide-y divide-neutral-100">
          {sleepLogs.map((log) => (
            <div key={log.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-900">{log.date}</span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                    {Math.floor(log.durationMinutes / 60)}h {log.durationMinutes % 60}m
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {log.bedtime} - {log.wakeTime} ({log.quality}/5 ★)
                  {log.notes ? ` • ${log.notes}` : ''}
                </div>
              </div>

              <button
                onClick={() => deleteSleep(log.id)}
                className="p-1 rounded-md text-neutral-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
