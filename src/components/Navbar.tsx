import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { PWAInstallButton } from './PWAInstallButton';
import {
  LayoutDashboard,
  Utensils,
  Dumbbell,
  Scale,
  CheckSquare,
  Moon,
  Sun,
  FileHeart,
  Bot,
  BarChart3,
  Target,
  MoreHorizontal,
  X,
} from 'lucide-react';

export type TabKey =
  | 'dashboard'
  | 'nutrition'
  | 'exercise'
  | 'body'
  | 'habits'
  | 'sleep'
  | 'healthRecords'
  | 'aiCoach'
  | 'reports'
  | 'goals';

interface NavTabItem {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isHighlighted?: boolean;
}

interface NavbarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const { t, language } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainTabs: NavTabItem[] = [
    { key: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { key: 'nutrition', label: t('nutrition'), icon: Utensils },
    { key: 'exercise', label: t('exercise'), icon: Dumbbell },
    { key: 'body', label: t('body'), icon: Scale },
    { key: 'habits', label: t('habits'), icon: CheckSquare },
  ];

  const secondaryTabs: NavTabItem[] = [
    { key: 'sleep', label: t('sleep'), icon: Moon },
    { key: 'healthRecords', label: t('healthRecords'), icon: FileHeart },
    { key: 'aiCoach', label: t('aiCoach'), icon: Bot, isHighlighted: true },
    { key: 'reports', label: t('reports'), icon: BarChart3 },
    { key: 'goals', label: t('goals'), icon: Target },
  ];

  const allTabs = [...mainTabs, ...secondaryTabs];

  const isMoreActive = secondaryTabs.some((tab) => tab.key === activeTab);

  const handleSelectTab = (key: TabKey) => {
    onTabChange(key);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation Tabs */}
      <nav className="hidden lg:block bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800 sticky top-[57px] z-30 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center space-x-1 overflow-x-auto py-2 no-scrollbar">
            {allTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleSelectTab(tab.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : tab.isHighlighted
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 border border-emerald-200/60 dark:border-emerald-800'
                      : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-white'
                        : tab.isHighlighted
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200/80 dark:border-neutral-800 z-40 px-2 py-1.5 pb-safe shadow-lg transition-colors">
        <div className="flex items-center justify-around">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleSelectTab(tab.key)}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'text-neutral-500 dark:text-neutral-400 font-medium'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 scale-105'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              isMoreActive
                ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                : 'text-neutral-500 dark:text-neutral-400 font-medium'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isMoreActive
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 scale-105'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              <MoreHorizontal className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">
              {language === 'bn' ? 'আরও' : 'More'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile "More" Drawer / Modal */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-t-3xl p-5 shadow-2xl max-h-[82vh] overflow-y-auto border-t border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                {language === 'bn' ? 'সকল বিভাগ ও ট্র্যাকার' : 'All Health Modules'}
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {allTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleSelectTab(tab.key)}
                    className={`flex items-center gap-3 p-3 rounded-2xl text-left border transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : tab.isHighlighted
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                        : 'bg-neutral-50 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-100 border-neutral-200/70 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : tab.isHighlighted
                          ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                          : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 shadow-2xs'
                      }`}
                    >
                      <Icon className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{tab.label}</div>
                      {tab.isHighlighted && (
                        <span className="text-[9px] tracking-wider text-emerald-600 dark:text-emerald-400 font-extrabold">
                          Gemini AI
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Theme Toggle & Install App Actions inside Mobile Drawer */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 text-xs font-bold flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-neutral-700" />
                  )}
                  <span>
                    {language === 'bn'
                      ? isDark
                        ? 'ডার্ক থিম সক্রিয় (লাইট থিমে যান)'
                        : 'লাইট থিম সক্রিয় (ডার্ক থিমে যান)'
                      : isDark
                      ? 'Dark Mode Active (Switch to Light)'
                      : 'Light Mode Active (Switch to Dark)'}
                  </span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {isDark ? 'Dark' : 'Light'}
                </span>
              </button>

              <PWAInstallButton variant="drawer" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

