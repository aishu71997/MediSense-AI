import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { DashboardTab } from './components/DashboardTab.tsx';
import { ReportsTab } from './components/ReportsTab.tsx';
import { MedicationTab } from './components/MedicationTab.tsx';
import { FitnessTab } from './components/FitnessTab.tsx';
import { AssistantTab } from './components/AssistantTab.tsx';
import { 
  Activity, Heart, Pill, Bot, Flame, LogOut, Sun, Moon, Sparkles, LogIn, Loader2, FileText, CheckCircle, Download, User, Settings 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateHealthReportPDF } from './lib/pdfGenerator.ts';

// Theme controller helper
const ThemeToggle: React.FC<{ theme: string; toggle: () => void }> = ({ theme, toggle }) => (
  <button
    id="theme-toggle"
    onClick={toggle}
    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-905 text-slate-650 dark:text-slate-350 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
  >
    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
  </button>
);

const AppContent: React.FC = () => {
  const { dbUser, loading, loginWithGoogle, logout, synchronizedFetch, compactMode, setCompactMode } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'meds' | 'fitness' | 'assistant'>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [exporting, setExporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleExportData = async () => {
    if (!dbUser) return;
    try {
      setExporting(true);
      const [resMetrics, resMeds, resLogs] = await Promise.all([
        synchronizedFetch('/api/metrics'),
        synchronizedFetch('/api/medications'),
        synchronizedFetch('/api/medication-logs'),
      ]);

      if (resMetrics.ok && resMeds.ok && resLogs.ok) {
        const metrics = await resMetrics.json();
        const medications = await resMeds.json();
        const logs = await resLogs.json();
        
        generateHealthReportPDF(dbUser, metrics, medications, logs);
      } else {
        alert('Failed to pull complete clinical and pharmaceutical sets from servers.');
      }
    } catch (err) {
      console.error('Failed to export medical data:', err);
      alert('A security or retrieval error occurred while building the PDF output.');
    } finally {
      setExporting(false);
    }
  };

  // Sync theme to root DOM
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme as any);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4 transition-colors">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-505 dark:text-emerald-400" />
        <span className="text-sm font-mono text-slate-400">Consulting MediSense AI databases...</span>
      </div>
    );
  }

  // Signed out check - Landing / Sign in page
  if (!dbUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between transition-colors font-sans">
        
        {/* Header bar */}
        <header className="px-6 py-4 max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 text-white dark:bg-emerald-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-bold tracking-tight text-slate-905 dark:text-white">MediSense AI</span>
          </div>
          <ThemeToggle theme={theme} toggle={toggleTheme} />
        </header>

        {/* Hero Section */}
        <main className="max-w-4xl mx-auto px-6 py-12 text-center space-y-8 my-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <span className="px-4 py-1.5 bg-indigo-50 dark:bg-emerald-950/20 text-indigo-505 dark:text-emerald-400 text-xs font-mono font-bold tracking-wider rounded-full border border-indigo-100 dark:border-emerald-900/30">
              CLINICAL DIALOGS & WELLNESS METRICS
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              AI-Augmented Healthcare Tracking & Term Translation
            </h1>
            <p className="text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Synthesize diagnostic reports, track medications, monitor daily step targets, and chat with a specialized medical assistant trained to present health targets simply.
            </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto border-t border-slate-205/50 dark:border-slate-805/40 pt-8">
            <button
              id="google-login-btn"
              onClick={loginWithGoogle}
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-3 transition-colors shadow-sm cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              Sign in with Google Account
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
            <div className="p-5 bg-white dark:bg-slate-900/40 border border-slate-105 dark:border-slate-850 rounded-2xl space-y-2 shadow-xs">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-lg inline-block"><Sparkles className="w-5 h-5 text-rose-500" /></div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Gemini Clinical Parser</h4>
              <p className="text-xs text-slate-400">Extracts complicated values from diagnostic files to explain atypical values neutrally.</p>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900/40 border border-slate-105 dark:border-slate-850 rounded-2xl space-y-2 shadow-xs">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-lg inline-block"><Pill className="w-5 h-5 text-blue-500" /></div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Prescription Auditor</h4>
              <p className="text-xs text-slate-400">Tracks regular dosing intervals and documents chronological medication ingestion histories.</p>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900/40 border border-slate-105 dark:border-slate-850 rounded-2xl space-y-2 shadow-xs">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-lg inline-block"><Flame className="w-5 h-5 text-amber-500" /></div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Physical Goal Milestones</h4>
              <p className="text-xs text-slate-400">Tracks custom aerobic targets and formats customized weekly routines via AI models.</p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 border-t border-slate-200/50 dark:border-slate-900 text-center text-xs text-slate-400">
          <p>MediSense AI Wellness Suite • Secure Cloud Run Sandboxing • HIPAA Compliant Layout Concepts</p>
        </footer>

      </div>
    );
  }

  // Signed in dashboard area
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'reports':
        return <ReportsTab />;
      case 'meds':
        return <MedicationTab />;
      case 'fitness':
        return <FitnessTab />;
      case 'assistant':
        return <AssistantTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-105 transition-colors font-sans pb-16">
      
      {/* Top Header menu */}
      <nav className="bg-white dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-850 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 text-white dark:bg-emerald-600 rounded-lg shadow-xs shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <span className="font-bold tracking-tight text-slate-950 dark:text-white hidden sm:inline-block">MediSense AI</span>
          </div>

          {/* Navigation tabs row */}
          <div className="flex gap-1 md:gap-2">
            {[
              { id: 'dashboard', label: 'Vitals', icon: Activity },
              { id: 'reports', label: 'Lab Reports', icon: FileText },
              { id: 'meds', label: 'Med Tracker', icon: Pill },
              { id: 'fitness', label: 'Workouts', icon: Flame },
              { id: 'assistant', label: 'AI Coach', icon: Bot },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  id={`tab-btn-${tab.id}`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs' 
                      : 'text-slate-450 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline-block">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right toggle controls and session off */}
          <div className="flex items-center gap-3">
            <button
              id="export-data-btn"
              onClick={handleExportData}
              disabled={exporting}
              title="Export Health Summary to PDF"
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-905 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-xs font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline-block">Export PDF</span>
            </button>

            <ThemeToggle theme={theme} toggle={toggleTheme} />

            <button
              id="profile-settings-btn"
              onClick={() => setShowSettings(true)}
              title="User Profile Settings"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-905 text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              id="logout-btn"
              onClick={logout}
              title="Sign out account"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shadow-xs whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container screen */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {renderTabContent()}
        </motion.div>
      </main>

      {/* User Profile Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 z-50 transition-colors"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-505 dark:text-emerald-400" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">User Profile Settings</h3>
                </div>
                <button
                  id="close-settings-btn-v"
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold tracking-wide"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Profile Summary Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-705 dark:text-slate-300">
                      {dbUser?.fullName ? dbUser.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-805 dark:text-slate-200 truncate max-w-[240px]">{dbUser?.fullName || 'Health Explorer'}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate max-w-[240px]">{dbUser?.email}</div>
                    </div>
                  </div>
                </div>

                {/* Compact Mode Toggle Option */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-indigo-50/40 dark:border-slate-850 bg-indigo-50/10 dark:bg-slate-950/25">
                    <div className="space-y-1">
                      <label htmlFor="compact-mode-chk" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                        ⚡ Compact Display Mode
                      </label>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal max-w-[260px]">
                        Reduces spacing, padding, and font sizes across the vitals dashboard parameters to fit more clinical telemetry charts on screen.
                      </p>
                    </div>
                    <button
                      id="compact-mode-chk"
                      onClick={() => setCompactMode(!compactMode)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        compactMode ? 'bg-indigo-600 dark:bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                          compactMode ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  id="done-close-settings-btn"
                  onClick={() => setShowSettings(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-505 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Done & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
