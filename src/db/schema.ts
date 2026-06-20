import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, doublePrecision } from 'drizzle-orm/pg-core';

// 1. Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  fullName: text('full_name').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relationships for users
export const usersRelations = relations(users, ({ many }) => ({
  healthMetrics: many(healthMetrics),
  medicalReports: many(medicalReports),
  medications: many(medications),
  medicationLogs: many(medicationLogs),
  fitnessGoals: many(fitnessGoals),
  workoutLogs: many(workoutLogs),
}));

// 2. Health Metrics table
export const healthMetrics = pgTable('health_metrics', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  weight: doublePrecision('weight'), // in kg
  bloodPressureSystolic: integer('blood_pressure_systolic'),
  bloodPressureDiastolic: integer('blood_pressure_diastolic'),
  heartRate: integer('heart_rate'),
  sleepHours: doublePrecision('sleep_hours'),
  waterIntakeMl: integer('water_intake_ml'),
  bmi: doublePrecision('bmi'),
  recordedAt: text('recorded_at').notNull(), // Expected format: YYYY-MM-DD (unique per day or multi per day)
  createdAt: timestamp('created_at').defaultNow(),
});

export const healthMetricsRelations = relations(healthMetrics, ({ one }) => ({
  user: one(users, {
    fields: [healthMetrics.userId],
    references: [users.id],
  }),
}));

// 3. Medical Reports table
export const medicalReports = pgTable('medical_reports', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').default('text/plain'),
  content: text('content').notNull(), // Raw text parsed from file
  analysis: text('analysis'), // Gemini AI summary
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});

export const medicalReportsRelations = relations(medicalReports, ({ one }) => ({
  user: one(users, {
    fields: [medicalReports.userId],
    references: [users.id],
  }),
}));

// 4. Medications table
export const medications = pgTable('medications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  dosage: text('dosage').notNull(), // e.g., "500mg" or "1 tablet"
  frequency: text('frequency').notNull(), // e.g., "Once daily", "Twice daily"
  reminderTime: text('reminder_time').default('09:00'), // "HH:MM"
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date'), // YYYY-MM-DD or null for continuous
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const medicationsRelations = relations(medications, ({ one, many }) => ({
  user: one(users, {
    fields: [medications.userId],
    references: [users.id],
  }),
  logs: many(medicationLogs),
}));

// 5. Medication Logs table (history of taking medicine)
export const medicationLogs = pgTable('medication_logs', {
  id: serial('id').primaryKey(),
  medicationId: integer('medication_id')
    .references(() => medications.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  takenAt: timestamp('taken_at').defaultNow(),
  status: text('status').default('taken'), // 'taken' or 'missed'
  date: text('date').notNull(), // YYYY-MM-DD
});

export const medicationLogsRelations = relations(medicationLogs, ({ one }) => ({
  medication: one(medications, {
    fields: [medicationLogs.medicationId],
    references: [medications.id],
  }),
  user: one(users, {
    fields: [medicationLogs.userId],
    references: [users.id],
  }),
}));

// 6. Fitness Goals table
export const fitnessGoals = pgTable('fitness_goals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  stepsGoal: integer('steps_goal').default(10000),
  waterGoalMl: integer('water_goal_ml').default(2000),
  sleepGoalHours: doublePrecision('sleep_goal_hours').default(8),
  weightGoal: doublePrecision('weight_goal'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const fitnessGoalsRelations = relations(fitnessGoals, ({ one }) => ({
  user: one(users, {
    fields: [fitnessGoals.userId],
    references: [users.id],
  }),
}));

// 7. Workout Logs table
export const workoutLogs = pgTable('workout_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // "Running", "Walking", "Cycling", "Strength", etc.
  durationMinutes: integer('duration_minutes').notNull(),
  caloriesBurned: integer('calories_burned').default(0),
  steps: integer('steps').default(0),
  date: text('date').notNull(), // YYYY-MM-DD
  createdAt: timestamp('created_at').defaultNow(),
});

export const workoutLogsRelations = relations(workoutLogs, ({ one }) => ({
  user: one(users, {
    fields: [workoutLogs.userId],
    references: [users.id],
  }),
}));
