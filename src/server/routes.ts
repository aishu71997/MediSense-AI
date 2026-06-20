import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { healthMetrics, medicalReports, medications, medicationLogs, fitnessGoals, workoutLogs, users } from '../db/schema.ts';
import { eq, and, desc, asc } from 'drizzle-orm';
import { 
  summarizeMedicalReport, 
  evaluateHealthMetrics, 
  createWellnessPlan, 
  converseWithAssistant,
  generateWeeklyClinicalSummary
} from '../lib/gemini.ts';

const router = Router();

// Apply requireAuth middleware to all endpoints in this router
router.use(requireAuth);

// Helper to double check correct user synchronization
const getDbUserId = (req: AuthRequest): number => {
  if (!req.dbUser?.id) {
    throw new Error('User context not synchronized in PostgreSQL.');
  }
  return req.dbUser.id;
};

// ==========================================
// 1. AUTHENTICATION & PROFILE PROFILE
// ==========================================
router.get('/me', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
    res.json(userRecord);
  } catch (error: any) {
    console.error('API /me error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve profile records' });
  }
});

// Update profile name
router.post('/me', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const { fullName } = req.body;
    
    const [updated] = await db.update(users)
      .set({ fullName: fullName || '' })
      .where(eq(users.id, userId))
      .returning();
      
    res.json(updated);
  } catch (error: any) {
    console.error('API POST /me error:', error);
    res.status(500).json({ error: 'Failed to update user profile details' });
  }
});

// ==========================================
// 2. HEALTH DASHBOARD METRICS
// ==========================================

// Get metric logs (all or paginated/ordered)
router.get('/metrics', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const results = await db.select()
      .from(healthMetrics)
      .where(eq(healthMetrics.userId, userId))
      .orderBy(desc(healthMetrics.recordedAt));
      
    res.json(results);
  } catch (error: any) {
    console.error('GET /metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch personal metrics log' });
  }
});

// Post/Add or Update a health metric for a day
router.post('/metrics', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const { 
      weight, 
      bloodPressureSystolic, 
      bloodPressureDiastolic, 
      heartRate, 
      sleepHours, 
      waterIntakeMl, 
      recordedAt 
    } = req.body;

    if (!recordedAt) {
      return res.status(400).json({ error: 'Missing mandatory date string (recordedAt) YYYY-MM-DD' });
    }

    // Weight and Height could help calculate BMI
    // Let's assume height is registered as 175cm by default or we can check.
    // If we have weight, let's calculate active BMI assuming height is 1.75 meters (average) 
    // or let the user supply it. If weight is provided:
    let bmiValue: number | null = null;
    if (weight) {
      // BMI = kg / m^2. Let's assume a default height of 1.75 meters
      bmiValue = Math.round((weight / (1.75 * 1.75)) * 10) / 10;
    }

    // Check if entry exists for this date already
    const existing = await db.select()
      .from(healthMetrics)
      .where(and(eq(healthMetrics.userId, userId), eq(healthMetrics.recordedAt, recordedAt)));

    let saved;
    if (existing.length > 0) {
      // Update
      const [updated] = await db.update(healthMetrics)
        .set({
          weight: weight !== undefined ? Number(weight) : undefined,
          bloodPressureSystolic: bloodPressureSystolic !== undefined ? Number(bloodPressureSystolic) : undefined,
          bloodPressureDiastolic: bloodPressureDiastolic !== undefined ? Number(bloodPressureDiastolic) : undefined,
          heartRate: heartRate !== undefined ? Number(heartRate) : undefined,
          sleepHours: sleepHours !== undefined ? Number(sleepHours) : undefined,
          waterIntakeMl: waterIntakeMl !== undefined ? Number(waterIntakeMl) : undefined,
          bmi: bmiValue || undefined,
        })
        .where(eq(healthMetrics.id, existing[0].id))
        .returning();
      saved = updated;
    } else {
      // Insert
      const [inserted] = await db.insert(healthMetrics)
        .values({
          userId,
          weight: weight ? Number(weight) : null,
          bloodPressureSystolic: bloodPressureSystolic ? Number(bloodPressureSystolic) : null,
          bloodPressureDiastolic: bloodPressureDiastolic ? Number(bloodPressureDiastolic) : null,
          heartRate: heartRate ? Number(heartRate) : null,
          sleepHours: sleepHours ? Number(sleepHours) : null,
          waterIntakeMl: waterIntakeMl ? Number(waterIntakeMl) : null,
          bmi: bmiValue,
          recordedAt,
        })
        .returning();
      saved = inserted;
    }

    res.json(saved);
  } catch (error: any) {
    console.error('POST /metrics error:', error);
    res.status(500).json({ error: 'Failed to save health metrics' });
  }
});

// Evaluate metrics with Gemini
router.post('/metrics/evaluate', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    
    // Grab the latest metrics log
    const logs = await db.select()
      .from(healthMetrics)
      .where(eq(healthMetrics.userId, userId))
      .orderBy(desc(healthMetrics.recordedAt))
      .limit(1);

    if (logs.length === 0) {
      return res.status(404).json({ error: 'Please record some health metrics on your dashboard before requesting an AI review!' });
    }

    const latest = logs[0];
    const analysis = await evaluateHealthMetrics(latest);
    res.json({ analysis });
  } catch (error: any) {
    console.error('POST /metrics/evaluate error:', error);
    res.status(500).json({ error: error.message || 'Failed to call metric helper' });
  }
});

// Generate clinical weekly summary trend to email to PCP
router.post('/metrics/weekly-summary', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);

    // Get the user record
    const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
    if (!userRecord) {
      return res.status(404).json({ error: 'User profile slot not configured.' });
    }

    // Get metrics over the last week (limit 7 is safest and most robust)
    const metrics = await db.select()
      .from(healthMetrics)
      .where(eq(healthMetrics.userId, userId))
      .orderBy(desc(healthMetrics.recordedAt))
      .limit(7);

    // Get active medications
    const meds = await db.select()
      .from(medications)
      .where(and(eq(medications.userId, userId), eq(medications.active, true)));

    // Get active goals
    const goalsList = await db.select()
      .from(fitnessGoals)
      .where(and(eq(fitnessGoals.userId, userId), eq(fitnessGoals.active, true)))
      .limit(1);
    const goals = goalsList[0] || null;

    // Get workout logs from the past week
    const workouts = await db.select()
      .from(workoutLogs)
      .where(eq(workoutLogs.userId, userId))
      .orderBy(desc(workoutLogs.date))
      .limit(7);

    // Generate weekly clinical summary
    const summary = await generateWeeklyClinicalSummary(userRecord, goals, metrics, workouts, meds);
    res.json({ summary });
  } catch (error: any) {
    console.error('POST /metrics/weekly-summary error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate weekly medical summary.' });
  }
});


// ==========================================
// 3. MEDICAL REPORTS CONTROLLER
// ==========================================

// Get uploaded reports
router.get('/reports', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const reports = await db.select()
      .from(medicalReports)
      .where(eq(medicalReports.userId, userId))
      .orderBy(desc(medicalReports.uploadedAt));
      
    res.json(reports);
  } catch (error: any) {
    console.error('GET /reports error:', error);
    res.status(500).json({ error: 'Could not fetch medical report logs' });
  }
});

// Upload and analyze a report
router.post('/reports', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const { fileName, fileType, wordString } = req.body;

    if (!fileName || !wordString) {
      return res.status(400).json({ error: 'Invalid payload: Need filename and text contents of document' });
    }

    // Call Gemini to summarize and analyze
    const analysis = await summarizeMedicalReport(fileName, wordString);

    // Save report block
    const [inserted] = await db.insert(medicalReports)
      .values({
        userId,
        fileName,
        fileType: fileType || 'text/plain',
        content: wordString,
        analysis,
      })
      .returning();

    res.json(inserted);
  } catch (error: any) {
    console.error('POST /reports error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload and analyze report' });
  }
});

// Delete a report
router.delete('/reports/:id', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const reportId = Number(req.params.id);

    const result = await db.delete(medicalReports)
      .where(and(eq(medicalReports.id, reportId), eq(medicalReports.userId, userId)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Target report not found or authorization denied.' });
    }

    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /reports error:', error);
    res.status(500).json({ error: 'Failed to erase medical report' });
  }
});


// ==========================================
// 4. MEDICATION TRACKER
// ==========================================

// Get medications
router.get('/medications', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const list = await db.select()
      .from(medications)
      .where(eq(medications.userId, userId))
      .orderBy(desc(medications.createdAt));
      
    res.json(list);
  } catch (error: any) {
    console.error('GET /medications error:', error);
    res.status(500).json({ error: 'Could not fetch medication lists' });
  }
});

// Add medication
router.post('/medications', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const { name, dosage, frequency, reminderTime, startDate, endDate } = req.body;

    if (!name || !dosage || !frequency || !startDate) {
      return res.status(400).json({ error: 'Name, dosage, frequency, and start date are mandatory' });
    }

    const [inserted] = await db.insert(medications)
      .values({
        userId,
        name,
        dosage,
        frequency,
        reminderTime: reminderTime || '09:00',
        startDate,
        endDate: endDate || null,
        active: true,
      })
      .returning();

    res.json(inserted);
  } catch (error: any) {
    console.error('POST /medications error:', error);
    res.status(500).json({ error: 'Failed to record medication details' });
  }
});

// Patch/Toggle Medication state (Active status)
router.patch('/medications/:id', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const medId = Number(req.params.id);
    const { active, name, dosage, frequency, reminderTime } = req.body;

    const [updated] = await db.update(medications)
      .set({
        active: active !== undefined ? Boolean(active) : undefined,
        name: name || undefined,
        dosage: dosage || undefined,
        frequency: frequency || undefined,
        reminderTime: reminderTime || undefined,
      })
      .where(and(eq(medications.id, medId), eq(medications.userId, userId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Medication not found or unauthorized' });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('PATCH /medications error:', error);
    res.status(500).json({ error: 'Failed to adjust medication parameters' });
  }
});

// Delete medication
router.delete('/medications/:id', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const medId = Number(req.params.id);

    const deleted = await db.delete(medications)
      .where(and(eq(medications.id, medId), eq(medications.userId, userId)))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Medication not found or unauthorized' });
    }

    res.json({ success: true, message: 'Medication removed successfully' });
  } catch (error: any) {
    console.error('DELETE /medications error:', error);
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});

// Get compliance logs
router.get('/medication-logs', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const logs = await db.select()
      .from(medicationLogs)
      .where(eq(medicationLogs.userId, userId))
      .orderBy(desc(medicationLogs.takenAt));
      
    res.json(logs);
  } catch (error: any) {
    console.error('GET /medication-logs error:', error);
    res.status(500).json({ error: 'Could not retrieve compliance logs' });
  }
});

// Log taking medication
router.post('/medication-logs', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const { medicationId, status, date } = req.body;

    if (!medicationId || !date) {
      return res.status(400).json({ error: 'Missing medication ID or log date' });
    }

    // Verify ownership of medication
    const ownerCheck = await db.select()
      .from(medications)
      .where(and(eq(medications.id, Number(medicationId)), eq(medications.userId, userId)));

    if (ownerCheck.length === 0) {
      return res.status(404).json({ error: 'The medication list specified is inaccessible or unauthorized' });
    }

    // Insert log
    const [inserted] = await db.insert(medicationLogs)
      .values({
        medicationId: Number(medicationId),
        userId,
        status: status || 'taken',
        date,
      })
      .returning();

    res.json(inserted);
  } catch (error: any) {
    console.error('POST /medication-logs error:', error);
    res.status(500).json({ error: 'Failed to log medication intake' });
  }
});


// ==========================================
// 5. FITNESS AND GOALS TRACKER
// ==========================================

// Get current goals or create default
router.get('/fitness/goals', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const list = await db.select()
      .from(fitnessGoals)
      .where(and(eq(fitnessGoals.userId, userId), eq(fitnessGoals.active, true)))
      .limit(1);

    if (list.length > 0) {
      return res.json(list[0]);
    }

    // Generate smart default goals
    const [inserted] = await db.insert(fitnessGoals)
      .values({
        userId,
        stepsGoal: 10000,
        waterGoalMl: 2000,
        sleepGoalHours: 8,
        active: true,
      })
      .returning();

    res.json(inserted);
  } catch (error: any) {
    console.error('GET /fitness/goals error:', error);
    res.status(500).json({ error: 'Could not fetch active wellness goals' });
  }
});

// Update or set new active fitness goals
router.post('/fitness/goals', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const { stepsGoal, waterGoalMl, sleepGoalHours, weightGoal } = req.body;

    // deactivate previous goals
    await db.update(fitnessGoals)
      .set({ active: false })
      .where(eq(fitnessGoals.userId, userId));

    const [inserted] = await db.insert(fitnessGoals)
      .values({
        userId,
        stepsGoal: stepsGoal ? Number(stepsGoal) : 10000,
        waterGoalMl: waterGoalMl ? Number(waterGoalMl) : 2000,
        sleepGoalHours: sleepGoalHours ? Number(sleepGoalHours) : 8.0,
        weightGoal: weightGoal ? Number(weightGoal) : null,
        active: true,
      })
      .returning();

    res.json(inserted);
  } catch (error: any) {
    console.error('POST /fitness/goals error:', error);
    res.status(500).json({ error: 'Failed to store fitness goals' });
  }
});

// Get workouts
router.get('/fitness/workouts', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const list = await db.select()
      .from(workoutLogs)
      .where(eq(workoutLogs.userId, userId))
      .orderBy(desc(workoutLogs.date));
      
    res.json(list);
  } catch (error: any) {
    console.error('GET /fitness/workouts error:', error);
    res.status(500).json({ error: 'Failed to pull workout logs' });
  }
});

// Log workout activity
router.post('/fitness/workouts', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);
    const { type, durationMinutes, caloriesBurned, steps, date } = req.body;

    if (!type || !durationMinutes || !date) {
      return res.status(400).json({ error: 'Activity type, duration, and date are required' });
    }

    const [inserted] = await db.insert(workoutLogs)
      .values({
        userId,
        type,
        durationMinutes: Number(durationMinutes),
        caloriesBurned: caloriesBurned ? Number(caloriesBurned) : 0,
        steps: steps ? Number(steps) : 0,
        date,
      })
      .returning();

    res.json(inserted);
  } catch (error: any) {
    console.error('POST /fitness/workouts error:', error);
    res.status(500).json({ error: 'Failed to catalog active athletic training log' });
  }
});


// ==========================================
// 6. AI INTERACTIVE ASSISTANT
// ==========================================

// Converse route
router.post('/ai/chat', async (req: AuthRequest, res) => {
  try {
    const { history, prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing dialog message text' });
    }

    const assistantAnswer = await converseWithAssistant(history || [], prompt);
    res.json({ text: assistantAnswer });
  } catch (error: any) {
    console.error('POST /ai/chat error:', error);
    res.status(500).json({ error: error.message || 'The health assistant encountered an error' });
  }
});

// Generate dynamic educational schedule/wellness plan
router.post('/ai/wellness-plan', async (req: AuthRequest, res) => {
  try {
    const userId = getDbUserId(req);

    // Fetch user goals
    const goalsList = await db.select()
      .from(fitnessGoals)
      .where(and(eq(fitnessGoals.userId, userId), eq(fitnessGoals.active, true)))
      .limit(1);
    
    // Fetch latest health metrics
    const metricsList = await db.select()
      .from(healthMetrics)
      .where(eq(healthMetrics.userId, userId))
      .orderBy(desc(healthMetrics.recordedAt))
      .limit(1);

    const activeGoals = goalsList.length > 0 ? goalsList[0] : null;
    const latestMetrics = metricsList.length > 0 ? metricsList[0] : null;

    const wellnessPlanMarkdown = await createWellnessPlan(activeGoals, latestMetrics);
    res.json({ wellnessPlanMarkdown });
  } catch (error: any) {
    console.error('POST /ai/wellness-plan error:', error);
    res.status(500).json({ error: error.message || 'Failed to design wellness scheduler' });
  }
});

export default router;
