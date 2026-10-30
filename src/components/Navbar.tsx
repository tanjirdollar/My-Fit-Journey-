import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard,
  Utensils,
  Dumbbell,
  Scale,
  CheckSquare,
  Moon,
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
      <nav className="hidden lg:block bg-white border-b border-neutral-200/80 sticky top-[57px] z-30 shadow-xs">
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
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.isHighlighted ? 'text-emerald-700' : 'text-neutral-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 z-40 px-2 py-1.5 pb-safe shadow-lg">
        <div className="flex items-center justify-around">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleSelectTab(tab.key)}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                  isActive ? 'text-emerald-700 font-bold' : 'text-neutral-500 font-medium'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isActive ? 'bg-emerald-100 text-emerald-700 scale-105' : 'text-neutral-500'
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
              isMoreActive ? 'text-emerald-700 font-bold' : 'text-neutral-500 font-medium'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isMoreActive ? 'bg-emerald-100 text-emerald-700 scale-105' : 'text-neutral-500'
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-fade-in">
          <div className="bg-white rounded-t-3xl p-5 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="font-bold text-neutral-900 text-sm">
                {language === 'bn' ? 'সকল বিভাগ ও ট্র্যাকার' : 'All Health Modules'}
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-4">
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
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-neutral-50 text-neutral-800 border-neutral-200/70 hover:bg-neutral-100'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : tab.isHighlighted
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-white text-neutral-700 shadow-2xs'
                      }`}
                    >
                      <Icon className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">{tab.label}</div>
                      {tab.isHighlighted && (
                        <span className="text-[9px] uppercase tracking-wider text-emerald-600 font-extrabold">
                          Gemini AI
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
