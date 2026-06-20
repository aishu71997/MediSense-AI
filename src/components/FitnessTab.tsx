import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { FitnessGoal, WorkoutLog } from '../types.ts';
import { 
  Flame, Footprints, Target, Droplet, Clock, Check, Plus, Loader2, Sparkles, Watch, RefreshCw, Heart, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FitnessTab: React.FC = () => {
  const { synchronizedFetch } = useAuth();
  const [goals, setGoals] = useState<FitnessGoal | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);
  const [loggingWorkout, setLoggingWorkout] = useState(false);

  // Wearable Sync States
  const [selectedBrand, setSelectedBrand] = useState<'Garmin' | 'Fitbit' | 'Apple Health' | 'Whoop'>('Apple Health');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'scanning' | 'downloading' | 'review'>('idle');
  const [syncStep, setSyncStep] = useState(0);
  const [syncedStats, setSyncedStats] = useState<{
    steps: number;
    heartRate: number;
    durationMinutes: number;
    calories: number;
    workoutType: string;
  } | null>(null);
  const [savingSyncToServer, setSavingSyncToServer] = useState(false);

  const statusMessages = [
    "Establishing encrypted BLE secure tunnel...",
    "Querying cloud activity servers for offline packets...",
    "Decrypting fit telemetry logs...",
    "Validating cardiac heart rate logs...",
    "Ready for patient medical dashboard ingest!"
  ];

  const handleSimulateWearableSync = () => {
    setSyncStatus('scanning');
    setSyncStep(0);
    setSyncedStats(null);

    // Let's create an elegant interval to cycle through sync stages
    const timer = setInterval(() => {
      setSyncStep((prev) => {
        if (prev < statusMessages.length - 1) {
          return prev + 1;
        } else {
          clearInterval(timer);
          // Sync complete, generate beautiful dummy telemetry data tailored to selected brand
          const randomSteps = Math.floor(Math.random() * 5200) + 4800; // 4800 to 10000
          const randomHR = Math.floor(Math.random() * 25) + 65; // 65 to 90 bpm
          const randomDuration = Math.floor(Math.random() * 30) + 20; // 20 to 50 mins
          const randomCal = Math.floor(randomDuration * 7.5); // ~7.5 kcal per min
          const typesAvailable = ["Walking", "Running", "Gym / Strength", "Cycling"];
          const randomType = typesAvailable[Math.floor(Math.random() * typesAvailable.length)];

          setSyncedStats({
            steps: randomSteps,
            heartRate: randomHR,
            durationMinutes: randomDuration,
            calories: randomCal,
            workoutType: randomType
          });
          setSyncStatus('review');
          return prev;
        }
      });
    }, 900);
  };

  const handleSaveSyncedWorkout = async () => {
    if (!syncedStats) return;
    try {
      setSavingSyncToServer(true);
      const res = await synchronizedFetch('/api/fitness/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: `${selectedBrand} ${syncedStats.workoutType}`,
          durationMinutes: syncedStats.durationMinutes,
          caloriesBurned: syncedStats.calories,
          steps: syncedStats.steps,
          date: new Date().toISOString().split('T')[0],
        }),
      });

      if (res.ok) {
        alert(`Successfully saved ${selectedBrand} telemetry metrics to PostgreSQL!`);
        setSyncStatus('idle');
        setSyncedStats(null);
        await fetchFitnessData();
      } else {
        alert('Failed to save telemetry workout log to database.');
      }
    } catch (e) {
      console.error('Error saving synced workout:', e);
    } finally {
      setSavingSyncToServer(false);
    }
  };

  // Form states
  const [stepsGoal, setStepsGoal] = useState('');
  const [waterGoal, setWaterGoal] = useState('');
  const [sleepGoal, setSleepGoal] = useState('');
  const [weightGoal, setWeightGoal] = useState('');

  const [workoutType, setWorkoutType] = useState('Walking');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [workoutSteps, setWorkoutSteps] = useState('');
  const [workoutDate, setWorkoutDate] = useState('');

  const [activeFormTab, setActiveFormTab] = useState<'workout' | 'goals'>('workout');

  const fetchFitnessData = async () => {
    try {
      setLoading(true);
      const resGoals = await synchronizedFetch('/api/fitness/goals');
      const resWorkouts = await synchronizedFetch('/api/fitness/workouts');
      if (resGoals.ok && resWorkouts.ok) {
        const goalData = await resGoals.json();
        const workoutsData = await resWorkouts.json();
        setGoals(goalData);
        setWorkouts(workoutsData);

        // Prepopulate configuration goals
        setStepsGoal(goalData.stepsGoal.toString());
        setWaterGoal(goalData.waterGoalMl.toString());
        setSleepGoal(goalData.sleepGoalHours.toString());
        setWeightGoal(goalData.weightGoal ? goalData.weightGoal.toString() : '');
      }
    } catch (e) {
      console.error('Error fetching wellness trackers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFitnessData();
    setWorkoutDate(new Date().toISOString().split('T')[0]);
  }, []);

  const handleUpdateGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingGoal(true);
      const res = await synchronizedFetch('/api/fitness/goals', {
        method: 'POST',
        body: JSON.stringify({
          stepsGoal: Number(stepsGoal),
          waterGoalMl: Number(waterGoal),
          sleepGoalHours: Number(sleepGoal),
          weightGoal: weightGoal ? Number(weightGoal) : null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setGoals(updated);
        alert('Fitness milestones stored successfully in PostgreSQL!');
      }
    } catch (err) {
      console.error('Update goals error:', err);
    } finally {
      setSavingGoal(false);
    }
  };

  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duration || !workoutDate) return;

    try {
      setLoggingWorkout(true);
      const res = await synchronizedFetch('/api/fitness/workouts', {
        method: 'POST',
        body: JSON.stringify({
          type: workoutType,
          durationMinutes: Number(duration),
          caloriesBurned: calories ? Number(calories) : 0,
          steps: workoutSteps ? Number(workoutSteps) : 0,
          date: workoutDate,
        }),
      });

      if (res.ok) {
        setDuration('');
        setCalories('');
        setWorkoutSteps('');
        await fetchFitnessData();
      }
    } catch (e) {
      console.error('Save workout error:', e);
    } finally {
      setLoggingWorkout(false);
    }
  };

  // Aggregated sums of exercises completed this month
  const totalSteps = workouts.reduce((acc, w) => acc + w.steps, 0);
  const totalCalories = workouts.reduce((acc, w) => acc + w.caloriesBurned, 0);
  const totalMinutes = workouts.reduce((acc, w) => acc + w.durationMinutes, 0);

  return (
    <div id="fitness-tab-container" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Left side: stats overview of workouts completed */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-indigo-505 text-amber-500" />
            Physiological Training logs
          </h2>
          <p className="text-xs text-slate-400 mt-1">Audit active steps, burn calorie loads, and structure physical intervals.</p>
        </div>

        {/* Aggregated milestones highlights panels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl">
            <span className="text-xs text-slate-400 font-medium font-mono uppercase">Completed Steps</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-semibold tracking-tight text-slate-850 dark:text-white">{totalSteps}</span>
              <span className="text-xs text-slate-500">steps</span>
            </div>
          </div>

          <div className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl">
            <span className="text-xs text-slate-400 font-medium font-mono uppercase">Calories Spent</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-semibold tracking-tight text-slate-855 dark:text-white">{totalCalories}</span>
              <span className="text-xs text-slate-500">kcal</span>
            </div>
          </div>

          <div className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl">
            <span className="text-xs text-slate-400 font-medium font-mono uppercase">Workout Duration</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-semibold tracking-tight text-slate-855 dark:text-white">{totalMinutes}</span>
              <span className="text-xs text-slate-500">mins</span>
            </div>
          </div>
        </div>

        {/* Sync Wearable Gateway Widget */}
        <div id="sync-wearable-gateway" className="p-6 border border-indigo-100 dark:border-slate-800 bg-gradient-to-br from-indigo-50/15 to-white dark:from-slate-905 dark:to-slate-900 rounded-2xl space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold font-mono text-indigo-500 dark:text-emerald-400 tracking-wider uppercase block">
                Wearable BLE Connector
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Watch className="w-4 h-4 text-slate-500 dark:text-emerald-450" /> Sync External Physiological Tracker
              </h3>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-700">
              Mock BLE API Link
            </span>
          </div>

          {syncStatus === 'idle' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                Choose your physical smart tracker to fetch real-time heart rate intervals, active daily step milestones, and physical calorie loads from external wellness SDKs.
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'Apple Health', color: 'border-rose-200 hover:bg-rose-50/35 dark:border-rose-900/20', text: 'Apple Health', logo: '❤️' },
                  { id: 'Garmin', color: 'border-blue-200 hover:bg-blue-50/35 dark:border-blue-900/20', text: 'Garmin', logo: '🧭' },
                  { id: 'Fitbit', color: 'border-teal-200 hover:bg-teal-50/35 dark:border-teal-900/20', text: 'Fitbit', logo: '💠' },
                  { id: 'Whoop', color: 'border-slate-350 hover:bg-slate-50/35 dark:border-slate-800/40', text: 'Whoop', logo: '⚡' }
                ].map(brand => (
                  <button
                    key={brand.id}
                    onClick={() => setSelectedBrand(brand.id as any)}
                    className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${brand.color} ${
                      selectedBrand === brand.id 
                        ? 'bg-indigo-50/30 dark:bg-indigo-950/25 ring-2 ring-indigo-500/55 dark:ring-emerald-500/40 border-transparent font-semibold' 
                        : 'bg-white dark:bg-slate-950/60'
                    }`}
                  >
                    <span className="text-lg">{brand.logo}</span>
                    <span className="text-[11px] text-slate-800 dark:text-slate-300 block">{brand.text}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSimulateWearableSync}
                  className="px-5 py-2.5 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-305 dark:text-emerald-300" />
                  Connect to {selectedBrand}
                </button>
              </div>
            </div>
          )}

          {syncStatus === 'scanning' && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-slate-850 rounded-xl space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-555 dark:text-emerald-450 animate-spin" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Querying {selectedBrand} Bluetooth Transceiver...
                  </span>
                </div>
                <span className="text-[10px] font-mono text-indigo-500 dark:text-emerald-400 font-bold">
                  Stage {syncStep + 1} of {statusMessages.length}
                </span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((syncStep + 1) / statusMessages.length) * 100}%` }}
                />
              </div>

              <p className="text-[11px] font-mono text-slate-450 dark:text-slate-500 italic">
                {statusMessages[syncStep]}
              </p>
            </div>
          )}

          {syncStatus === 'review' && syncedStats && (
            <div className="p-5 bg-emerald-50/10 dark:bg-emerald-950/5 border border-emerald-100 dark:border-emerald-950/30 rounded-xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-50/45 dark:border-emerald-950/20">
                <div className="flex items-center gap-2">
                  <div className="p-1 px-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold font-mono text-[9px] uppercase tracking-wider rounded-full">
                    ✅ API Sync Secure
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedBrand} Stream Success
                  </span>
                </div>
                <button
                  onClick={() => setSyncStatus('idle')}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Reset Conn
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-850 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-mono font-medium">PHYSIOLOGICAL TYPE</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-1">
                    🏃 {syncedStats.workoutType}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-850 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-mono font-medium">TOTAL ACTIVE STEPS</span>
                  <span className="text-xs font-bold text-indigo-605 dark:text-indigo-400 flex items-center gap-1 mt-1">
                    <Footprints className="w-3.5 h-3.5 inline" /> {syncedStats.steps}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-850 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-mono font-medium">MEAN HEART RATE</span>
                  <span className="text-xs font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1 mt-1">
                    <Heart className="w-3.5 h-3.5 inline animate-pulse text-rose-500" /> {syncedStats.heartRate} bpm
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-850 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-mono font-medium">ENERGY METABOLIC</span>
                  <span className="text-xs font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1 mt-1">
                    <Flame className="w-3.5 h-3.5 inline" /> {syncedStats.calories} kcal
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <p className="text-[10px] text-slate-500 max-w-sm">
                  These telemetry metrics represent your physical logs compiled since your last tracker synchronization on today's date.
                </p>
                <button
                  onClick={handleSaveSyncedWorkout}
                  disabled={savingSyncToServer}
                  className="px-5 py-2.5 bg-indigo-650 dark:bg-emerald-600 hover:bg-indigo-700 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingSyncToServer ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving and Syncing...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Confirm & Save to Logs
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* List of recent activities completed */}
        <div className="space-y-4">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Training Session Timeline</span>
          
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-6 text-xs text-slate-400 font-mono">Loading training timeline...</div>
            ) : workouts.length === 0 ? (
              <div className="p-8 text-center border border-slate-150 dark:border-slate-850 bg-white dark:bg-slate-950 rounded-2xl">
                <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-405 font-mono">No recent workouts cataloged. Log sports sessions on the side panel.</p>
              </div>
            ) : (
              workouts.map(w => (
                <div
                  id={`workout-item-${w.id}`}
                  key={w.id}
                  className="p-4 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-855 dark:text-slate-200">{w.type}</h4>
                      <span className="text-[10px] font-mono text-slate-400 mt-0.5 inline-block">Duration: {w.durationMinutes} mins</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div className="font-mono">
                      <p className="text-[10px] text-slate-400">Calories spent</p>
                      <span className="text-xs font-semibold text-rose-500">{w.caloriesBurned} kcal</span>
                    </div>
                    {w.steps > 0 && (
                      <div className="font-mono">
                        <p className="text-[10px] text-slate-400">Active steps</p>
                        <span className="text-xs font-semibold text-indigo-500">{w.steps}</span>
                      </div>
                    )}
                    <span className="text-[10px] font-mono text-slate-400 px-2 py-1 bg-slate-50 dark:bg-slate-950 border rounded-sm">
                      {w.date}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Side segment: form tabs to either update target milestones or input exercise logs */}
      <div className="space-y-6">
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveFormTab('workout')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center cursor-pointer ${
              activeFormTab === 'workout' 
                ? 'bg-slate-100 dark:bg-slate-850 text-slate-900 dark:text-white' 
                : 'text-slate-400'
            }`}
          >
            Log Exercise
          </button>
          
          <button
            onClick={() => setActiveFormTab('goals')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center cursor-pointer ${
              activeFormTab === 'goals' 
                ? 'bg-slate-100 dark:bg-slate-850 text-slate-900 dark:text-white' 
                : 'text-slate-400'
            }`}
          >
            Active Goals
          </button>
        </div>

        {activeFormTab === 'workout' ? (
          <form onSubmit={handleLogWorkout} className="p-5 border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900/30 rounded-2xl space-y-4">
            <span className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">Input Active Workout</span>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Activity Type</label>
              <select
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value)}
                className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
              >
                <option>Walking</option>
                <option>Running</option>
                <option>Cycling</option>
                <option>Swimming</option>
                <option>Yoga</option>
                <option>Gym / Strength</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Duration (Minutes)</label>
              <input
                type="number"
                required
                placeholder="e.g. 45"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Calories Burned (kcal)</label>
              <input
                type="number"
                placeholder="e.g. 350"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 font-mono">Steps Completed (if aerobic)</label>
              <input
                type="number"
                placeholder="e.g. 6200"
                value={workoutSteps}
                onChange={(e) => setWorkoutSteps(e.target.value)}
                className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Training Date</label>
              <input
                type="date"
                required
                value={workoutDate}
                onChange={(e) => setWorkoutDate(e.target.value)}
                className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loggingWorkout}
              className="w-full py-2.5 bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 font-sans"
            >
              {loggingWorkout && <Loader2 className="animate-spin w-3.5 h-3.5" />}
              Save Session Log
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpdateGoals} className="p-5 border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900/30 rounded-2xl space-y-4">
            <span className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">Edit Dynamic Targets</span>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5 text-indigo-500" /> Daily Steps Goal
              </label>
              <input
                type="number"
                required
                value={stepsGoal}
                onChange={(e) => setStepsGoal(e.target.value)}
                className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Droplet className="w-3.5 h-3.5 text-blue-500" /> Daily Water Target (ml)
              </label>
              <input
                type="number"
                required
                value={waterGoal}
                onChange={(e) => setWaterGoal(e.target.value)}
                className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-500" /> Sleep Goal (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={sleepGoal}
                onChange={(e) => setSleepGoal(e.target.value)}
                className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Weight Goal (kg - optional)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 70.0"
                value={weightGoal}
                onChange={(e) => setWeightGoal(e.target.value)}
                className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={savingGoal}
              className="w-full py-2.5 bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 font-sans"
            >
              {savingGoal && <Loader2 className="animate-spin w-3.5 h-3.5" />}
              Save Active Milestones
            </button>
          </form>
        )}
      </div>

    </div>
  );
};
export default FitnessTab;
