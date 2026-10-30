import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useFitnessData, getTodayDateStr } from '../context/FitnessDataContext';
import { EXERCISE_GUIDE, ExerciseDefinition } from '../data/exerciseGuide';
import { ExerciseCategory, ExerciseLog } from '../types';
import {
  Dumbbell,
  Footprints,
  Play,
  CheckCircle2,
  Trash2,
  Plus,
  Flame,
  Info,
  Sliders,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export const ExerciseTracker: React.FC = () => {
  const { t, language } = useLanguage();
  const {
    exerciseLogs,
    addExercise,
    deleteExercise,
    activityLogs,
    updateTodayActivity,
  } = useFitnessData();
  const isBn = language === 'bn';
  const today = getTodayDateStr();

  // Exercise log form modal
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition | null>(null);
  const [sets, setSets] = useState<number>(3);
  const [reps, setReps] = useState<number>(12);
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [rpe, setRpe] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');

  // Activity steps form
  const todayActivity = activityLogs.find((a) => a.date === today) || {
    steps: 0,
    walkingDurationMinutes: 0,
    distanceKm: 0,
  };
  const [manualSteps, setManualSteps] = useState<number>(todayActivity.steps || 0);
  const [manualWalkMinutes, setManualWalkMinutes] = useState<number>(
    todayActivity.walkingDurationMinutes || 0
  );
  const [manualDistanceKm, setManualDistanceKm] = useState<number>(
    todayActivity.distanceKm || 0
  );
  const [activitySaved, setActivitySaved] = useState<boolean>(false);

  // Today's exercises
  const todayExercises = exerciseLogs.filter((e) => e.date === today);
  const totalWorkoutMinutes = todayExercises.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
  const totalBurnedCals = todayExercises.reduce((sum, e) => sum + (e.caloriesBurned || 0), 0);

  const handleOpenExerciseModal = (ex: ExerciseDefinition) => {
    setSelectedExercise(ex);
    setSets(ex.defaultSets);
    setReps(ex.defaultReps);
    setDurationMinutes(ex.defaultDurationMin);
    setRpe(ex.defaultRpe);
    setNotes('');
  };

  const handleSaveExercise = async () => {
    if (!selectedExercise) return;
    const caloriesBurned = Math.round(
      selectedExercise.caloriesBurnedRatePerMin * durationMinutes * (rpe >= 7 ? 1.2 : 1.0)
    );

    await addExercise({
      date: today,
      exerciseType: selectedExercise.category,
      name: isBn ? selectedExercise.nameBn : selectedExercise.nameEn,
      sets,
      reps,
      durationMinutes,
      rpe,
      caloriesBurned,
      notes,
    });

    setSelectedExercise(null);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTodayActivity(manualSteps, manualWalkMinutes, manualDistanceKm);
    setActivitySaved(true);
    setTimeout(() => setActivitySaved(false), 2500);
  };

  const handleStepsInputChange = (val: number) => {
    setManualSteps(val);
    // Rough estimation: 1,350 steps ≈ 1.0 km, 100 steps ≈ 1 min walking
    const approxKm = Number((val / 1350).toFixed(2));
    const approxMins = Math.round(val / 100);
    setManualDistanceKm(approxKm);
    if (manualWalkMinutes === 0 || manualWalkMinutes === todayActivity.walkingDurationMinutes) {
      setManualWalkMinutes(approxMins);
    }
  };

  const getRpeDescription = (r: number) => {
    if (r <= 2) return isBn ? 'খুব সহজ / কোনো ক্লান্তি নেই' : 'Very Light / Easy';
    if (r <= 4) return isBn ? 'হালকা পরিশ্রম / স্বাভাবিক কথা বলা যায়' : 'Light effort / Comfortable';
    if (r <= 6) return isBn ? 'মাঝারি পরিশ্রম / ঘাম হচ্ছে' : 'Moderate / Sweating slightly';
    if (r <= 8) return isBn ? 'কঠিন / পূর্ণ মনোযোগ দরকার' : 'Challenging / Hard work';
    return isBn ? 'সর্বোচ্চ শ্রম / অত্যন্ত ক্লান্তিকর' : 'Maximum Effort';
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Exercise & Workout Header Card */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-neutral-900 tracking-tight font-display">
              {t('exercise')} &amp; {t('activity')}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isBn
                ? 'ডেস্ক কর্মীদের জন্য নিরাপদ কোর স্ট্রেন্থ, স্কোয়াট, প্ল্যাঙ্ক ও দৈনিক হাঁটা'
                : 'Targeted core strength, squats, planks, and active walking for sedentary workers.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="bg-emerald-50 text-emerald-800 font-bold px-3 py-1.5 rounded-xl border border-emerald-200/70">
              {isBn ? 'সাপ্তাহিক লক্ষ্য: ৩টি সেশন' : 'Weekly Goal: 3 Strength Sessions'}
            </span>
          </div>
        </div>

        {/* Summary of Today's Movement */}
        <div className="grid grid-cols-3 gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-200/60 text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">Total Exercise</div>
            <div className="text-lg font-black text-neutral-900">{totalWorkoutMinutes}</div>
            <div className="text-[10px] text-neutral-400 font-medium">{t('mins')}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-orange-600">Calories Burned</div>
            <div className="text-lg font-black text-orange-700">{totalBurnedCals}</div>
            <div className="text-[10px] text-orange-500 font-medium">kcal</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-teal-600">Daily Steps</div>
            <div className="text-lg font-black text-teal-800">{todayActivity.steps}</div>
            <div className="text-[10px] text-teal-600 font-medium">~{todayActivity.distanceKm} km</div>
          </div>
        </div>
      </div>

      {/* Manual Activity & Steps Tracker Section */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Footprints className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-extrabold text-neutral-900">
                {isBn ? 'দৈনিক হাঁটা ও স্টেপস লগ (ম্যানুয়াল এন্ট্রি)' : 'Daily Steps & Walking Log (Manual Entry)'}
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {isBn
                ? 'আপনার স্মার্টওয়াচ বা পেডোমিটারের কদম সংখ্যা ও হাঁটার সময় এখানে লিখুন।'
                : 'Enter step count from your pedometer or fitness watch. No background sensor tracking is claimed.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveActivity} className="space-y-3 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {t('steps')}
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={manualSteps}
                onChange={(e) => handleStepsInputChange(parseInt(e.target.value) || 0)}
                placeholder="e.g. 5000"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {isBn ? 'হাঁটার সময় (মিনিট)' : 'Walking Duration (mins)'}
              </label>
              <input
                type="number"
                min="0"
                value={manualWalkMinutes}
                onChange={(e) => setManualWalkMinutes(parseInt(e.target.value) || 0)}
                placeholder="e.g. 35"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {isBn ? 'দূরত্ব (কিলোমিটার)' : 'Distance (km)'}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={manualDistanceKm}
                onChange={(e) => setManualDistanceKm(parseFloat(e.target.value) || 0)}
                placeholder="e.g. 3.2"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-neutral-400">
              {isBn ? 'দৈনিক লক্ষ্য: ৭,০০০ স্টেপস ও ৩৫ মিনিট হাঁটা' : 'Target: 7,000 steps & 35 mins walking'}
            </span>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
            >
              {activitySaved ? (isBn ? 'সংরক্ষিত!' : 'Saved!') : isBn ? 'স্টেপস আপডেট করুন' : 'Update Activity'}
            </button>
          </div>
        </form>
      </div>

      {/* Curated Exercise Library & Logging Guide */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <div className="mb-4">
          <h3 className="text-sm font-extrabold text-neutral-900 tracking-tight">
            {isBn ? 'প্রস্তাবিত ব্যায়ামসমূহ (ব্যায়াম নির্বাচন করুন)' : 'Targeted Exercise Library (Click to Log)'}
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isBn
              ? 'কোমরের মেদ কমাতে ও বসে কাজ করার জড়তা দূর করতে এই ব্যায়ামগুলো বিশেষভাবে কার্যকর।'
              : 'Specifically recommended for slimming waist circumference and counteracting desk sitting.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {EXERCISE_GUIDE.map((ex) => (
            <div
              key={ex.id}
              onClick={() => handleOpenExerciseModal(ex)}
              className="p-3.5 rounded-2xl border border-neutral-200/70 hover:border-emerald-500 hover:bg-emerald-50/20 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-black text-xs text-neutral-900 group-hover:text-emerald-800 transition-colors">
                    {isBn ? ex.nameBn : ex.nameEn}
                  </div>
                  <span className="text-[10px] font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full">
                    {ex.defaultDurationMin} {t('mins')}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-600 line-clamp-2 leading-relaxed">
                  {isBn ? ex.descriptionBn : ex.descriptionEn}
                </p>

                <div className="mt-2 text-[10px] text-emerald-800 font-semibold bg-emerald-50/80 p-2 rounded-xl border border-emerald-100">
                  <span className="font-bold">{isBn ? 'সুবিধা:' : 'Benefit:'} </span>
                  {isBn ? ex.benefitsBn : ex.benefitsEn}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                <span className="text-[10px] text-neutral-400 font-normal">
                  {ex.defaultSets > 1 ? `${ex.defaultSets} sets • ` : ''}
                  {ex.defaultReps > 0 ? `${ex.defaultReps} reps` : 'Duration based'}
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

      {/* Today's Logged Workouts List */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <h3 className="text-sm font-extrabold text-neutral-900 mb-3">
          {isBn ? 'আজকের ব্যায়ামের তালিকা' : "Today's Logged Exercises"}
        </h3>

        {todayExercises.length === 0 ? (
          <div className="text-center py-6 text-neutral-400 text-xs">
            {isBn ? 'আজ এখনও কোনো ব্যায়াম রেকর্ড করা হয়নি।' : 'No workouts logged yet today.'}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {todayExercises.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-neutral-900">{log.name}</div>
                  <div className="text-[11px] text-neutral-400">
                    {log.sets > 1 ? `${log.sets} sets • ` : ''}
                    {log.reps > 0 ? `${log.reps} reps • ` : ''}
                    {log.durationMinutes} mins • RPE {log.rpe}/10
                    {log.notes ? ` • ${log.notes}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-extrabold text-orange-600">
                      {log.caloriesBurned || 0} kcal
                    </span>
                  </div>
                  <button
                    onClick={() => deleteExercise(log.id)}
                    className="p-1 rounded-md text-neutral-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Exercise Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-neutral-100 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {selectedExercise.category}
                </span>
                <h3 className="text-base font-extrabold text-neutral-900 mt-1">
                  {isBn ? selectedExercise.nameBn : selectedExercise.nameEn}
                </h3>
              </div>
              <button
                onClick={() => setSelectedExercise(null)}
                className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center font-bold"
              >
                &times;
              </button>
            </div>

            {/* Sets & Reps */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  {t('sets')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={sets}
                  onChange={(e) => setSets(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  {t('reps')} / Secs
                </label>
                <input
                  type="number"
                  min="0"
                  value={reps}
                  onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  {t('duration')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900"
                />
              </div>
            </div>

            {/* Perceived Effort (RPE) Slider & Level */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-neutral-600">
                  {t('rpeLabel')}
                </label>
                <span className="text-xs font-extrabold text-emerald-800">
                  RPE {rpe} / 10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={rpe}
                onChange={(e) => setRpe(parseInt(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="text-[10px] text-neutral-500 mt-1 font-medium">
                {getRpeDescription(rpe)}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Workout Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. good form, felt strong in last set"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs"
              />
            </div>

            {/* Estimated Burn Notice */}
            <div className="text-[11px] text-neutral-500 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/60 flex items-center justify-between">
              <span>Estimated Calories Burned:</span>
              <span className="font-extrabold text-orange-600 text-xs">
                ~{Math.round(selectedExercise.caloriesBurnedRatePerMin * durationMinutes * (rpe >= 7 ? 1.2 : 1.0))} kcal
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedExercise(null)}
                className="w-1/2 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-bold"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveExercise}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
