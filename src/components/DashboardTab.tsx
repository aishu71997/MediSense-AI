import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { HealthMetric } from '../types.ts';
import { MetricCard } from './MetricCard.tsx';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Activity, Heart, Battery, Droplet, Sparkles, Scale, RefreshCw, PlusCircle, Check, Loader2, Footprints, Trophy, Mail, Copy 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ProgressRing: React.FC<{
  percent: number;
  size?: number;
  strokeWidth?: number;
  strokeColor: string;
  icon: React.ReactNode;
  label: string;
  valueText: string;
  goalText: string;
  compact?: boolean;
}> = ({ percent, size = 76, strokeWidth = 5.5, strokeColor, icon, label, valueText, goalText, compact = false }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clampedPercent / 100) * circumference;

  return (
    <div className={`flex flex-col items-center text-center bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850/70 rounded-xl font-sans transition-all hover:shadow-2xs ${
      compact ? 'p-1.5 w-full sm:w-24' : 'p-3 w-full sm:w-28'
    }`}>
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg className="absolute w-full h-full transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-slate-100 dark:stroke-slate-805"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={`transition-all duration-700 ease-out ${strokeColor}`}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <div className="text-slate-500 dark:text-slate-400">
            {icon}
          </div>
          <span className={`font-bold text-slate-900 dark:text-white mt-0.5 leading-none ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {clampedPercent}%
          </span>
        </div>
      </div>
      <div className={`${compact ? 'mt-1' : 'mt-2'} text-center`}>
        <span className={`${compact ? 'text-[9.5px]' : 'text-[11px]'} font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[84px]`}>{label}</span>
        <span className={`${compact ? 'text-[8.5px]' : 'text-[9px]'} font-mono text-slate-450 dark:text-slate-505 block truncate max-w-[84px] mt-0.5`} title={`${valueText} / ${goalText}`}>
          {valueText}/{goalText}
        </span>
      </div>
    </div>
  );
};

export const DashboardTab: React.FC = () => {
  const { synchronizedFetch, compactMode } = useAuth();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [goals, setGoals] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<string | null>(null);

  // Email Weekly Summary for PCP States
  const [generatingWeekly, setGeneratingWeekly] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<string | null>(null);
  const [copiedWeekly, setCopiedWeekly] = useState(false);

  const handleGenerateWeeklySummary = async () => {
    try {
      setGeneratingWeekly(true);
      setWeeklySummary(null);
      setCopiedWeekly(false);
      const res = await synchronizedFetch('/api/metrics/weekly-summary', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setWeeklySummary(data.summary);
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to construct physician summary.');
      }
    } catch (error) {
      console.error('Error generating physician summary report:', error);
      alert('An error occurred during communication. Please verify network connectivity.');
    } finally {
      setGeneratingWeekly(false);
    }
  };

  const handleCopyWeeklySummary = () => {
    if (weeklySummary) {
      navigator.clipboard.writeText(weeklySummary);
      setCopiedWeekly(true);
      setTimeout(() => setCopiedWeekly(false), 2500);
    }
  };

  // Form input states
  const [showLogForm, setShowLogForm] = useState(false);
  const [weight, setWeight] = useState('');
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [waterIntake, setWaterIntake] = useState('');
  const [dateField, setDateField] = useState('');

  // Fetch metrics data, goals, and workouts
  const fetchMetricsData = async () => {
    try {
      setLoading(true);
      const [res, resGoals, resWorkouts] = await Promise.all([
        synchronizedFetch('/api/metrics'),
        synchronizedFetch('/api/fitness/goals'),
        synchronizedFetch('/api/fitness/workouts'),
      ]);

      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
      if (resGoals.ok) {
        const goalData = await resGoals.json();
        setGoals(goalData);
      }
      if (resWorkouts.ok) {
        const workoutsData = await resWorkouts.json();
        setWorkouts(workoutsData);
      }
    } catch (error) {
      console.error('Error fetching metrics logs & wellness details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricsData();
    // Default form date is today local time
    const todayStr = new Date().toISOString().split('T')[0];
    setDateField(todayStr);
  }, []);

  // Handle saving weight/vitals
  const handleSaveMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateField) return;

    try {
      setSaving(true);
      const payload = {
        recordedAt: dateField,
        weight: weight ? Number(weight) : undefined,
        bloodPressureSystolic: bpSystolic ? Number(bpSystolic) : undefined,
        bloodPressureDiastolic: bpDiastolic ? Number(bpDiastolic) : undefined,
        heartRate: heartRate ? Number(heartRate) : undefined,
        sleepHours: sleepHours ? Number(sleepHours) : undefined,
        waterIntakeMl: waterIntake ? Number(waterIntake) : undefined,
      };

      const res = await synchronizedFetch('/api/metrics', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchMetricsData();
        // Clear except date
        setWeight('');
        setBpSystolic('');
        setBpDiastolic('');
        setHeartRate('');
        setSleepHours('');
        setWaterIntake('');
        setShowLogForm(false);
      }
    } catch (e) {
      console.error('Save metrics failed:', e);
    } finally {
      setSaving(false);
    }
  };

  // Handle requesting Gemini advice
  const handleRequestAdvice = async () => {
    try {
      setEvaluating(true);
      setAiEvaluation(null);
      const res = await synchronizedFetch('/api/metrics/evaluate', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setAiEvaluation(data.analysis);
      } else {
        const err = await res.json();
        setAiEvaluation(`**Failed to analyze vites**: ${err.error || 'Server responded with issue'}`);
      }
    } catch (error) {
      console.error('AI evaluation request failed:', error);
      setAiEvaluation('An unexpected connection problem occurred while calling MediSense AI models.');
    } finally {
      setEvaluating(false);
    }
  };

  const latestVal = metrics[0] || {} as any;

  // Track today's stats for Daily Completion Ring
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMetric = metrics.find(m => m.recordedAt === todayStr);
  const todayWorkouts = workouts.filter(w => w.date === todayStr);
  const todaySteps = todayWorkouts.reduce((sum, w) => sum + (w.steps || 0), 0);

  // Targets and actuals with polished fallbacks
  const sleepGoal = goals?.sleepGoalHours || 8;
  const waterGoal = goals?.waterGoalMl || 2000;
  const stepsGoal = goals?.stepsGoal || 10000;

  const todaySleepHours = todayMetric?.sleepHours || 0;
  const todayWaterIntake = todayMetric?.waterIntakeMl || 0;

  // Calculate percentages (capped at 100%)
  const sleepPercent = Math.min(100, Math.round((todaySleepHours / sleepGoal) * 100));
  const waterPercent = Math.min(100, Math.round((todayWaterIntake / waterGoal) * 100));
  const stepsPercent = Math.min(100, Math.round((todaySteps / stepsGoal) * 100));

  // Overall average
  const dailyAverage = Math.round((sleepPercent + waterPercent + stepsPercent) / 3);

  // Format chart timeline data
  const chartData = [...metrics]
    .reverse()
    .map(m => ({
      date: m.recordedAt,
      Weight: m.weight || undefined,
      Pulse: m.heartRate || undefined,
      Systolic: m.bloodPressureSystolic || undefined,
      Diastolic: m.bloodPressureDiastolic || undefined,
      Sleep: m.sleepHours || undefined,
      Water: m.waterIntakeMl || undefined,
      BMI: m.bmi || undefined,
    }));

  return (
    <div id="dashboard-tab-container" className={compactMode ? "space-y-4" : "space-y-8"}>
      {/* Upper bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className={`${compactMode ? "text-xl" : "text-2xl"} font-semibold tracking-tight text-slate-900 dark:text-white`}>
            Personal Health Portal
          </h2>
          <p className={`${compactMode ? "text-xs" : "text-sm"} text-slate-505 dark:text-slate-400`}>
            Monitor weight milestones, daily blood pressure charts, biological pulse, and hydration levels.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            id="btn-refresh-metrics"
            onClick={fetchMetricsData}
            title="Refresh logs"
            className={`${compactMode ? "p-2 rounded-lg" : "p-3 rounded-xl"} bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-100 transition-colors cursor-pointer text-slate-600 dark:text-slate-300`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="btn-trigger-log-form"
            onClick={() => setShowLogForm(!showLogForm)}
            className={`${compactMode ? "px-4 py-2 text-xs rounded-lg" : "px-5 py-3 text-sm rounded-xl"} bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white flex items-center gap-2 font-medium transition-colors cursor-pointer`}
          >
            <PlusCircle className="w-4 h-4" />
            Add Health Metrics
          </button>
        </div>
      </div>

      {/* Input log dialog panel */}
      <AnimatePresence>
        {showLogForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl"
          >
            <form onSubmit={handleSaveMetrics} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3 mb-4">
                <span className="font-semibold text-slate-800 dark:text-white">Record Today's Health Profile</span>
                <span className="text-xs text-slate-400 font-mono">Height defaults to 1.75m for BMI calculations</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Recorded Date</label>
                  <input
                    type="date"
                    required
                    value={dateField}
                    onChange={(e) => setDateField(e.target.value)}
                    className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 72.8"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">BP Systolic (mmHg)</label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value)}
                    className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">BP Diastolic (mmHg)</label>
                  <input
                    type="number"
                    placeholder="e.g. 80"
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value)}
                    className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    placeholder="e.g. 72"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 font-mono">Sleep cycles (hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 7.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value)}
                    className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Water Intake (ml)</label>
                  <input
                    type="number"
                    placeholder="e.g. 2400"
                    value={waterIntake}
                    onChange={(e) => setWaterIntake(e.target.value)}
                    className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200/65 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                  Submit Metrics
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Completion Summary Card */}
      <div 
        id="daily-completion-summary-card" 
        className={`bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800/85 rounded-2xl flex flex-col xl:flex-row items-center justify-between shadow-xs transition-all ${
          compactMode ? 'p-3.5 gap-3' : 'p-6 gap-6'
        }`}
      >
        <div className={`${compactMode ? 'space-y-1' : 'space-y-2'} text-center xl:text-left flex-1 animate-fadeIn`}>
          <div className="flex items-center gap-2 justify-center xl:justify-start">
            <Trophy className={`${compactMode ? 'w-4 h-4' : 'w-5 h-5'} text-amber-500`} />
            <h3 className={`${compactMode ? 'text-sm font-bold' : 'text-lg font-semibold'} text-slate-900 dark:text-white`}>
              Daily Wellness Completion
            </h3>
          </div>
          <p className={`${compactMode ? 'text-[11px] leading-relaxed' : 'text-sm'} text-slate-500 dark:text-slate-400 max-w-md mx-auto xl:mx-0`}>
            Track your logs against daily recommended metric goals. Your progress represents your logs compared to recommended standards for Today ({todayStr}).
          </p>
        </div>

        <div className={`grid grid-cols-2 sm:grid-cols-4 ${compactMode ? 'gap-3' : 'gap-4'} w-full xl:w-auto shrink-0 justify-center`}>
          {/* Overall Health Score Ring */}
          <ProgressRing 
            percent={dailyAverage} 
            size={compactMode ? 62 : 76}
            strokeColor="stroke-emerald-555 dark:stroke-emerald-400"
            icon={<Trophy className={compactMode ? "w-3 h-3 text-emerald-500" : "w-3.5 h-3.5 text-emerald-500"} />}
            label="Overall Score"
            valueText={`${dailyAverage}%`}
            goalText="100%"
            compact={compactMode}
          />

          {/* Water Intake Ring */}
          <ProgressRing 
            percent={waterPercent} 
            size={compactMode ? 62 : 76}
            strokeColor="stroke-blue-500 animate-pulse"
            icon={<Droplet className={compactMode ? "w-3 h-3 text-blue-500" : "w-3.5 h-3.5 text-blue-500"} />}
            label="Water Intake"
            valueText={`${todayWaterIntake}ml`}
            goalText={`${waterGoal}ml`}
            compact={compactMode}
          />

          {/* Sleep Rest Ring */}
          <ProgressRing 
            percent={sleepPercent} 
            size={compactMode ? 62 : 76}
            strokeColor="stroke-purple-555 dark:stroke-purple-500"
            icon={<Battery className={compactMode ? "w-3 h-3 text-purple-500" : "w-3.5 h-3.5 text-purple-500"} />}
            label="Sleep Rest"
            valueText={`${todaySleepHours}h`}
            goalText={`${sleepGoal}h`}
            compact={compactMode}
          />

          {/* Steps Completed Ring */}
          <ProgressRing 
            percent={stepsPercent} 
            size={compactMode ? 62 : 76}
            strokeColor="stroke-amber-500"
            icon={<Footprints className={compactMode ? "w-3 h-3 text-amber-500" : "w-3.5 h-3.5 text-amber-500"} />}
            label="Steps Completed"
            valueText={todaySteps >= 1000 ? `${(todaySteps / 1000).toFixed(1)}k` : `${todaySteps}`}
            goalText={stepsGoal >= 1000 ? `${(stepsGoal / 1000).toFixed(0)}k` : `${stepsGoal}`}
            compact={compactMode}
          />
        </div>
      </div>

      {/* Email Weekly Summary for PCP */}
      <div 
        id="email-weekly-summary-card"
        className={`bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800/85 rounded-2xl flex flex-col shadow-xs animate-fadeIn transition-all ${
          compactMode ? 'p-3.5 gap-3' : 'p-6 gap-6'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className={`${compactMode ? 'space-y-0.5' : 'space-y-1.5'} flex-1`}>
            <div className="flex items-center gap-2">
              <Mail className={`${compactMode ? 'w-4 h-4' : 'w-5 h-5'} text-indigo-505 dark:text-emerald-450`} />
              <h3 className={`${compactMode ? 'text-sm font-bold' : 'text-lg font-semibold'} text-slate-900 dark:text-white`}>
                Email Weekly Summary for Primary Care Physician
              </h3>
            </div>
            <p className={`${compactMode ? 'text-[11px] leading-relaxed' : 'text-sm'} text-slate-500 dark:text-slate-400 max-w-2xl`}>
              Consolidate the last 7 days of blood pressure, heart rate, hydration, fitness logs, and active medication adherence into a comprehensive medical summary. Ready to draft and email directly to your doctor.
            </p>
          </div>
          <button
            id="btn-generate-weekly-summary"
            onClick={handleGenerateWeeklySummary}
            disabled={generatingWeekly}
            className={`${compactMode ? "px-4 py-2 text-xs rounded-lg" : "px-5 py-2.5 text-xs rounded-xl"} md:self-center shrink-0 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-xs transition-all cursor-pointer`}
          >
            {generatingWeekly ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Synthesizing Telemetry...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                Generate Physician Report
              </>
            )}
          </button>
        </div>

        <AnimatePresence>
          {weeklySummary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="border-t border-slate-100 dark:border-slate-805/50 pt-5 space-y-4 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-indigo-505 dark:text-emerald-450 block">PCP REPORT READY</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      We've compiled your data into a medical email draft. Press Copy to paste it into your physician's patient portal message board or email service.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyWeeklySummary}
                      className="px-4 py-2 bg-indigo-50/80 dark:bg-slate-800 text-indigo-700 dark:text-slate-200 border border-indigo-100/40 dark:border-slate-700 hover:bg-indigo-100 dark:hover:bg-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedWeekly ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-505" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Report Text
                        </>
                      )}
                    </button>
                    <a
                      href={`mailto:?subject=My Weekly Telemetry Trends Summary - MediSense&body=${encodeURIComponent(weeklySummary)}`}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-white" />
                      Open in Email Client
                    </a>
                  </div>
                </div>

                <div className="p-5 bg-indigo-50/10 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800 rounded-xl max-h-[480px] overflow-y-auto">
                  <div className="text-xs text-slate-750 dark:text-slate-300 font-sans leading-relaxed whitespace-pre-wrap select-text selection:bg-indigo-100 dark:selection:bg-slate-700">
                    {weeklySummary}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid of latest vites Metrics Cards */}
      <motion.div 
        layout
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.08
            }
          }
        }}
        className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 ${compactMode ? 'gap-3.5' : 'gap-6'}`}
      >
        <MetricCard
          title="Milestone Weight"
          value={latestVal.weight || '--'}
          unit="kg"
          icon={<Scale className="w-5 h-5" />}
          color="indigo"
          subtitle={latestVal.recordedAt ? `Last Logged: ${latestVal.recordedAt}` : 'No Log found'}
          compact={compactMode}
        />

        <MetricCard
          title="Blood Pressure"
          value={latestVal.bloodPressureSystolic && latestVal.bloodPressureDiastolic ? `${latestVal.bloodPressureSystolic}/${latestVal.bloodPressureDiastolic}` : '--'}
          unit="mmHg"
          icon={<Activity className="w-5 h-5" />}
          color="rose"
          subtitle={latestVal.bloodPressureSystolic > 130 ? 'Pre-hypertension' : 'Normal parameters'}
          compact={compactMode}
        />

        <MetricCard
          title="Pulse Rate"
          value={latestVal.heartRate || '--'}
          unit="bpm"
          icon={<Heart className="w-5 h-5" />}
          color="emerald"
          subtitle="At sleep resting target"
          compact={compactMode}
        />

        <MetricCard
          title="Sleep Cycle"
          value={latestVal.sleepHours || '--'}
          unit="hrs"
          icon={<Battery className="w-5 h-5" />}
          color="purple"
          subtitle="Standard rest is 7 to 9h"
          compact={compactMode}
        />

        <MetricCard
          title="Daily Hydration"
          value={latestVal.waterIntakeMl || '--'}
          unit="ml"
          icon={<Droplet className="w-5 h-5" />}
          color="blue"
          subtitle="Ideal intake is 2000-3000ml"
          compact={compactMode}
        />

        <MetricCard
          title="Body Mass Index (BMI)"
          value={latestVal.bmi || '--'}
          unit="index"
          icon={<Sparkles className="w-5 h-5" />}
          color="amber"
          subtitle="Atypical metric shifts weight status"
          compact={compactMode}
        />
      </motion.div>

      {/* Analytics charts section and AI Review side by side */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 ${compactMode ? 'gap-4 animate-fadeIn' : 'gap-8 animate-fadeIn'}`}>
        
        {/* Recharts Graphical stats panel */}
        <div className={`lg:col-span-2 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl transition-all ${
          compactMode ? 'p-3.5' : 'p-6'
        }`}>
          <h3 className={`font-semibold tracking-tight text-slate-900 dark:text-white ${compactMode ? 'text-xs mb-3' : 'text-lg mb-6'}`}>Health Parameters Timeline Trends</h3>
          
          <div className={compactMode ? "h-56 w-full" : "h-72 w-full"}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/40" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '8px', 
                      color: '#f8fafc',
                      fontSize: '11px',
                      border: 'none'
                    }} 
                  />
                  <Area type="monotone" dataKey="Weight" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorWeight)" />
                  <Area type="monotone" dataKey="Pulse" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPulse)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-405 font-mono text-xs">
                <span>Record metrics on multiple days to view active graphs.</span>
              </div>
            )}
          </div>
          
          <div className={`flex gap-4 justify-center ${compactMode ? 'mt-2' : 'mt-4'}`}>
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
              <span className="w-2 h-2 bg-indigo-500 rounded-full inline-block"></span> Weight (kg)
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
              <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span> Pulse (bpm)
            </span>
          </div>
        </div>

        {/* AI Health metrics feedback box */}
        <div className={`bg-slate-900/5 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl flex flex-col justify-between transition-all ${
          compactMode ? 'p-3.5 gap-3' : 'p-6 gap-6'
        }`}>
          <div>
            <div className={`flex items-center gap-2 ${compactMode ? 'mb-1.5' : 'mb-3'}`}>
              <Sparkles className={`${compactMode ? 'w-4 h-4' : 'w-5 h-5'} text-indigo-500 dark:text-emerald-400`} />
              <h3 className={`font-semibold tracking-tight text-slate-900 dark:text-white ${compactMode ? 'text-xs' : 'text-lg'}`}>Gemini Vitals Review</h3>
            </div>
            <p className={`text-slate-500 dark:text-slate-400 ${compactMode ? 'text-[11px] leading-relaxed mb-3' : 'text-sm mb-6'}`}>
              Synthesizes your accumulated vital logs to explain normal reference ranges in conversational language.
            </p>

            <div className={`bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 overflow-y-auto ${
              compactMode ? 'p-3 max-h-52' : 'p-4 max-h-72'
            }`}>
              {evaluating ? (
                <div className="flex flex-col items-center py-6 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-450 dark:text-emerald-400" />
                  <span className="text-[10px] font-mono text-slate-400">Reviewing logs...</span>
                </div>
              ) : aiEvaluation ? (
                <div id="ai-status-md" className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-sans whitespace-pre-wrap">
                  {aiEvaluation}
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 font-mono text-center py-6">
                  Click below to prompt Gemini to compile metric feedback.
                </div>
              )}
            </div>
          </div>

          <button
            id="btn-evaluate-metrics"
            onClick={handleRequestAdvice}
            disabled={evaluating || metrics.length === 0}
            className={`w-full bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 hover:bg-slate-800 text-white font-semibold tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition-all ${
              compactMode ? 'py-2.5 text-xs rounded-lg' : 'py-3 text-xs rounded-xl'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Analyze Latest Logs
          </button>
        </div>

      </div>
    </div>
  );
};
export default DashboardTab;
