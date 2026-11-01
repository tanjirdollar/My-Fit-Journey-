import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Activity,
  LogIn,
  Sun,
  Moon,
} from 'lucide-react';

interface HeaderProps {
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenProfile }) => {
  const { language, t } = useLanguage();
  const { user, signInWithGoogle } = useAuth();
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

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-3 sm:px-6 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand: App Icon & App Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Activity className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="font-extrabold text-base sm:text-lg tracking-tight text-neutral-900 dark:text-neutral-100 font-display whitespace-nowrap truncate">
            {t('appTitle')}
          </span>
        </div>

        {/* Right side controls: Only Theme Switcher & User Photo */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Dark / Light Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full text-neutral-700 dark:text-neutral-200 hover:text-emerald-700 dark:hover:text-emerald-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-neutral-700 transition-colors border border-neutral-200/70 dark:border-neutral-700 flex items-center justify-center"
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

          {/* User Photo Avatar */}
          {user ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className="w-9 h-9 rounded-full ring-2 ring-emerald-500/50 hover:ring-emerald-500 transition-all overflow-hidden flex items-center justify-center bg-emerald-600 text-white font-bold text-xs shrink-0"
              title={user.displayName || 'Profile & Settings'}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user.displayName?.[0] || 'T'}</span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={signingIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-60"
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


