import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Globe,
  LogIn,
  LogOut,
  User as UserIcon,
  Sparkles,
  Calendar,
  ShieldCheck,
} from 'lucide-react';

interface HeaderProps {
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenProfile }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const { user, profile, signInWithGoogle, logOut, isDemoUser } = useAuth();
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <Activity className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-neutral-900 font-display">
                {t('appTitle')}
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Health & Waistline
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 hidden sm:block">
              {t('baselineInfo')}
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Date pill */}
          <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-neutral-600 bg-neutral-100/80 px-2.5 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <span>{todayFormatted}</span>
          </div>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 hover:text-emerald-700 bg-neutral-100 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200"
            title={language === 'en' ? 'Switch to Bengali' : 'Switch to English'}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">{language === 'en' ? 'বাংলা' : 'EN'}</span>
          </button>

          {/* User Auth */}
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-medium transition-colors"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {user.displayName?.[0] || 'T'}
                  </div>
                )}
                <span className="max-w-[85px] truncate font-semibold">
                  {user.displayName || 'Tanjir'}
                </span>
              </button>
              <button
                onClick={logOut}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title={t('signOut')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
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
        <div className="max-w-7xl mx-auto mt-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center justify-between">
          <span>{authError}</span>
          <button onClick={() => setAuthError(null)} className="font-bold ml-2">
            &times;
          </button>
        </div>
      )}
    </header>
  );
};
