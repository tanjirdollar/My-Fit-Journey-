import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useFitnessData, getTodayDateStr } from '../context/FitnessDataContext';
import { HealthRecord, HealthRecordType } from '../types';
import {
  Plus,
  Trash2,
  Check,
  AlertCircle,
  FileText,
  Pencil,
} from 'lucide-react';

export const HealthRecords: React.FC = () => {
  const { t, language } = useLanguage();
  const {
    healthRecords,
    addHealthRecord,
    updateHealthRecord,
    deleteHealthRecord,
  } = useFitnessData();
  const isBn = language === 'bn';
  const today = getTodayDateStr();

  // Active filter
  const [selectedType, setSelectedType] = useState<HealthRecordType | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);

  // Feedback states
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form states
  const [recordType, setRecordType] = useState<HealthRecordType>('bp');
  const [date, setDate] = useState<string>(today);
  const [systolic, setSystolic] = useState<string>('120');
  const [diastolic, setDiastolic] = useState<string>('80');
  const [pulse, setPulse] = useState<string>('72');
  const [glucoseFasting, setGlucoseFasting] = useState<string>('95');
  const [glucosePostMeal, setGlucosePostMeal] = useState<string>('130');
  const [hba1c, setHba1c] = useState<string>('5.4');
  const [totalCholesterol, setTotalCholesterol] = useState<string>('180');
  const [ldl, setLdl] = useState<string>('110');
  const [hdl, setHdl] = useState<string>('45');
  const [triglycerides, setTriglycerides] = useState<string>('135');
  const [reportNote, setReportNote] = useState<string>('');

  const showSuccess = (msg: string) => {
    setErrorMsg(null);
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const filteredRecords =
    selectedType === 'all'
      ? healthRecords
      : healthRecords.filter((r) => r.type === selectedType);

  const openAddModal = () => {
    setEditingRecord(null);
    setRecordType(selectedType === 'all' ? 'bp' : selectedType);
    setDate(today);
    setSystolic('120');
    setDiastolic('80');
    setPulse('72');
    setGlucoseFasting('95');
    setGlucosePostMeal('130');
    setHba1c('5.4');
    setTotalCholesterol('180');
    setLdl('110');
    setHdl('45');
    setTriglycerides('135');
    setReportNote('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (r: HealthRecord) => {
    setEditingRecord(r);
    setRecordType(r.type);
    setDate(r.date);
    setSystolic(String(r.systolic ?? 120));
    setDiastolic(String(r.diastolic ?? 80));
    setPulse(String(r.pulse ?? 72));
    setGlucoseFasting(String(r.glucoseFasting ?? 95));
    setGlucosePostMeal(String(r.glucosePostMeal ?? 130));
    setHba1c(String(r.hba1c ?? 5.4));
    setTotalCholesterol(String(r.totalCholesterol ?? 180));
    setLdl(String(r.ldl ?? 110));
    setHdl(String(r.hdl ?? 45));
    setTriglycerides(String(r.triglycerides ?? 135));
    setReportNote(r.reportNote || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setModalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setModalError(
        isBn ? 'অনুগ্রহ করে একটি সঠিক তারিখ নির্বাচন করুন।' : 'Please select a valid date.'
      );
      return;
    }

    const basePayload: Omit<HealthRecord, 'id' | 'userId' | 'createdAt'> = {
      date,
      type: recordType,
      reportNote: reportNote.trim(),
    };

    if (recordType === 'bp') {
      const sys = parseInt(systolic, 10);
      const dia = parseInt(diastolic, 10);
      const pul = parseInt(pulse, 10);

      if (isNaN(sys) || sys < 40 || sys > 300) {
        setModalError(
          isBn
            ? 'সিস্টোলিক রক্তচাপ ৪০ থেকে ৩০০ mmHg এর মধ্যে হতে হবে।'
            : 'Systolic blood pressure must be between 40 and 300 mmHg.'
        );
        return;
      }
      if (isNaN(dia) || dia < 30 || dia > 200) {
        setModalError(
          isBn
            ? 'ডায়াস্টোলিক রক্তচাপ ৩০ থেকে ২০০ mmHg এর মধ্যে হতে হবে।'
            : 'Diastolic blood pressure must be between 30 and 200 mmHg.'
        );
        return;
      }
      if (isNaN(pul) || pul < 30 || pul > 250) {
        setModalError(
          isBn
            ? 'পালস ৩০ থেকে ২৫০ bpm এর মধ্যে হতে হবে।'
            : 'Pulse must be between 30 and 250 bpm.'
        );
        return;
      }
      basePayload.systolic = sys;
      basePayload.diastolic = dia;
      basePayload.pulse = pul;
    } else if (recordType === 'glucose') {
      const fast = parseFloat(glucoseFasting);
      const post = parseFloat(glucosePostMeal);
      if (isNaN(fast) || fast < 1 || fast > 600) {
        setModalError(
          isBn
            ? 'ফাস্টিং গ্লুকোজ ১ থেকে ৬০০ mg/dL এর মধ্যে হতে হবে।'
            : 'Fasting glucose must be between 1 and 600 mg/dL.'
        );
        return;
      }
      if (isNaN(post) || post < 1 || post > 600) {
        setModalError(
          isBn
            ? 'খাবারের পরের গ্লুকোজ ১ থেকে ৬০০ mg/dL এর মধ্যে হতে হবে।'
            : 'Post-meal glucose must be between 1 and 600 mg/dL.'
        );
        return;
      }
      basePayload.glucoseFasting = fast;
      basePayload.glucosePostMeal = post;
    } else if (recordType === 'hba1c') {
      const a1c = Number(parseFloat(hba1c).toFixed(1));
      if (isNaN(a1c) || a1c < 3 || a1c > 20) {
        setModalError(
          isBn
            ? 'HbA1c ৩.০% থেকে ২০.০% এর মধ্যে হতে হবে।'
            : 'HbA1c must be between 3.0% and 20.0%.'
        );
        return;
      }
      basePayload.hba1c = a1c;
    } else if (recordType === 'lipid') {
      const tc = parseFloat(totalCholesterol);
      const ldlVal = parseFloat(ldl);
      const hdlVal = parseFloat(hdl);
      const tg = parseFloat(triglycerides);

      if (
        isNaN(tc) ||
        tc < 0 ||
        isNaN(ldlVal) ||
        ldlVal < 0 ||
        isNaN(hdlVal) ||
        hdlVal < 0 ||
        isNaN(tg) ||
        tg < 0
      ) {
        setModalError(
          isBn
            ? 'লিপিড প্রোফাইলের সকল মান সঠিক সংখ্যা হতে হবে।'
            : 'All lipid profile values must be valid non-negative numbers.'
        );
        return;
      }
      basePayload.totalCholesterol = tc;
      basePayload.ldl = ldlVal;
      basePayload.hdl = hdlVal;
      basePayload.triglycerides = tg;
    }

    try {
      if (editingRecord) {
        // Preserve original id, userId, createdAt while updating only the active recordType fields
        const updatedRecord: HealthRecord = {
          id: editingRecord.id,
          userId: editingRecord.userId,
          createdAt: editingRecord.createdAt,
          ...basePayload,
        };
        await updateHealthRecord(updatedRecord);
        showSuccess(
          isBn
            ? 'স্বাস্থ্য রেকর্ড সফলভাবে আপডেট করা হয়েছে!'
            : 'Health record updated successfully!'
        );
      } else {
        await addHealthRecord(basePayload);
        showSuccess(
          isBn
            ? 'নতুন স্বাস্থ্য রেকর্ড সংরক্ষিত হয়েছে!'
            : 'Health record saved successfully!'
        );
      }
      closeModal();
    } catch {
      setModalError(
        isBn
          ? 'রেকর্ড সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
          : 'Failed to save health record. Please try again.'
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteHealthRecord(id);
      showSuccess(isBn ? 'স্বাস্থ্য রেকর্ড মুছে ফেলা হয়েছে।' : 'Health record deleted.');
    } catch {
      setErrorMsg(isBn ? 'মুছে ফেলতে সমস্যা হয়েছে।' : 'Failed to delete health record.');
    }
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
            type="button"
            onClick={openAddModal}
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
              type="button"
              onClick={() => setSelectedType(tab.id as HealthRecordType | 'all')}
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
                      <div className="flex items-center gap-2 flex-wrap">
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
                      <div className="flex items-center gap-2 flex-wrap">
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

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(r)}
                    title={isBn ? 'সম্পাদনা করুন' : 'Edit'}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Health Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-neutral-100 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {editingRecord
                    ? isBn
                      ? 'রেকর্ড সম্পাদনা'
                      : 'Edit Clinical Entry'
                    : isBn
                    ? 'নতুন রেকর্ড'
                    : 'Clinical Entry'}
                </span>
                <h3 className="text-base font-extrabold text-neutral-900 mt-1">
                  {editingRecord
                    ? isBn
                      ? 'স্বাস্থ্য রেকর্ড সম্পাদনা করুন'
                      : 'Edit Health Record'
                    : t('addHealthRecord')}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center font-bold"
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

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
                      onClick={() => setRecordType(m.id as HealthRecordType)}
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
                  max={today}
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
                      min="40"
                      max="300"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">Diastolic</label>
                    <input
                      type="number"
                      min="30"
                      max="200"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">Pulse (bpm)</label>
                    <input
                      type="number"
                      min="30"
                      max="250"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                      required
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
                      min="1"
                      max="600"
                      value={glucoseFasting}
                      onChange={(e) => setGlucoseFasting(e.target.value)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">Post-Meal (mg/dL)</label>
                    <input
                      type="number"
                      min="1"
                      max="600"
                      value={glucosePostMeal}
                      onChange={(e) => setGlucosePostMeal(e.target.value)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                      required
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
                    min="3"
                    max="20"
                    value={hba1c}
                    onChange={(e) => setHba1c(e.target.value)}
                    className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                    required
                  />
                </div>
              )}

              {recordType === 'lipid' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">Total Chol</label>
                    <input
                      type="number"
                      min="0"
                      value={totalCholesterol}
                      onChange={(e) => setTotalCholesterol(e.target.value)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">LDL</label>
                    <input
                      type="number"
                      min="0"
                      value={ldl}
                      onChange={(e) => setLdl(e.target.value)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">HDL</label>
                    <input
                      type="number"
                      min="0"
                      value={hdl}
                      onChange={(e) => setHdl(e.target.value)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">Triglycerides</label>
                    <input
                      type="number"
                      min="0"
                      value={triglycerides}
                      onChange={(e) => setTriglycerides(e.target.value)}
                      className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold"
                      required
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
                  onClick={closeModal}
                  className="w-1/2 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-bold hover:bg-neutral-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs"
                >
                  {editingRecord
                    ? isBn
                      ? 'আপডেট করুন'
                      : 'Update Record'
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
