import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useFitnessData, getTodayDateStr } from '../context/FitnessDataContext';
import { HealthRecord, HealthRecordType } from '../types';
import {
  FileHeart,
  Activity,
  Droplet,
  HeartPulse,
  Plus,
  Trash2,
  Calendar,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const HealthRecords: React.FC = () => {
  const { t, language } = useLanguage();
  const { healthRecords, addHealthRecord, deleteHealthRecord } = useFitnessData();
  const isBn = language === 'bn';
  const today = getTodayDateStr();

  // Active filter
  const [selectedType, setSelectedType] = useState<HealthRecordType | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [recordType, setRecordType] = useState<HealthRecordType>('bp');
  const [date, setDate] = useState<string>(today);
  const [systolic, setSystolic] = useState<number>(120);
  const [diastolic, setDiastolic] = useState<number>(80);
  const [pulse, setPulse] = useState<number>(72);
  const [glucoseFasting, setGlucoseFasting] = useState<number>(95);
  const [glucosePostMeal, setGlucosePostMeal] = useState<number>(130);
  const [hba1c, setHba1c] = useState<number>(5.4);
  const [totalCholesterol, setTotalCholesterol] = useState<number>(180);
  const [ldl, setLdl] = useState<number>(110);
  const [hdl, setHdl] = useState<number>(45);
  const [triglycerides, setTriglycerides] = useState<number>(135);
  const [reportNote, setReportNote] = useState<string>('');

  const filteredRecords =
    selectedType === 'all'
      ? healthRecords
      : healthRecords.filter((r) => r.type === selectedType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: Omit<HealthRecord, 'id' | 'userId' | 'createdAt'> = {
      date,
      type: recordType,
      reportNote,
    };

    if (recordType === 'bp') {
      newRecord.systolic = systolic;
      newRecord.diastolic = diastolic;
      newRecord.pulse = pulse;
    } else if (recordType === 'glucose') {
      newRecord.glucoseFasting = glucoseFasting;
      newRecord.glucosePostMeal = glucosePostMeal;
    } else if (recordType === 'hba1c') {
      newRecord.hba1c = hba1c;
    } else if (recordType === 'lipid') {
      newRecord.totalCholesterol = totalCholesterol;
      newRecord.ldl = ldl;
      newRecord.hdl = hdl;
      newRecord.triglycerides = triglycerides;
    }

    await addHealthRecord(newRecord);
    setIsModalOpen(false);
    setReportNote('');
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-neutral-900 tracking-tight font-display">
              {t('healthRecords')}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isBn
                ? 'রক্তচাপ, সুগার, এইচবিএওয়ানসি ও লিপিড প্রোফাইল রিপোর্ট পর্যবেক্ষণ'
                : 'Blood pressure, glucose, HbA1c, and lipid profile tracking.'}
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('addHealthRecord')}</span>
          </button>
        </div>

        {/* Clinical Reference Standards Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-neutral-50 p-3 rounded-2xl border border-neutral-200/60 text-xs">
          <div className="p-2 bg-white rounded-xl border border-neutral-200/60">
            <div className="text-[10px] font-bold text-neutral-400 uppercase">Blood Pressure</div>
            <div className="font-extrabold text-neutral-900 mt-0.5">&lt; 120 / 80</div>
            <div className="text-[9px] text-emerald-700 font-semibold">Optimal mmHg</div>
          </div>
          <div className="p-2 bg-white rounded-xl border border-neutral-200/60">
            <div className="text-[10px] font-bold text-neutral-400 uppercase">Fasting Glucose</div>
            <div className="font-extrabold text-neutral-900 mt-0.5">70 - 99</div>
            <div className="text-[9px] text-emerald-700 font-semibold">Normal mg/dL</div>
          </div>
          <div className="p-2 bg-white rounded-xl border border-neutral-200/60">
            <div className="text-[10px] font-bold text-neutral-400 uppercase">HbA1c</div>
            <div className="font-extrabold text-neutral-900 mt-0.5">&lt; 5.7 %</div>
            <div className="text-[9px] text-emerald-700 font-semibold">Normal 3-Mo Avg</div>
          </div>
          <div className="p-2 bg-white rounded-xl border border-neutral-200/60">
            <div className="text-[10px] font-bold text-neutral-400 uppercase">Triglycerides</div>
            <div className="font-extrabold text-neutral-900 mt-0.5">&lt; 150</div>
            <div className="text-[9px] text-emerald-700 font-semibold">Normal mg/dL</div>
          </div>
        </div>

        {/* Type filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 no-scrollbar text-xs">
          {[
            { id: 'all', label: isBn ? 'সব রিপোর্ট' : 'All Records' },
            { id: 'bp', label: t('bloodPressure') },
            { id: 'glucose', label: t('bloodGlucose') },
            { id: 'hba1c', label: 'HbA1c' },
            { id: 'lipid', label: t('lipidProfile') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id as any)}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                selectedType === tab.id
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records History List */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
        <h3 className="text-sm font-extrabold text-neutral-900 mb-3">
          {isBn ? 'ল্যাব টেস্ট ও স্বাস্থ্য রেকর্ডের তালিকা' : 'Clinical Logs & Medical Lab History'}
        </h3>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-xs">
            {isBn ? 'এই বিভাগে কোনো রেকর্ড পাওয়া যায়নি।' : 'No records logged in this category.'}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredRecords.map((r) => (
              <div key={r.id} className="py-3.5 flex items-start justify-between text-xs gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-neutral-900">{r.date}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                      {r.type}
                    </span>
                  </div>

                  {/* Specific metrics display */}
                  <div className="mt-1.5 text-xs text-neutral-700 font-medium">
                    {r.type === 'bp' && (
                      <div className="flex items-center gap-2">
                        <span className="font-black text-neutral-900">
                          {r.systolic} / {r.diastolic} mmHg
                        </span>
                        <span className="text-neutral-400">• Pulse: {r.pulse} bpm</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            (r.systolic || 0) <= 120 && (r.diastolic || 0) <= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {(r.systolic || 0) <= 120 && (r.diastolic || 0) <= 80 ? 'Normal' : 'Elevated'}
                        </span>
                      </div>
                    )}

                    {r.type === 'glucose' && (
                      <div className="flex items-center gap-2">
                        <span>Fasting: <strong className="text-neutral-900">{r.glucoseFasting} mg/dL</strong></span>
                        <span className="text-neutral-400">•</span>
                        <span>Post-Meal: <strong className="text-neutral-900">{r.glucosePostMeal} mg/dL</strong></span>
                      </div>
                    )}

                    {r.type === 'hba1c' && (
                      <div className="flex items-center gap-2">
                        <span>HbA1c: <strong className="text-neutral-900">{r.hba1c} %</strong></span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                          {(r.hba1c || 0) < 5.7 ? 'Normal' : 'Borderline'}
                        </span>
                      </div>
                    )}

                    {r.type === 'lipid' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[11px] text-neutral-600 mt-1">
                        <span>Total Chol: <strong className="text-neutral-900">{r.totalCholesterol}</strong></span>
                        <span>LDL: <strong className="text-neutral-900">{r.ldl}</strong></span>
                        <span>HDL: <strong className="text-neutral-900">{r.hdl}</strong></span>
                        <span>Triglycerides: <strong className="text-neutral-900">{r.triglycerides}</strong></span>
                      </div>
                    )}
                  </div>

                  {r.reportNote && (
                    <div className="mt-1 text-[11px] text-neutral-500 italic flex items-center gap-1">
                      <FileText className="w-3 h-3 text-neutral-400 shrink-0" />
                      <span>{r.reportNote}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => deleteHealthRecord(r.id)}
                  className="p-1.5 rounded-md text-neutral-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Health Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-neutral-100 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Clinical Entry
                </span>
                <h3 className="text-base font-extrabold text-neutral-900 mt-1">
                  {t('addHealthRecord')}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Record Type
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'bp', label: 'BP' },
                    { id: 'glucose', label: 'Glucose' },
                    { id: 'hba1c', label: 'HbA1c' },
                    { id: 'lipid', label: 'Lipid' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRecordType(m.id as any)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                        recordType === m.id
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold"
                  required
                />
              </div>

              {/* Dynamic inputs based on record type */}
              {recordType === 'bp' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">Systolic</label>
                    <input
                      type="number"
                      value={systolic}
                      onChange={(e) => setSystolic(parseInt(e.target.value) || 120)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">Diastolic</label>
                    <input
                      type="number"
                      value={diastolic}
                      onChange={(e) => setDiastolic(parseInt(e.target.value) || 80)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">Pulse (bpm)</label>
                    <input
                      type="number"
                      value={pulse}
                      onChange={(e) => setPulse(parseInt(e.target.value) || 72)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {recordType === 'glucose' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">Fasting (mg/dL)</label>
                    <input
                      type="number"
                      value={glucoseFasting}
                      onChange={(e) => setGlucoseFasting(parseInt(e.target.value) || 95)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">Post-Meal (mg/dL)</label>
                    <input
                      type="number"
                      value={glucosePostMeal}
                      onChange={(e) => setGlucosePostMeal(parseInt(e.target.value) || 130)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {recordType === 'hba1c' && (
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">HbA1c (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={hba1c}
                    onChange={(e) => setHba1c(parseFloat(e.target.value) || 5.4)}
                    className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                  />
                </div>
              )}

              {recordType === 'lipid' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">Total Chol</label>
                    <input
                      type="number"
                      value={totalCholesterol}
                      onChange={(e) => setTotalCholesterol(parseInt(e.target.value) || 180)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">LDL</label>
                    <input
                      type="number"
                      value={ldl}
                      onChange={(e) => setLdl(parseInt(e.target.value) || 110)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">HDL</label>
                    <input
                      type="number"
                      value={hdl}
                      onChange={(e) => setHdl(parseInt(e.target.value) || 45)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">Triglycerides</label>
                    <input
                      type="number"
                      value={triglycerides}
                      onChange={(e) => setTriglycerides(parseInt(e.target.value) || 135)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Doctor Notes / Lab Name
                </label>
                <input
                  type="text"
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="e.g. Annual executive checkup, normal fasting glucose"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
