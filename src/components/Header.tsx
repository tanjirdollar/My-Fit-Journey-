import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Activity,
  Globe,
  LogIn,
  LogOut,
  Calendar,
  Sun,
  Moon,
} from 'lucide-react';

interface HeaderProps {
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenProfile }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const { user, signInWithGoogle, logOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState<boolean>(false);

  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      setAuthError(null);
      await signInWithGoogle();
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Sign in failed';
      if (rawMsg.includes('auth/unauthorized-domain')) {
        const host = window.location.hostname;
        setAuthError(
          language === 'bn'
            ? `"${host}" ডোমেইনটি Firebase-এ অনুমোদিত নয়। Firebase Console > Authentication > Settings > Authorized domains-এ গিয়ে "${host}" যোগ করুন।`
            : `Domain "${host}" is not authorized in Firebase. Add "${host}" in Firebase Console > Authentication > Settings > Authorized domains.`
        );
      } else {
        setAuthError(rawMsg);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const todayFormatted = new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-3 sm:px-6 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Activity className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-neutral-900 dark:text-neutral-100 font-display truncate">
                {t('appTitle')}
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
                Health &amp; Waistline
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:block truncate">
              {t('baselineInfo')}
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Date display */}
          <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100/80 dark:bg-neutral-800 px-2.5 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>{todayFormatted}</span>
          </div>

          {/* In-App PWA Install Button */}
          <PWAInstallButton variant="header" />

          {/* Dark / Light Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="min-h-[36px] min-w-[36px] px-2 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:text-emerald-700 dark:hover:text-emerald-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-neutral-700 transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-neutral-600 flex items-center justify-center gap-1"
            title={
              isDark
                ? language === 'bn'
                  ? 'লাইট থিম চালু করুন'
                  : 'Switch to Light Mode'
                : language === 'bn'
                ? 'ডার্ক থিম চালু করুন'
                : 'Switch to Dark Mode'
            }
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-700" />
            )}
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="min-h-[36px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:text-emerald-700 dark:hover:text-emerald-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-neutral-700 transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-neutral-600"
            title={language === 'en' ? 'Switch to Bengali' : 'Switch to English'}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{language === 'en' ? 'বাংলা' : 'EN'}</span>
          </button>

          {/* User Auth */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-medium transition-colors"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {user.displayName?.[0] || 'T'}
                  </div>
                )}
                <span className="max-w-[75px] sm:max-w-[90px] truncate font-semibold">
                  {user.displayName || 'Tanjir'}
                </span>
              </button>
              <button
                type="button"
                onClick={logOut}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                title={t('signOut')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={signingIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-60"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{signingIn ? '...' : t('signInWithGoogle')}</span>
            </button>
          )}
        </div>
      </div>

      {authError && (
        <div className="max-w-7xl mx-auto mt-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-200 flex items-center justify-between">
          <span>{authError}</span>
          <button onClick={() => setAuthError(null)} className="font-bold ml-2">
            &times;
          </button>
        </div>
      )}
    </header>
  );
};

