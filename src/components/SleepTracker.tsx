import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useFitnessData, getTodayDateStr } from '../context/FitnessDataContext';
import { SleepLog } from '../types';
import { SimpleBarChart } from './charts/SimpleBarChart';
import {
  Moon,
  Sun,
  Star,
  Trash2,
  Check,
  Pencil,
  AlertCircle,
  X,
} from 'lucide-react';

export const SleepTracker: React.FC = () => {
  const { t, language } = useLanguage();
  const { sleepLogs, addSleep, updateSleep, deleteSleep } = useFitnessData();
  const isBn = language === 'bn';
  const today = getTodayDateStr();
  const formRef = useRef<HTMLDivElement>(null);

  // Form states
  const [editingSleep, setEditingSleep] = useState<SleepLog | null>(null);
  const [bedtime, setBedtime] = useState<string>('23:00');
  const [wakeTime, setWakeTime] = useState<string>('06:30');
  const [quality, setQuality] = useState<number>(4);
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(today);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setErrorMsg(null);
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Calculate duration automatically across midnight
  const calculateDurationMinutes = (start: string, end: string): number => {
    if (!start || !end || !start.includes(':') || !end.includes(':')) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;

    const startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;

    if (endTotal <= startTotal) {
      endTotal += 24 * 60; // next day morning
    }
    return endTotal - startTotal;
  };

  const calculatedMinutes = calculateDurationMinutes(bedtime, wakeTime);
  const calculatedHours = (calculatedMinutes / 60).toFixed(1);

  const handleStartEdit = (log: SleepLog) => {
    setEditingSleep(log);
    setBedtime(log.bedtime);
    setWakeTime(log.wakeTime);
    setQuality(log.quality);
    setDate(log.date);
    setNotes(log.notes || '');
    setErrorMsg(null);
    setFeedbackMsg(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleCancelEdit = () => {
    setEditingSleep(null);
    setBedtime('23:00');
    setWakeTime('06:30');
    setQuality(4);
    setDate(today);
    setNotes('');
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setErrorMsg(
        isBn ? 'অনুগ্রহ করে একটি সঠিক তারিখ নির্বাচন করুন।' : 'Please select a valid date.'
      );
      return;
    }

    if (!bedtime || !wakeTime) {
      setErrorMsg(
        isBn
          ? 'ঘুমানোর সময় এবং ঘুম থেকে ওঠার সময় উল্লেখ করুন।'
          : 'Please specify both bedtime and wake-up time.'
      );
      return;
    }

    if (calculatedMinutes <= 0 || calculatedMinutes > 1440) {
      setErrorMsg(
        isBn
          ? 'ঘুমের সময়কাল ১ মিনিট থেকে ২৪ ঘণ্টার মধ্যে হতে হবে।'
          : 'Sleep duration must be between 1 minute and 24 hours.'
      );
      return;
    }

    if (quality < 1 || quality > 5) {
      setErrorMsg(
        isBn ? 'ঘুমের মান ১ থেকে ৫ এর মধ্যে নির্বাচন করুন।' : 'Sleep quality must be between 1 and 5.'
      );
      return;
    }

    try {
      if (editingSleep) {
        await updateSleep({
          ...editingSleep,
          date,
          bedtime,
          wakeTime,
          durationMinutes: calculatedMinutes,
          quality,
          notes: notes.trim(),
        });
        setEditingSleep(null);
        setNotes('');
        showSuccess(
          isBn
            ? 'ঘুমের রেকর্ড সফলভাবে আপডেট করা হয়েছে!'
            : 'Sleep record updated successfully!'
        );
      } else {
        await addSleep({
          date,
          bedtime,
          wakeTime,
          durationMinutes: calculatedMinutes,
          quality,
          notes: notes.trim(),
        });
        setNotes('');
        showSuccess(
          isBn ? 'ঘুমের রেকর্ড সংরক্ষিত হয়েছে!' : 'Sleep session logged successfully!'
        );
      }
    } catch {
      setErrorMsg(
        isBn
          ? 'ঘুমের রেকর্ড সংরক্ষণ করতে সমস্যা হয়েছে।'
          : 'Failed to save sleep log. Please try again.'
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (editingSleep?.id === id) {
        handleCancelEdit();
      }
      await deleteSleep(id);
      showSuccess(isBn ? 'ঘুমের রেকর্ড মুছে ফেলা হয়েছে।' : 'Sleep record deleted.');
    } catch {
      setErrorMsg(isBn ? 'মুছে ফেলতে সমস্যা হয়েছে।' : 'Failed to delete sleep record.');
    }
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

      {/* Feedback & Error Banners */}
      {feedbackMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl px-4 py-3 text-xs font-bold flex items-center gap-2 shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl px-4 py-3 text-xs font-bold flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Log / Edit Sleep Form */}
      <div
        ref={formRef}
        className={`bg-white rounded-3xl p-5 border shadow-xs transition-all ${
          editingSleep
            ? 'border-indigo-500 ring-2 ring-indigo-500/20'
            : 'border-neutral-200/80'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            {editingSleep && (
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded mb-1">
                {isBn ? 'ঘুমের রেকর্ড সম্পাদনা মোড' : 'Editing Existing Sleep Log'}
              </span>
            )}
            <h3 className="text-sm font-extrabold text-neutral-900">
              {editingSleep
                ? isBn
                  ? `ঘুমের রেকর্ড সম্পাদনা করুন (${editingSleep.date})`
                  : `Edit Sleep Session (${editingSleep.date})`
                : isBn
                ? 'ঘুমের সময় ও মান রেকর্ড করুন'
                : 'Log Sleep Session'}
            </h3>
          </div>

          {editingSleep && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-bold"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('cancel')}</span>
            </button>
          )}
        </div>

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
                max={today}
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

          <div className="flex items-center justify-between pt-1 gap-2">
            <span className="text-[11px] text-neutral-400">
              {isBn ? 'লক্ষ্য: প্রতি রাতে ৭-৮ ঘণ্টা' : 'Goal: 7-8 hours nightly'}
            </span>

            <div className="flex items-center gap-2">
              {editingSleep && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-bold hover:bg-neutral-50"
                >
                  {t('cancel')}
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
              >
                {editingSleep
                  ? isBn
                    ? 'ঘুমের রেকর্ড আপডেট করুন'
                    : 'Update Sleep Log'
                  : t('save')}
              </button>
            </div>
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
          {sleepLogs.map((log) => {
            const isBeingEdited = editingSleep?.id === log.id;
            return (
              <div
                key={log.id}
                className={`py-3 flex items-center justify-between text-xs rounded-xl transition-colors ${
                  isBeingEdited ? 'bg-indigo-50/60 px-2.5' : ''
                }`}
              >
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

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(log)}
                    title={isBn ? 'সম্পাদনা করুন' : 'Edit'}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(log.id)}
                    title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
