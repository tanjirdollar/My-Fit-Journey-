import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useFitnessData, getTodayDateStr } from '../context/FitnessDataContext';
import { BodyMeasurement } from '../types';
import { WhTrGauge } from './WhTrGauge';
import { SimpleLineChart } from './charts/SimpleLineChart';
import {
  Trash2,
  Check,
  Pencil,
  AlertCircle,
  X,
} from 'lucide-react';

export const BodyMeasurements: React.FC = () => {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const {
    bodyMeasurements,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
  } = useFitnessData();
  const isBn = language === 'bn';
  const today = getTodayDateStr();
  const formRef = useRef<HTMLDivElement>(null);

  // Form states
  const [editingMeasurement, setEditingMeasurement] = useState<BodyMeasurement | null>(null);
  const [weightInput, setWeightInput] = useState<string>('63.0');
  const [waistInput, setWaistInput] = useState<string>('88.0');
  const [dateInput, setDateInput] = useState<string>(today);
  const [notesInput, setNotesInput] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Numeric values for dynamic preview
  const numericWeight = parseFloat(weightInput) || 0;
  const numericWaist = parseFloat(waistInput) || 0;
  const heightM = (profile.heightCm || 165) / 100;
  const calculatedBmi =
    numericWeight > 0 ? Number((numericWeight / (heightM * heightM)).toFixed(2)) : 0;
  const calculatedWhtr =
    numericWaist > 0 ? Number((numericWaist / (profile.heightCm || 165)).toFixed(3)) : 0;

  const showSuccess = (msg: string) => {
    setErrorMsg(null);
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleStartEdit = (item: BodyMeasurement) => {
    setEditingMeasurement(item);
    setWaistInput(String(item.waistCm));
    setWeightInput(String(item.weightKg));
    setDateInput(item.date);
    setNotesInput(item.notes || '');
    setErrorMsg(null);
    setFeedbackMsg(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleCancelEdit = () => {
    setEditingMeasurement(null);
    setWaistInput('88.0');
    setWeightInput('63.0');
    setDateInput(today);
    setNotesInput('');
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const waistVal = Number(parseFloat(waistInput).toFixed(1));
    const weightVal = Number(parseFloat(weightInput).toFixed(1));

    if (!dateInput || !/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      setErrorMsg(
        isBn ? 'অনুগ্রহ করে একটি সঠিক তারিখ নির্বাচন করুন।' : 'Please select a valid date.'
      );
      return;
    }

    if (isNaN(waistVal) || waistVal < 30 || waistVal > 250) {
      setErrorMsg(
        isBn
          ? 'কোমরের পরিধি ৩০ থেকে ২৫০ সেমি-এর মধ্যে হতে হবে।'
          : 'Waist circumference must be between 30 cm and 250 cm.'
      );
      return;
    }

    if (isNaN(weightVal) || weightVal < 20 || weightVal > 300) {
      setErrorMsg(
        isBn
          ? 'ওজন ২০ থেকে ৩০০ কেজি-এর মধ্যে হতে হবে।'
          : 'Weight must be between 20 kg and 300 kg.'
      );
      return;
    }

    const bmiVal = Number((weightVal / (heightM * heightM)).toFixed(2));
    const whtrVal = Number((waistVal / (profile.heightCm || 165)).toFixed(3));

    try {
      if (editingMeasurement) {
        await updateMeasurement({
          ...editingMeasurement,
          date: dateInput,
          weightKg: weightVal,
          waistCm: waistVal,
          bmi: bmiVal,
          waistToHeightRatio: whtrVal,
          notes: notesInput.trim(),
        });
        setEditingMeasurement(null);
        setNotesInput('');
        showSuccess(
          isBn
            ? 'পরিমাপটি সফলভাবে আপডেট করা হয়েছে!'
            : 'Body measurement updated successfully!'
        );
      } else {
        await addMeasurement({
          date: dateInput,
          weightKg: weightVal,
          waistCm: waistVal,
          bmi: bmiVal,
          waistToHeightRatio: whtrVal,
          notes: notesInput.trim(),
        });
        setNotesInput('');
        showSuccess(
          isBn ? 'নতুন পরিমাপ সফলভাবে সংরক্ষিত হয়েছে!' : 'New measurement recorded!'
        );
      }
    } catch {
      setErrorMsg(
        isBn
          ? 'পরিমাপ সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
          : 'Failed to save measurement. Please try again.'
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (editingMeasurement?.id === id) {
        handleCancelEdit();
      }
      await deleteMeasurement(id);
      showSuccess(isBn ? 'পরিমাপ মুছে ফেলা হয়েছে।' : 'Measurement deleted.');
    } catch {
      setErrorMsg(isBn ? 'মুছে ফেলতে সমস্যা হয়েছে।' : 'Failed to delete measurement.');
    }
  };

  // Prepare chart data (sorted chronologically)
  const sortedMeasurements = [...bodyMeasurements].sort((a, b) => a.date.localeCompare(b.date));

  const waistChartData = sortedMeasurements.map((m) => ({
    date: m.date,
    value: m.waistCm,
  }));

  const weightChartData = sortedMeasurements.map((m) => ({
    date: m.date,
    value: m.weightKg,
  }));

  const latest = sortedMeasurements[sortedMeasurements.length - 1] || {
    weightKg: 63,
    waistCm: 88,
    bmi: 23.14,
    waistToHeightRatio: 0.533,
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Overview Banner */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight font-display">
              {t('body')}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isBn
                ? 'কোমরের পরিধি ও স্বাস্থ্য নির্দেশক (WHtR) পর্যবেক্ষণ'
                : 'Waist circumference & Waist-to-Height Ratio (WHtR) tracking.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 rounded-xl">
              Height: {profile.heightCm} cm
            </span>
          </div>
        </div>

        {/* Current Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 dark:bg-neutral-800/70 p-3.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-800">
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">{t('waistline')}</div>
            <div className="text-xl font-black text-neutral-900 dark:text-neutral-100">{latest.waistCm} cm</div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Target: {profile.targetWaistCm} cm</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">{t('weight')}</div>
            <div className="text-xl font-black text-neutral-900 dark:text-neutral-100">{latest.weightKg} kg</div>
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Maintain ~63kg</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">{t('bmi')}</div>
            <div className="text-xl font-black text-neutral-900 dark:text-neutral-100">{latest.bmi}</div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">{t('normal')} (18.5 - 24.9)</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">{t('whtrRatio')}</div>
            <div className="text-xl font-black text-amber-800 dark:text-amber-300">{latest.waistToHeightRatio}</div>
            <div className="text-[10px] text-amber-600 font-medium">Ideal: &lt; 0.500</div>
          </div>
        </div>
      </div>

      {/* Feedback & Error Banners */}
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

      {/* WHtR Visual Gauge */}
      <WhTrGauge
        waistCm={latest.waistCm}
        heightCm={profile.heightCm}
        targetWaistCm={profile.targetWaistCm}
      />

      {/* Log / Edit Measurement Form */}
      <div
        ref={formRef}
        className={`bg-white dark:bg-neutral-900 rounded-3xl p-5 border shadow-xs transition-all ${
          editingMeasurement
            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
            : 'border-neutral-200/80 dark:border-neutral-800'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            {editingMeasurement && (
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded mb-1">
                {isBn ? 'পরিমাপ সম্পাদনা মোড' : 'Editing Existing Record'}
              </span>
            )}
            <h3 className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
              {editingMeasurement
                ? isBn
                  ? `পরিমাপ সম্পাদনা করুন (${editingMeasurement.date})`
                  : `Edit Measurement (${editingMeasurement.date})`
                : isBn
                ? 'নতুন পরিমাপ রেকর্ড করুন'
                : 'Record New Measurement'}
            </h3>
          </div>

          {editingMeasurement && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-xs font-bold"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('cancel')}</span>
            </button>
          )}
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          {isBn
            ? 'সকালে খালি পেটে নাভির সমান্তরালে মেপে কোমরের মাপ লিখুন।'
            : 'Measure waist horizontally at the midpoint between lowest rib and iliac crest (usually at navel level).'}
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                {t('waistline')} (cm) *
              </label>
              <input
                type="number"
                step="any"
                min="30"
                max="250"
                value={waistInput}
                onChange={(e) => setWaistInput(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                {t('weight')} (kg) *
              </label>
              <input
                type="number"
                step="any"
                min="20"
                max="300"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                Date / তারিখ *
              </label>
              <input
                type="date"
                value={dateInput}
                max={today}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                required
              />
            </div>
          </div>

          {/* Dynamic feedback indicator */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/70 rounded-xl border border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">Calculated BMI: </span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100">{calculatedBmi}</span>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">Calculated WHtR: </span>
              <span className={`font-black ${calculatedWhtr < 0.5 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                {calculatedWhtr}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="e.g. morning measurement, feeling lighter"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="flex items-center justify-between pt-1 gap-2">
            <span className="text-[11px] text-neutral-400">
              {isBn ? 'প্রতি সপ্তাহে অন্তত একবার কোমর মাপুন' : 'Measure waist at least once weekly'}
            </span>

            <div className="flex items-center gap-2">
              {editingMeasurement && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800/70"
                >
                  {t('cancel')}
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
              >
                {editingMeasurement
                  ? isBn
                    ? 'পরিমাপ আপডেট করুন'
                    : 'Update Measurement'
                  : t('save')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Historical Trend Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Waist Trend Chart */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <SimpleLineChart
            data={waistChartData}
            title={isBn ? 'কোমরের পরিধি পরিবর্তন (সেমি)' : 'Waist Circumference Trend (cm)'}
            unit="cm"
            targetValue={profile.targetWaistCm}
            targetLabel="Goal"
            lineColor="#059669"
          />
        </div>

        {/* Weight Trend Chart */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <SimpleLineChart
            data={weightChartData}
            title={isBn ? 'শরীরের ওজন পরিবর্তন (কেজি)' : 'Body Weight Trend (kg)'}
            unit="kg"
            targetValue={profile.targetWeightKg}
            targetLabel="Maintain"
            lineColor="#0284c7"
          />
        </div>
      </div>

      {/* Historical Measurement Records Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <h3 className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100 mb-3">
          {isBn ? 'পরিমাপের ইতিহাস' : 'Measurement Log History'}
        </h3>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {sortedMeasurements
            .slice()
            .reverse()
            .map((item) => {
              const isBeingEdited = editingMeasurement?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`py-3 flex items-center justify-between text-xs rounded-xl transition-colors ${
                    isBeingEdited ? 'bg-emerald-50/60 dark:bg-emerald-950/40 px-2.5' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">{item.date}</span>
                      <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full">
                        WHtR {item.waistToHeightRatio}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Waist: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{item.waistCm} cm</span> • Weight:{' '}
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{item.weightKg} kg</span> • BMI: {item.bmi}
                      {item.notes ? ` • ${item.notes}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      title={isBn ? 'সম্পাদনা করুন' : 'Edit'}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
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
