export interface User {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  createdAt?: string;
}

export interface HealthMetric {
  id: number;
  userId: number;
  weight: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  sleepHours: number | null;
  waterIntakeMl: number | null;
  bmi: number | null;
  recordedAt: string; // YYYY-MM-DD
  createdAt?: string;
}

export interface MedicalReport {
  id: number;
  userId: number;
  fileName: string;
  fileType: string;
  content: string;
  analysis: string | null;
  uploadedAt: string;
}

export interface Medication {
  id: number;
  userId: number;
  name: string;
  dosage: string;
  frequency: string;
  reminderTime: string; // HH:MM
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  active: boolean;
  createdAt?: string;
}

export interface MedicationLog {
  id: number;
  medicationId: number;
  userId: number;
  takenAt: string;
  status: 'taken' | 'missed';
  date: string; // YYYY-MM-DD
}

export interface FitnessGoal {
  id: number;
  userId: number;
  stepsGoal: number;
  waterGoalMl: number;
  sleepGoalHours: number;
  weightGoal: number | null;
  active: boolean;
  createdAt?: string;
}

export interface WorkoutLog {
  id: number;
  userId: number;
  type: string;
  durationMinutes: number;
  caloriesBurned: number;
  steps: number;
  date: string; // YYYY-MM-DD
  createdAt?: string;
}

export interface MedicalAnnotation {
  id: string;
  reportId: number;
  selectedText: string;
  comment: string;
  type: 'note' | 'question';
  createdAt: string;
}
