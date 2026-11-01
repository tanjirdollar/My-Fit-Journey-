import React, { useState } from 'react';
import { Download, Smartphone, Share2, MoreVertical, X, WifiOff } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';
import { useLanguage } from '../context/LanguageContext';

interface PWAInstallButtonProps {
  variant?: 'header' | 'drawer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Hide when already running as an installed standalone phone/desktop app
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'drawer' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>
            {isBn
              ? 'ফোনে অ্যাপ হিসেবে ইনস্টল করুন (Install App)'
              : 'Install App on Phone / Device'}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors whitespace-nowrap shrink-0"
          title={
            isBn
              ? 'ফোনে অ্যাপ হিসেবে ইনস্টল করুন'
              : 'Install MyFit Journey App'
          }
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">
            {isBn ? 'অ্যাপ ইনস্টল' : 'Install App'}
          </span>
        </button>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 shadow-2xl space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {isBn
                      ? 'ফোনে অ্যাপ হিসেবে ইনস্টল করুন'
                      : 'Install MyFit Journey on Phone'}
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {isBn
                      ? 'হোম স্ক্রিনে আইকন যোগ করে ফুল-স্ক্রিন অ্যাপ হিসেবে ব্যবহার করুন'
                      : 'Add to your home screen for quick full-screen access'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="min-h-[36px] min-w-[36px] rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-700 space-y-2.5 text-xs text-neutral-700 dark:text-neutral-200 leading-relaxed">
                <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4" />
                  <span>
                    {isBn
                      ? 'iPhone / iPad (Safari ব্রাউজার):'
                      : 'iPhone / iPad (Safari Browser):'}
                  </span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>
                    {isBn
                      ? 'নিচের টুলবারে Share (শেয়ার) আইকনে ট্যাপ করুন।'
                      : 'Tap the Share button in the Safari toolbar.'}
                  </li>
                  <li>
                    {isBn
                      ? 'স্ক্রল করে "Add to Home Screen"-এ ট্যাপ করুন।'
                      : 'Scroll down and tap "Add to Home Screen".'}
                  </li>
                  <li>
                    {isBn
                      ? 'উপরে ডান কোণায় "Add" বাটনে ট্যাপ করুন।'
                      : 'Tap "Add" in the top-right corner.'}
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-neutral-700 dark:text-neutral-200 leading-relaxed">
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-700 space-y-2">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <MoreVertical className="w-4 h-4" />
                    <span>
                      {isBn
                        ? 'Android ফোন (Chrome ব্রাউজার):'
                        : 'Android Phone (Chrome Browser):'}
                    </span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>
                      {isBn
                        ? 'ব্রাউজারের উপরের ডান কোণায় তিনটি ডট (⋮) মেনুতে ট্যাপ করুন।'
                        : 'Tap the three-dot menu (⋮) in the top-right of Chrome.'}
                    </li>
                    <li>
                      {isBn
                        ? '"Install app" অথবা "Add to Home screen" অপশনে ট্যাপ করুন।'
                        : 'Tap "Install app" or "Add to Home screen".'}
                    </li>
                    <li>
                      {isBn
                        ? 'পপ-আপে "Install" নিশ্চিত করুন।'
                        : 'Confirm by tapping "Install".'}
                    </li>
                  </ol>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-700 space-y-1.5">
                  <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {isBn ? 'iPhone (Safari):' : 'iPhone (Safari):'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                    {isBn
                      ? 'Share বাটনে ট্যাপ করে "Add to Home Screen" নির্বাচন করুন।'
                      : 'Tap the Share button and select "Add to Home Screen".'}
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full min-h-[42px] rounded-xl bg-neutral-900 dark:bg-emerald-600 hover:bg-neutral-800 dark:hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
            >
              {isBn ? 'বুঝেছি (Close)' : 'Got It'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        {isBn
          ? 'অফলাইন মোড — সংরক্ষিত ডেটা দেখানো হচ্ছে'
          : 'Offline Mode — Cached data is active'}
      </span>
    </div>
  );
};
