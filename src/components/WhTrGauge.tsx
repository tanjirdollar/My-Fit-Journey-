import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface WhTrGaugeProps {
  waistCm: number;
  heightCm: number;
  targetWaistCm: number;
}

export const WhTrGauge: React.FC<WhTrGaugeProps> = ({ waistCm, heightCm, targetWaistCm }) => {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';

  const ratio = heightCm > 0 ? Number((waistCm / heightCm).toFixed(3)) : 0.533;
  const targetRatio = heightCm > 0 ? Number((targetWaistCm / heightCm).toFixed(3)) : 0.515;
  const idealMaxRatio = 0.500; // < 0.50 is the international gold standard for healthy waistline

  // Status determination
  let statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
  let statusText = isBn ? 'সতর্কতা: পেটের অভ্যন্তরীণ মেদ বেশি' : 'Caution: Elevated Visceral Adiposity';
  let badgeColor = 'bg-amber-100 text-amber-800';

  if (ratio < 0.500) {
    statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    statusText = isBn ? 'আদর্শ ও স্বাস্থ্যকর পরিসীমা' : 'Optimal & Healthy Ratio';
    badgeColor = 'bg-emerald-100 text-emerald-800';
  } else if (ratio >= 0.600) {
    statusColor = 'text-rose-700 bg-rose-50 border-rose-200';
    statusText = isBn ? 'উচ্চ স্বাস্থ্য ঝুঁকি' : 'High Cardiometabolic Risk';
    badgeColor = 'bg-rose-100 text-rose-800';
  }

  // Calculate percentage along scale from 0.40 to 0.65
  const minScale = 0.40;
  const maxScale = 0.65;
  const currentPct = Math.min(100, Math.max(0, ((ratio - minScale) / (maxScale - minScale)) * 100));
  const targetPct = Math.min(100, Math.max(0, ((targetRatio - minScale) / (maxScale - minScale)) * 100));
  const idealPct = Math.min(100, Math.max(0, ((idealMaxRatio - minScale) / (maxScale - minScale)) * 100));

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-xs font-semibold tracking-wide uppercase text-neutral-500 dark:text-neutral-400">
            {isBn ? 'কোমর ও উচ্চতার অনুপাত (WHtR)' : 'Waist-to-Height Ratio (WHtR)'}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">{ratio}</span>
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              ({waistCm} cm / {heightCm} cm)
            </span>
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
          {ratio < 0.5 ? (isBn ? 'স্বাভাবিক' : 'Healthy') : (isBn ? 'সতর্কতা' : 'Elevated')}
        </span>
      </div>

      {/* Visual Bar Gauge */}
      <div className="mt-4">
        <div className="relative h-3 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex">
          {/* Healthy zone (<0.50): 40% of the 0.40-0.65 range */}
          <div className="h-full bg-emerald-400" style={{ width: `${idealPct}%` }} title="Healthy: < 0.50" />
          {/* Increased risk zone (0.50 - 0.59) */}
          <div className="h-full bg-amber-400" style={{ width: `${((0.60 - 0.50) / 0.25) * 100}%` }} title="Elevated: 0.50 - 0.59" />
          {/* High risk zone (>=0.60) */}
          <div className="h-full bg-rose-400 flex-1" title="High Risk: >= 0.60" />
        </div>

        {/* Pointer indicator for current ratio */}
        <div className="relative w-full h-6 mt-1">
          <div
            className="absolute -top-1 -translate-x-1/2 flex flex-col items-center transition-all duration-300"
            style={{ left: `${currentPct}%` }}
          >
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[6px] border-b-neutral-900" />
            <span className="text-[10px] font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap bg-neutral-100 dark:bg-neutral-800 px-1 rounded">
              {isBn ? 'বর্তমান' : 'Current'} {ratio}
            </span>
          </div>

          {/* Target marker */}
          <div
            className="absolute -top-1 -translate-x-1/2 flex flex-col items-center opacity-80"
            style={{ left: `${targetPct}%` }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
            <span className="text-[9px] font-medium text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
              {isBn ? 'লক্ষ্য' : 'Target'} {targetWaistCm}cm
            </span>
          </div>
        </div>
      </div>

      {/* Status interpretation box */}
      <div className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed ${statusColor}`}>
        <div className="font-semibold">{statusText}</div>
        <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">
          {isBn
            ? `কোমর ${waistCm} সেমি থেকে কমিয়ে প্রথমে ${targetWaistCm} সেমি এবং পরবর্তীতে ৮২.৫ সেমির নিচে আনলে স্বাস্থ্যকর অনুপাত (<০.৫০) অর্জিত হবে।`
            : `Gradually trimming waist from ${waistCm} cm toward ${targetWaistCm} cm and eventually below 82.5 cm achieves the ideal healthy ratio (< 0.50) without drastic weight loss.`}
        </p>
      </div>
    </div>
  );
};
