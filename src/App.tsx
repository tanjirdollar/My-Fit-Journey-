import React, { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { FitnessDataProvider } from './context/FitnessDataContext';
import { Header } from './components/Header';
import { Navbar, TabKey } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { NutritionTracker } from './components/NutritionTracker';
import { ExerciseTracker } from './components/ExerciseTracker';
import { BodyMeasurements } from './components/BodyMeasurements';
import { HabitsTracker } from './components/HabitsTracker';
import { SleepTracker } from './components/SleepTracker';
import { HealthRecords } from './components/HealthRecords';
import { AICoach } from './components/AICoach';
import { Reports } from './components/Reports';
import { GoalsSettings } from './components/GoalsSettings';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  return (
    <div className="min-h-screen bg-neutral-50/80 text-neutral-900 flex flex-col font-sans">
      {/* Header */}
      <Header onOpenProfile={() => setActiveTab('goals')} />

      {/* Top Navigation for Desktop & Tablets */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-6">
        {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === 'nutrition' && <NutritionTracker />}
        {activeTab === 'exercise' && <ExerciseTracker />}
        {activeTab === 'body' && <BodyMeasurements />}
        {activeTab === 'habits' && <HabitsTracker />}
        {activeTab === 'sleep' && <SleepTracker />}
        {activeTab === 'healthRecords' && <HealthRecords />}
        {activeTab === 'aiCoach' && <AICoach />}
        {activeTab === 'reports' && <Reports />}
        {activeTab === 'goals' && <GoalsSettings />}
      </main>

      {/* Footer */}
      <footer className="hidden lg:block border-t border-neutral-200/80 bg-white py-4 text-center text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <span>MyFit Journey • Single-User Health &amp; Waistline Tracker</span>
          <span>Cloud Firestore Isolated Storage • Bengali &amp; English</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <FitnessDataProvider>
          <AppContent />
        </FitnessDataProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
