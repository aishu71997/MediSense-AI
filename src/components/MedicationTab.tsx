import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Medication, MedicationLog } from '../types.ts';
import { 
  Pill, Calendar, Clock, Plus, Bell, Check, Trash2, ShieldAlert, Loader2, ListTodo,
  Volume2, Sparkles, AlertCircle, Play, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createMedicationEvent } from '../lib/googleCalendar.ts';

export const MedicationTab: React.FC = () => {
  const { synchronizedFetch } = useAuth();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Google Calendar Integration states
  const [syncingMedIds, setSyncingMedIds] = useState<Record<number, boolean>>({});
  const [syncToCalendarOnCreate, setSyncToCalendarOnCreate] = useState(false);

  // Push notifications & Toast states
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [activeToasts, setActiveToasts] = useState<Array<{
    id: string;
    medId: number;
    name: string;
    dosage: string;
    time: string;
  }>>([]);
  const [lastCheckMinute, setLastCheckMinute] = useState<string>('');

  // Form states
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchMedicationData = async () => {
    try {
      setLoading(true);
      const resMeds = await synchronizedFetch('/api/medications');
      const resLogs = await synchronizedFetch('/api/medication-logs');
      if (resMeds.ok && resLogs.ok) {
        const medsData = await resMeds.json();
        const logsData = await resLogs.json();
        setMeds(medsData);
        setLogs(logsData);
      }
    } catch (e) {
      console.error('Failed to grab prescription levels:', e);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Request notifications permission helper
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support HTML5 desktop notifications.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationsAllowed(permission === 'granted');
      if (permission === 'granted') {
        new Notification('MediSense AI Active Compliance Reminders', {
          body: 'Success! Real-time medication alarm intervals have been integrated with your device.',
        });
      }
    } catch (err) {
      console.error('Failed to request notifications permission:', err);
    }
  };

  // Helper to play synthesized doctor chime alert
  const playAlertChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
      
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain2.gain.setValueAtTime(0.06, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.25);
      }, 160);
    } catch (e) {
      console.log('Audio alert blocked by media permission policies.');
    }
  };

  // Triggering visual and local alert state
  const triggerNotification = (med: Medication) => {
    const toastId = `${med.id}-${Date.now()}`;
    const newToast = {
      id: toastId,
      medId: med.id,
      name: med.name,
      dosage: med.dosage,
      time: med.reminderTime
    };

    // Mount visual toast to absolute alert bar
    setActiveToasts(prev => [newToast, ...prev]);
    playAlertChime();

    // Trigger local HTML5 Desktop Notifications if allowed
    if (notificationsAllowed && 'Notification' in window) {
      try {
        const notification = new Notification(`Compliance Alarm: ${med.name}`, {
          body: `It is time to consume your ${med.dosage}. Scheduled mark: ${med.reminderTime}.`,
          tag: `med-${med.id}`,
        });
        notification.onclick = () => {
          window.focus();
          handleTakeMedication(med.id);
          notification.close();
        };
      } catch (err) {
        console.warn('Notification permission failed inside sandboxed preview channel.', err);
      }
    }
  };

  // Simulated Test Alarm Builder
  const handleTestNotification = () => {
    if (meds.length === 0) {
      const sampleMed: Medication = {
        id: -999,
        userId: -999,
        name: 'Simulated Aspirin',
        dosage: '81mg Daily Dose',
        frequency: 'Test Compliance Interval',
        reminderTime: 'Now',
        startDate: todayStr,
        endDate: null,
        active: true,
        createdAt: new Date().toISOString()
      };
      triggerNotification(sampleMed);
    } else {
      // Pick the first available active medication
      triggerNotification(meds[0]);
    }
  };

  // Initialize and schedule clock interval checking loop
  useEffect(() => {
    fetchMedicationData();
    setStartDate(todayStr);

    if ('Notification' in window) {
      setNotificationsAllowed(Notification.permission === 'granted');
    }

    const checkReminders = () => {
      const now = new Date();
      const hrsStr = String(now.getHours()).padStart(2, '0');
      const minsStr = String(now.getMinutes()).padStart(2, '0');
      const currentHHMM = `${hrsStr}:${minsStr}`;

      if (currentHHMM === lastCheckMinute) return;
      setLastCheckMinute(currentHHMM);

      meds.forEach(med => {
        if (med.reminderTime === currentHHMM) {
          const isTakenToday = logs.some(l => l.medicationId === med.id && l.date === todayStr);
          if (!isTakenToday) {
            triggerNotification(med);
          }
        }
      });
    };

    const intervalId = setInterval(checkReminders, 12000);
    return () => clearInterval(intervalId);
  }, [meds, logs, lastCheckMinute]);

  const handleSyncToGoogleCalendar = async (med: Medication) => {
    try {
      setSyncingMedIds(prev => ({ ...prev, [med.id]: true }));
      const result = await createMedicationEvent({
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        reminderTime: med.reminderTime,
        startDate: med.startDate,
        endDate: med.endDate
      });
      alert(`Successfully synchronized ${med.name} with your Google Calendar!\n\nYou can view and edit reminders at: ${result.htmlLink}`);
    } catch (error: any) {
      console.error('Google Calendar Sync Error:', error);
      alert(`Google Calendar Integration Error: ${error.message || error}`);
    } finally {
      setSyncingMedIds(prev => ({ ...prev, [med.id]: false }));
    }
  };

  const handleCreateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName || !dosage) return;

    try {
      setAdding(true);
      const payload = {
        name: medName,
        dosage,
        frequency,
        reminderTime,
        startDate,
        endDate: endDate || null,
      };

      const res = await synchronizedFetch('/api/medications', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const createdMed = await res.json();
        
        if (syncToCalendarOnCreate) {
          try {
            await createMedicationEvent({
              name: createdMed.name,
              dosage: createdMed.dosage,
              frequency: createdMed.frequency,
              reminderTime: createdMed.reminderTime,
              startDate: createdMed.startDate,
              endDate: createdMed.endDate
            });
            alert('A compliance alarm has been safely registered in your Google Calendar.');
          } catch (calErr: any) {
            console.error('Google Calendar auto-link failed:', calErr);
            alert(`Medication record saved locally, but automatic Google Calendar connection failed: ${calErr.message || calErr}`);
          }
        }

        setMedName('');
        setDosage('');
        setFrequency('Once daily');
        setReminderTime('09:00');
        setSyncToCalendarOnCreate(false);
        setShowAddForm(false);
        await fetchMedicationData();
      }
    } catch (err) {
      console.error('Create medicine error:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleTakeMedication = async (medId: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Optimistic state
    try {
      const res = await synchronizedFetch('/api/medication-logs', {
        method: 'POST',
        body: JSON.stringify({
          medicationId: medId,
          status: 'taken',
          date: todayStr,
        }),
      });

      if (res.ok) {
        await fetchMedicationData();
      }
    } catch (e) {
      console.error('Log compliance crashed:', e);
    }
  };

  const handleDeleteMed = async (medId: number) => {
    if (!confirm('Eliminate this medication tracker and compliance records?')) return;
    try {
      const res = await synchronizedFetch(`/api/medications/${medId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMeds(meds.filter(m => m.id !== medId));
        setLogs(logs.filter(l => l.medicationId !== medId));
      }
    } catch (error) {
      console.error('Delete med failed:', error);
    }
  };

  return (
    <div id="med-tab-container" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* List of active meds */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Pill className="w-5 h-5 text-indigo-500 dark:text-emerald-400" />
              Active Medication Registry
            </h2>
            <p className="text-xs text-slate-400 mt-1">Check off regular doses, setup smart alerts, and review ingestion patterns.</p>
          </div>
          
          <button
            id="btn-trigger-med-form"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Prescription
          </button>
        </div>

        {/* Add Med form overlay/grid */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
            >
              <form onSubmit={handleCreateMedication} className="space-y-4">
                <span className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">New Prescription Details</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Medication Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lisinopril"
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Dosage</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10mg (1 daily)"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
                    >
                      <option>Once daily</option>
                      <option>Twice daily</option>
                      <option>Three times daily</option>
                      <option>As needed (PRN)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Reminder Time</label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Starts Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Ends Date (Optional)</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-indigo-50/15 dark:bg-slate-950 p-3 rounded-xl border border-indigo-50/30 dark:border-slate-850">
                  <input
                    type="checkbox"
                    id="chk-sync-google-calendar"
                    checked={syncToCalendarOnCreate}
                    onChange={(e) => setSyncToCalendarOnCreate(e.target.checked)}
                    className="h-4 w-4 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 rounded cursor-pointer"
                  />
                  <label htmlFor="chk-sync-google-calendar" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5 selection:bg-transparent">
                    📅 Sync recurring daily reminders to Google Calendar automatically
                  </label>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-755 text-slate-650 dark:text-slate-300 rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="px-5 py-2 text-xs bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {adding && <Loader2 className="animate-spin w-3.5 h-3.5" />}
                    Confirm Medication
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current Meds card flow */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 text-center py-10 text-xs text-slate-400 font-mono">Querying files...</div>
          ) : meds.length === 0 ? (
            <div className="col-span-2 p-8 text-center border border-slate-150 dark:border-slate-850 bg-white dark:bg-slate-950 rounded-2xl">
              <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-405 font-mono">No active meds logged. Use the button to build lists.</p>
            </div>
          ) : (
            meds.map(med => {
              // Calculate if logged today
              const isTakenToday = logs.some(l => l.medicationId === med.id && l.date === todayStr);
              return (
                <div
                  id={`med-card-${med.id}`}
                  key={med.id}
                  className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded-2xl flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 rounded-lg">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{med.name}</h4>
                          <span className="text-xs text-slate-400 font-mono inline-block">{med.dosage}</span>
                        </div>
                      </div>

                      <button
                        id={`btn-delete-med-${med.id}`}
                        onClick={() => handleDeleteMed(med.id)}
                        className="p-1 text-slate-405 hover:text-rose-550 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-150/50 dark:border-slate-850 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 font-sans">
                        <Bell className="w-3.5 h-3.5 text-indigo-500 dark:text-emerald-400" />
                        <span className="font-medium">Frequency:</span> {med.frequency}
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Daily alert:</span> {med.reminderTime}
                      </div>
                    </div>
                  </div>

                  <button
                    id={`btn-take-med-${med.id}`}
                    disabled={isTakenToday}
                    onClick={() => handleTakeMedication(med.id)}
                    className={`w-full mt-4 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isTakenToday
                        ? 'bg-slate-100 dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                        : 'bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-xs'
                    }`}
                  >
                    {isTakenToday ? (
                      <>
                        <Check className="w-4 h-4" /> Taken Today
                      </>
                    ) : (
                      'Mark Administered Today'
                    )}
                  </button>

                  <button
                    id={`btn-sync-calendar-${med.id}`}
                    disabled={syncingMedIds[med.id]}
                    onClick={() => handleSyncToGoogleCalendar(med)}
                    className="w-full mt-2 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-slate-150 dark:border-slate-800 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer disabled:opacity-50 shrink-0 font-sans"
                  >
                    {syncingMedIds[med.id] ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Syncing event...
                      </>
                    ) : (
                      <>
                        📅 Link Google Calendar
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Compliance tracker history panel */}
      <div className="space-y-6">
        {/* Real-time Push Alert Switchboard Card */}
        <div id="push-notification-reminders-panel" className="p-5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-550 dark:text-emerald-450 animate-bounce" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Push Compliance Centers</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">
            Configure system alerts to prevent missed sessions. When the threshold time arrives, we'll ring your device and flash a warning ticker.
          </p>

          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-850 dark:text-slate-250">Desktop Alerts</span>
              <span className="text-[10px] text-slate-400 block font-mono">HTML5 Notifications API</span>
            </div>
            <button
              id="btn-request-notifications"
              onClick={requestNotificationPermission}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                notificationsAllowed
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-100'
                  : 'bg-indigo-600 text-white hover:bg-indigo-555'
              }`}
            >
              {notificationsAllowed ? 'ACTIVE' : 'ENABLE'}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 font-sans">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-850 dark:text-slate-250">Simulate Test Alarm</span>
              <span className="text-[10px] text-slate-400 block font-mono font-medium">Instant alarm testing</span>
            </div>
            <button
              id="btn-test-notification"
              onClick={handleTestNotification}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-850 text-white dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
            >
              <Play className="w-3 h-3 text-emerald-400" />
              FIRE ALARM
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ListTodo className="w-4 h-4 text-indigo-505" />
              Vitals Compliance Log
            </h3>
            <p className="text-xs text-slate-450 mt-1">Audit timeline of recently swallowed dosages.</p>
          </div>

          <div className="p-5 border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900/20 rounded-2xl max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center py-10 font-mono text-xs text-slate-400">
                No compliance recordings found in Postgres history.
              </div>
            ) : (
              <div className="relative border-l border-slate-150 dark:border-slate-855 pl-4 ml-2 space-y-4">
                {logs.map(log => {
                  const medRef = meds.find(m => m.id === log.medicationId);
                  return (
                    <div id={`log-item-${log.id}`} key={log.id} className="relative text-xs">
                      {/* Circle bulb */}
                      <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 bg-emerald-500 dark:bg-emerald-400 border-2 border-white dark:border-slate-950 rounded-full"></div>
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-855 dark:text-slate-200">
                            {medRef ? medRef.name : 'Unknown Medicine'}
                          </span>
                          <span className="font-mono text-[9px] text-slate-400 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-950 border rounded-sm">
                            {log.date}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Logged taken at: {new Date(log.takenAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating real-time toast compliance center */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {activeToasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="pointer-events-auto p-4 bg-slate-950 dark:bg-slate-900 border border-slate-850 dark:border-slate-800 text-white rounded-2xl shadow-2xl flex gap-3.5 items-start relative overflow-hidden"
            >
              {/* Highlight bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 to-rose-500" />
              
              <div className="p-2 bg-slate-900 dark:bg-slate-950 rounded-xl text-amber-400 animate-pulse shrink-0">
                <Bell className="w-4 h-4" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-105 font-sans uppercase tracking-wider">COMPLIANCE ALARM</h4>
                  <span className="text-[9px] font-mono text-slate-400 px-1.5 py-0.5 bg-slate-900 rounded-md">
                    {toast.time === 'Now' ? 'TEST' : toast.time}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white mt-1 leading-tight">{toast.name}</p>
                <p className="text-[11px] text-slate-405 font-mono">Dosage requirement: {toast.dosage}</p>
                
                <div className="flex items-center gap-2 pt-2.5">
                  {toast.medId !== -999 ? (
                    <button
                      onClick={() => {
                        handleTakeMedication(toast.medId);
                        setActiveToasts(prev => prev.filter(t => t.id !== toast.id));
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Mark as Taken
                    </button>
                  ) : (
                    <span className="text-[10px] italic text-emerald-400 font-mono">Simulated Alert</span>
                  )}
                  <button
                    onClick={() => setActiveToasts(prev => prev.filter(t => t.id !== toast.id))}
                    className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-350 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
};
export default MedicationTab;
