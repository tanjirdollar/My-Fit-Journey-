import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useFitnessData, getTodayDateStr } from '../context/FitnessDataContext';
import { WhTrGauge } from './WhTrGauge';
import { SimpleLineChart } from './charts/SimpleLineChart';
import {
  Scale,
  TrendingDown,
  Trash2,
  Plus,
  Info,
  Calendar,
  ShieldCheck,
  Check,
} from 'lucide-react';

export const BodyMeasurements: React.FC = () => {
  const { t, language } = useLanguage();
  const { profile, updateProfile } = useAuth();
  const { bodyMeasurements, addMeasurement, deleteMeasurement } = useFitnessData();
  const isBn = language === 'bn';
  const today = getTodayDateStr();

  // Form states
  const [weightInput, setWeightInput] = useState<number>(63.0);
  const [waistInput, setWaistInput] = useState<number>(88.0);
  const [dateInput, setDateInput] = useState<string>(today);
  const [notesInput, setNotesInput] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Dynamic calculations based on user's height
  const heightM = (profile.heightCm || 165) / 100;
  const calculatedBmi = Number((weightInput / (heightM * heightM)).toFixed(2));
  const calculatedWhtr = Number((waistInput / (profile.heightCm || 165)).toFixed(3));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await addMeasurement({
      date: dateInput,
      weightKg: weightInput,
      waistCm: waistInput,
      bmi: calculatedBmi,
      waistToHeightRatio: calculatedWhtr,
      notes: notesInput,
    });
    setSavedSuccess(true);
    setNotesInput('');
    setTimeout(() => setSavedSuccess(false), 2500);
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
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-neutral-900 tracking-tight font-display">
              {t('body')}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isBn
                ? 'কোমরের পরিধি ও স্বাস্থ্য নির্দেশক (WHtR) পর্যবেক্ষণ'
                : 'Waist circumference & Waist-to-Height Ratio (WHtR) tracking.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-xl">
              Height: {profile.heightCm} cm
            </span>
          </div>
        </div>

        {/* Current Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60">
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">{t('waistline')}</div>
            <div className="text-xl font-black text-neutral-900">{latest.waistCm} cm</div>
            <div className="text-[10px] text-emerald-700 font-bold">Target: {profile.targetWaistCm} cm</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">{t('weight')}</div>
            <div className="text-xl font-black text-neutral-900">{latest.weightKg} kg</div>
            <div className="text-[10px] text-neutral-500 font-medium">Maintain ~63kg</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">{t('bmi')}</div>
            <div className="text-xl font-black text-neutral-900">{latest.bmi}</div>
            <div className="text-[10px] text-emerald-700 font-medium">{t('normal')} (18.5 - 24.9)</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-700">{t('whtrRatio')}</div>
            <div className="text-xl font-black text-amber-800">{latest.waistToHeightRatio}</div>
            <div className="text-[10px] text-amber-600 font-medium">Ideal: &lt; 0.500</div>
          </div>
        </div>
      </div>

      {/* WHtR Visual Gauge */}
      <WhTrGauge
        waistCm={latest.waistCm}
        heightCm={profile.heightCm}
        targetWaistCm={profile.targetWaistCm}
      />

      {/* Log New Measurement Form */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <h3 className="text-sm font-extrabold text-neutral-900 mb-2">
          {isBn ? 'নতুন পরিমাপ রেকর্ড করুন' : 'Record New Measurement'}
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          {isBn
            ? 'সকালে খালি পেটে নাভির সমান্তরালে মেপে কোমরের মাপ লিখুন।'
            : 'Measure waist horizontally at the midpoint between lowest rib and iliac crest (usually at navel level).'}
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {t('waistline')} (cm) *
              </label>
              <input
                type="number"
                step="0.5"
                min="50"
                max="150"
                value={waistInput}
                onChange={(e) => setWaistInput(parseFloat(e.target.value) || 88)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                {t('weight')} (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="200"
                value={weightInput}
                onChange={(e) => setWeightInput(parseFloat(e.target.value) || 63)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Date / তারিখ
              </label>
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                required
              />
            </div>
          </div>

          {/* Dynamic feedback indicator */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 flex items-center justify-between text-xs">
            <div>
              <span className="text-neutral-500">Calculated BMI: </span>
              <span className="font-bold text-neutral-900">{calculatedBmi}</span>
            </div>
            <div>
              <span className="text-neutral-500">Calculated WHtR: </span>
              <span className={`font-black ${calculatedWhtr < 0.5 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {calculatedWhtr}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="e.g. morning measurement, feeling lighter"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {savedSuccess ? (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> {isBn ? 'সফলভাবে সংরক্ষিত!' : 'Measurement recorded!'}
              </span>
            ) : (
              <span className="text-[11px] text-neutral-400">
                {isBn ? 'প্রতি সপ্তাহে অন্তত একবার কোমর মাপুন' : 'Measure waist at least once weekly'}
              </span>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              {t('save')}
            </button>
          </div>
        </form>
      </div>

      {/* Historical Trend Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Waist Trend Chart */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
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
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
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
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <h3 className="text-sm font-extrabold text-neutral-900 mb-3">
          {isBn ? 'পরিমাপের ইতিহাস' : 'Measurement Log History'}
        </h3>

        <div className="divide-y divide-neutral-100">
          {sortedMeasurements
            .slice()
            .reverse()
            .map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900">{item.date}</span>
                    <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                      WHtR {item.waistToHeightRatio}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    Waist: <span className="font-semibold text-neutral-800">{item.waistCm} cm</span> • Weight:{' '}
                    <span className="font-semibold text-neutral-800">{item.weightKg} kg</span> • BMI: {item.bmi}
                    {item.notes ? ` • ${item.notes}` : ''}
                  </div>
                </div>

                <button
                  onClick={() => deleteMeasurement(item.id)}
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
