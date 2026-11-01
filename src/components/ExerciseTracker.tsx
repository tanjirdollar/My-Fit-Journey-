import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  useFitnessData,
  getTodayDateStr,
  getRecentDatesList,
} from '../context/FitnessDataContext';
import { EXERCISE_GUIDE, ExerciseDefinition } from '../data/exerciseGuide';
import { ExerciseCategory, ExerciseLog } from '../types';
import {
  Dumbbell,
  Footprints,
  Trash2,
  Plus,
  ChevronRight,
  Pencil,
  Calendar,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';

export const ExerciseTracker: React.FC = () => {
  const { t, language } = useLanguage();
  const {
    exerciseLogs,
    addExercise,
    updateExercise,
    deleteExercise,
    activityLogs,
    updateTodayActivity,
  } = useFitnessData();
  const isBn = language === 'bn';
  const today = getTodayDateStr();

  // Task 2: Selected date state (defaults to today's local date)
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const recentDates = useMemo(() => getRecentDatesList(isBn, 7), [isBn]);

  // Feedback banners
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setErrorMsg(null);
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Exercise log form modal (supports both Add and Edit)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingLog, setEditingLog] = useState<ExerciseLog | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition | null>(null);
  const [exerciseCategory, setExerciseCategory] = useState<ExerciseCategory>('walking');
  const [exerciseName, setExerciseName] = useState<string>('');
  const [logDate, setLogDate] = useState<string>(today);
  const [sets, setSets] = useState<number>(3);
  const [reps, setReps] = useState<number>(12);
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [rpe, setRpe] = useState<number>(5);
  const [caloriesBurnedInput, setCaloriesBurnedInput] = useState<number>(50);
  const [isManualCalories, setIsManualCalories] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Selected date's activity steps record
  const selectedDateActivity = useMemo(
    () =>
      activityLogs.find((a) => a.date === selectedDate) || {
        steps: 0,
        walkingDurationMinutes: 0,
        distanceKm: 0,
      },
    [activityLogs, selectedDate]
  );

  const [manualSteps, setManualSteps] = useState<number>(selectedDateActivity.steps || 0);
  const [manualWalkMinutes, setManualWalkMinutes] = useState<number>(
    selectedDateActivity.walkingDurationMinutes || 0
  );
  const [manualDistanceKm, setManualDistanceKm] = useState<number>(
    selectedDateActivity.distanceKm || 0
  );
  const [activitySaved, setActivitySaved] = useState<boolean>(false);

  // Sync activity form fields whenever selectedDate or activityLogs changes
  useEffect(() => {
    setManualSteps(selectedDateActivity.steps || 0);
    setManualWalkMinutes(selectedDateActivity.walkingDurationMinutes || 0);
    setManualDistanceKm(selectedDateActivity.distanceKm || 0);
  }, [
    selectedDate,
    selectedDateActivity.steps,
    selectedDateActivity.walkingDurationMinutes,
    selectedDateActivity.distanceKm,
  ]);

  // Selected date's logged exercises
  const selectedDateExercises = useMemo(
    () => exerciseLogs.filter((e) => e.date === selectedDate),
    [exerciseLogs, selectedDate]
  );
  const totalWorkoutMinutes = selectedDateExercises.reduce(
    (sum, e) => sum + (e.durationMinutes || 0),
    0
  );
  const totalBurnedCals = selectedDateExercises.reduce(
    (sum, e) => sum + (e.caloriesBurned || 0),
    0
  );

  // Auto-calculate estimated calories burned when duration or RPE changes (unless overridden)
  const computeCalories = (
    def: ExerciseDefinition | null,
    dur: number,
    effort: number
  ): number => {
    const rate = def ? def.caloriesBurnedRatePerMin : 4.5;
    return Math.round(rate * Math.max(0, dur) * (effort >= 7 ? 1.2 : 1.0));
  };

  // Open modal to add a new exercise from the library
  const handleOpenAddExerciseModal = (ex: ExerciseDefinition) => {
    setEditingLog(null);
    setSelectedExercise(ex);
    setExerciseCategory(ex.category);
    setExerciseName(isBn ? ex.nameBn : ex.nameEn);
    setLogDate(selectedDate);
    setSets(ex.defaultSets);
    setReps(ex.defaultReps);
    setDurationMinutes(ex.defaultDurationMin);
    setRpe(ex.defaultRpe);
    setIsManualCalories(false);
    setCaloriesBurnedInput(
      computeCalories(ex, ex.defaultDurationMin, ex.defaultRpe)
    );
    setNotes('');
    setModalError(null);
    setIsModalOpen(true);
  };

  // Task 1: Open modal to edit an existing exercise log
  const handleOpenEditExerciseModal = (log: ExerciseLog) => {
    const matchedDef =
      EXERCISE_GUIDE.find((g) => g.category === log.exerciseType) || null;
    setEditingLog(log);
    setSelectedExercise(matchedDef);
    setExerciseCategory(log.exerciseType);
    setExerciseName(log.name);
    setLogDate(log.date);
    setSets(log.sets);
    setReps(log.reps);
    setDurationMinutes(log.durationMinutes);
    setRpe(log.rpe);
    setCaloriesBurnedInput(
      log.caloriesBurned !== undefined
        ? log.caloriesBurned
        : computeCalories(matchedDef, log.durationMinutes, log.rpe)
    );
    setIsManualCalories(false);
    setNotes(log.notes || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleDurationChange = (newDur: number) => {
    setDurationMinutes(newDur);
    if (!isManualCalories) {
      setCaloriesBurnedInput(computeCalories(selectedExercise, newDur, rpe));
    }
  };

  const handleRpeChange = (newRpe: number) => {
    setRpe(newRpe);
    if (!isManualCalories) {
      setCaloriesBurnedInput(
        computeCalories(selectedExercise, durationMinutes, newRpe)
      );
    }
  };

  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const trimmedName = exerciseName.trim();
    if (!trimmedName) {
      setModalError(
        isBn ? 'অনুগ্রহ করে ব্যায়ামের নাম লিখুন।' : 'Please enter an exercise name.'
      );
      return;
    }
    if (!logDate || !/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
      setModalError(
        isBn ? 'অনুগ্রহ করে সঠিক তারিখ নির্বাচন করুন।' : 'Please select a valid date.'
      );
      return;
    }
    if (durationMinutes < 1 || durationMinutes > 600) {
      setModalError(
        isBn
          ? 'ব্যায়ামের সময় ১ থেকে ৬০০ মিনিটের মধ্যে হতে হবে।'
          : 'Duration must be between 1 and 600 minutes.'
      );
      return;
    }
    if (sets < 0 || sets > 100 || reps < 0 || reps > 1000) {
      setModalError(
        isBn
          ? 'সেট (০-১০০) ও রেপস (০-১০০০) সঠিক সীমায় দিন।'
          : 'Sets (0–100) and reps (0–1000) must be within valid ranges.'
      );
      return;
    }
    if (rpe < 1 || rpe > 10) {
      setModalError(
        isBn ? 'কষ্টের মাত্রা (RPE) ১ থেকে ১০ এর মধ্যে হতে হবে।' : 'RPE must be between 1 and 10.'
      );
      return;
    }

    try {
      if (editingLog) {
        await updateExercise({
          ...editingLog,
          date: logDate,
          exerciseType: exerciseCategory,
          name: trimmedName,
          sets,
          reps,
          durationMinutes,
          rpe,
          caloriesBurned: Math.max(0, caloriesBurnedInput),
          notes: notes.trim(),
        });
        showSuccess(
          isBn
            ? 'ব্যায়ামের রেকর্ড সফলভাবে আপডেট করা হয়েছে!'
            : 'Exercise log updated successfully!'
        );
      } else {
        await addExercise({
          date: logDate,
          exerciseType: exerciseCategory,
          name: trimmedName,
          sets,
          reps,
          durationMinutes,
          rpe,
          caloriesBurned: Math.max(0, caloriesBurnedInput),
          notes: notes.trim(),
        });
        showSuccess(
          isBn
            ? 'নতুন ব্যায়াম সফলভাবে সংরক্ষিত হয়েছে!'
            : 'Exercise logged successfully!'
        );
      }

      if (logDate !== selectedDate) {
        setSelectedDate(logDate);
      }
      setIsModalOpen(false);
      setEditingLog(null);
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : isBn
          ? 'সংরক্ষণ করতে সমস্যা হয়েছে।'
          : 'Failed to save exercise log.'
      );
    }
  };

  const handleDeleteExercise = async (id: string) => {
    try {
      await deleteExercise(id);
      showSuccess(
        isBn ? 'ব্যায়ামের রেকর্ড মুছে ফেলা হয়েছে।' : 'Exercise log deleted.'
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to delete exercise log.'
      );
    }
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (
      manualSteps < 0 ||
      manualSteps > 200000 ||
      manualWalkMinutes < 0 ||
      manualWalkMinutes > 720 ||
      manualDistanceKm < 0 ||
      manualDistanceKm > 100
    ) {
      setErrorMsg(
        isBn
          ? 'অনুগ্রহ করে সঠিক স্টেপস (০-২০০০০০), সময় (০-৭২০ মি.) ও দূরত্ব (০-১০০ কিমি) দিন।'
          : 'Please enter valid steps (0–200,000), duration (0–720 mins), and distance (0–100 km).'
      );
      return;
    }

    try {
      await updateTodayActivity(
        manualSteps,
        manualWalkMinutes,
        manualDistanceKm,
        selectedDate
      );
      setActivitySaved(true);
      showSuccess(
        isBn
          ? `${selectedDate} তারিখের স্টেপস ও হাঁটার তথ্য সংরক্ষিত হয়েছে!`
          : `Saved steps & walking activity for ${selectedDate}!`
      );
      setTimeout(() => setActivitySaved(false), 2500);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to update activity.'
      );
    }
  };

  const handleStepsInputChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setManualSteps(safeVal);
    // Rough estimation: 1,350 steps ≈ 1.0 km, 100 steps ≈ 1 min walking
    const approxKm = Number((safeVal / 1350).toFixed(2));
    const approxMins = Math.round(safeVal / 100);
    setManualDistanceKm(approxKm);
    if (
      manualWalkMinutes === 0 ||
      manualWalkMinutes === selectedDateActivity.walkingDurationMinutes
    ) {
      setManualWalkMinutes(approxMins);
    }
  };

  const getRpeDescription = (r: number) => {
    if (r <= 2) return isBn ? 'খুব সহজ / কোনো ক্লান্তি নেই' : 'Very Light / Easy';
    if (r <= 4)
      return isBn
        ? 'হালকা পরিশ্রম / স্বাভাবিক কথা বলা যায়'
        : 'Light effort / Comfortable';
    if (r <= 6)
      return isBn ? 'মাঝারি পরিশ্রম / ঘাম হচ্ছে' : 'Moderate / Sweating slightly';
    if (r <= 8)
      return isBn ? 'কঠিন / পূর্ণ মনোযোগ দরকার' : 'Challenging / Hard work';
    return isBn ? 'সর্বোচ্চ শ্রম / অত্যন্ত ক্লান্তিকর' : 'Maximum Effort';
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Exercise & Workout Header Card + Date Selector */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight font-display">
              {t('exercise')} &amp; {t('activity')}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isBn
                ? 'ডেস্ক কর্মীদের জন্য নিরাপদ কোর স্ট্রেন্থ, স্কোয়াট, প্ল্যাঙ্ক ও দৈনিক হাঁটা'
                : 'Targeted core strength, squats, planks, and active walking for sedentary workers.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold px-3 py-1.5 rounded-xl border border-emerald-200/70 dark:border-emerald-800/70">
              {isBn
                ? 'সাপ্তাহিক লক্ষ্য: ৩টি সেশন'
                : 'Weekly Goal: 3 Strength Sessions'}
            </span>
          </div>
        </div>

        {/* 7-Day Date Selector Scroller + Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {recentDates.map((d) => {
              const isSelected = selectedDate === d.dateStr;
              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(d.dateStr)}
                  className={`min-h-[44px] min-w-[54px] px-3 py-1.5 rounded-xl flex flex-col items-center justify-center transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'bg-neutral-50 dark:bg-neutral-800/70 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <span className="text-[10px] opacity-80">{d.dayLabel}</span>
                  <span className="text-xs font-bold tabular-nums">
                    {d.isToday ? (isBn ? 'আজ' : 'Today') : d.dayNum}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || today)}
              aria-label="Select exercise date"
              className="min-h-[40px] px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 tabular-nums focus:outline-hidden focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Feedback Banners */}
        {feedbackMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 rounded-xl text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-emerald-700 dark:text-emerald-400 font-bold px-2"
            >
              &times;
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 rounded-xl text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-700 dark:text-rose-400 font-bold px-2"
            >
              &times;
            </button>
          </div>
        )}

        {/* Summary of Selected Date's Movement */}
        <div className="grid grid-cols-3 gap-3 bg-neutral-50 dark:bg-neutral-800/70 p-3 rounded-2xl border border-neutral-200/60 dark:border-neutral-800 text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">
              {selectedDate === today
                ? isBn
                  ? 'আজকের ব্যায়াম'
                  : 'Total Exercise'
                : `${selectedDate} Exercise`}
            </div>
            <div className="text-lg font-black text-neutral-900 dark:text-neutral-100 tabular-nums">
              {totalWorkoutMinutes}
            </div>
            <div className="text-[10px] text-neutral-400 font-medium">
              {t('mins')}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-orange-600">
              Calories Burned
            </div>
            <div className="text-lg font-black text-orange-700 tabular-nums">
              {totalBurnedCals}
            </div>
            <div className="text-[10px] text-orange-500 font-medium">kcal</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-teal-600">
              Daily Steps
            </div>
            <div className="text-lg font-black text-teal-800 dark:text-teal-300 tabular-nums">
              {selectedDateActivity.steps}
            </div>
            <div className="text-[10px] text-teal-600 font-medium tabular-nums">
              ~{selectedDateActivity.distanceKm} km
            </div>
          </div>
        </div>
      </div>

      {/* Manual Activity & Steps Tracker Section (Scoped to selectedDate) */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Footprints className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
                {isBn
                  ? `দৈনিক হাঁটা ও স্টেপস লগ (${selectedDate === today ? 'আজ' : selectedDate})`
                  : `Daily Steps & Walking Log (${selectedDate === today ? 'Today' : selectedDate})`}
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {isBn
                ? 'আপনার স্মার্টওয়াচ বা পেডোমিটারের কদম সংখ্যা ও হাঁটার সময় এখানে লিখুন।'
                : 'Enter step count from your pedometer or fitness watch. No background sensor tracking is claimed.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveActivity} className="space-y-3 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                {t('steps')}
              </label>
              <input
                type="number"
                min="0"
                max="200000"
                step="any"
                value={manualSteps}
                onChange={(e) =>
                  handleStepsInputChange(parseInt(e.target.value, 10) || 0)
                }
                placeholder="e.g. 5000"
                className="w-full min-h-[42px] px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                {isBn ? 'হাঁটার সময় (মিনিট)' : 'Walking Duration (mins)'}
              </label>
              <input
                type="number"
                min="0"
                max="720"
                step="any"
                value={manualWalkMinutes}
                onChange={(e) =>
                  setManualWalkMinutes(
                    Math.max(0, parseInt(e.target.value, 10) || 0)
                  )
                }
                placeholder="e.g. 35"
                className="w-full min-h-[42px] px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                {isBn ? 'দূরত্ব (কিলোমিটার)' : 'Distance (km)'}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                max="100"
                value={manualDistanceKm}
                onChange={(e) =>
                  setManualDistanceKm(
                    Math.max(0, parseFloat(e.target.value) || 0)
                  )
                }
                placeholder="e.g. 3.2"
                className="w-full min-h-[42px] px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-neutral-400">
              {isBn
                ? 'দৈনিক লক্ষ্য: ৭,০০০ স্টেপস ও ৩৫ মিনিট হাঁটা'
                : 'Target: 7,000 steps & 35 mins walking'}
            </span>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
            >
              {activitySaved
                ? isBn
                  ? 'সংরক্ষিত!'
                  : 'Saved!'
                : isBn
                ? 'স্টেপস আপডেট করুন'
                : 'Update Activity'}
            </button>
          </div>
        </form>
      </div>

      {/* Curated Exercise Library & Logging Guide */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div className="mb-4">
          <h3 className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {isBn
              ? 'প্রস্তাবিত ব্যায়ামসমূহ (ব্যায়াম নির্বাচন করুন)'
              : 'Targeted Exercise Library (Click to Log)'}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {isBn
              ? 'কোমরের মেদ কমাতে ও বসে কাজ করার জড়তা দূর করতে এই ব্যায়ামগুলো বিশেষভাবে কার্যকর।'
              : 'Specifically recommended for slimming waist circumference and counteracting desk sitting.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {EXERCISE_GUIDE.map((ex) => (
            <div
              key={ex.id}
              onClick={() => handleOpenAddExerciseModal(ex)}
              className="p-3.5 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 hover:border-emerald-500 hover:bg-emerald-50/20 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-black text-xs text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-800 transition-colors">
                    {isBn ? ex.nameBn : ex.nameEn}
                  </div>
                  <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-full">
                    {ex.defaultDurationMin} {t('mins')}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                  {isBn ? ex.descriptionBn : ex.descriptionEn}
                </p>

                <div className="mt-2 text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold bg-emerald-50/80 dark:bg-emerald-950/50 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
                  <span className="font-bold">
                    {isBn ? 'সুবিধা:' : 'Benefit:'}{' '}
                  </span>
                  {isBn ? ex.benefitsBn : ex.benefitsEn}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <span className="text-[10px] text-neutral-400 font-normal">
                  {ex.defaultSets > 1 ? `${ex.defaultSets} sets • ` : ''}
                  {ex.defaultReps > 0
                    ? `${ex.defaultReps} reps`
                    : 'Duration based'}
                </span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>{t('logExercise')}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Date's Logged Workouts List (with Edit & Delete) */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
            {selectedDate === today
              ? isBn
                ? 'আজকের ব্যায়ামের তালিকা'
                : "Today's Logged Exercises"
              : isBn
              ? `${selectedDate} তারিখের ব্যায়ামের তালিকা`
              : `Logged Exercises (${selectedDate})`}
          </h3>
          <span className="text-xs text-neutral-400 tabular-nums">
            {selectedDate}
          </span>
        </div>

        {selectedDateExercises.length === 0 ? (
          <div className="text-center py-6 text-neutral-400 text-xs">
            {isBn
              ? 'এই তারিখে এখনও কোনো ব্যায়াম রেকর্ড করা হয়নি।'
              : 'No workouts logged for this date.'}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {selectedDateExercises.map((log) => (
              <div
                key={log.id}
                onClick={() => handleOpenEditExerciseModal(log)}
                className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-neutral-50/80 px-2 -mx-2 rounded-xl cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {log.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums mt-0.5">
                    {log.sets > 1 ? `${log.sets} sets · ` : ''}
                    {log.reps > 0 ? `${log.reps} reps · ` : ''}
                    {log.durationMinutes} mins · RPE {log.rpe}/10
                    {log.notes ? ` · ${log.notes}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="text-right mr-1">
                    <span className="font-extrabold text-orange-600 tabular-nums">
                      {log.caloriesBurned || 0} kcal
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditExerciseModal(log);
                    }}
                    className="min-h-[40px] min-w-[40px] rounded-xl text-neutral-400 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-colors"
                    title={t('edit')}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteExercise(log.id);
                    }}
                    className="min-h-[40px] min-w-[40px] rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                    title={t('delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log / Edit Exercise Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-100 dark:border-neutral-800 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                  {editingLog
                    ? isBn
                      ? 'ব্যায়াম সম্পাদনা'
                      : 'Edit Exercise Log'
                    : exerciseCategory}
                </span>
                <h3 className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 mt-1">
                  {editingLog
                    ? isBn
                      ? 'ব্যায়ামের তথ্য পরিবর্তন করুন'
                      : 'Update Logged Exercise'
                    : exerciseName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingLog(null);
                  setModalError(null);
                }}
                className="min-h-[40px] min-w-[40px] rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 flex items-center justify-center font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 rounded-xl text-xs font-medium text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExercise} className="space-y-4">
              {/* Exercise Name & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                    {isBn ? 'ব্যায়ামের নাম *' : 'Exercise Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={exerciseName}
                    onChange={(e) => setExerciseName(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                    {isBn ? 'তারিখ *' : 'Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums"
                  />
                </div>
              </div>

              {/* Sets, Reps & Duration */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                    {t('sets')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={sets}
                    onChange={(e) =>
                      setSets(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-full min-h-[40px] px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                    {t('reps')} / Secs
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="any"
                    value={reps}
                    onChange={(e) =>
                      setReps(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-full min-h-[40px] px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                    {t('duration')} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    step="any"
                    required
                    value={durationMinutes}
                    onChange={(e) =>
                      handleDurationChange(
                        Math.max(1, parseInt(e.target.value, 10) || 1)
                      )
                    }
                    className="w-full min-h-[40px] px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums"
                  />
                </div>
              </div>

              {/* Perceived Effort (RPE) Slider & Level */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                    {t('rpeLabel')}
                  </label>
                  <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 tabular-nums">
                    RPE {rpe} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={rpe}
                  onChange={(e) => handleRpeChange(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600"
                />
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
                  {getRpeDescription(rpe)}
                </div>
              </div>

              {/* Editable Estimated Calories Burned & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                    {isBn ? 'বার্ন ক্যালোরি (kcal)' : 'Calories Burned'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    step="any"
                    value={caloriesBurnedInput}
                    onChange={(e) => {
                      setIsManualCalories(true);
                      setCaloriesBurnedInput(
                        Math.max(0, parseInt(e.target.value, 10) || 0)
                      );
                    }}
                    className="w-full min-h-[40px] px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-orange-600 tabular-nums"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                    Workout Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. good form, felt strong in last set"
                    className="w-full min-h-[40px] px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingLog(null);
                    setModalError(null);
                  }}
                  className="w-1/2 min-h-[44px] py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 min-h-[44px] py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs"
                >
                  {editingLog
                    ? isBn
                      ? 'আপডেট সংরক্ষণ'
                      : 'Update Exercise'
                    : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
