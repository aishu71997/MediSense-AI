import { GoogleGenAI } from '@google/genai';

// Initialize the Google GenAI SDK. 
// Uses process.env.GEMINI_API_KEY on the server.
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured in environment variables.");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

// Default recommended model for text-heavy summarization and conversations
const MODEL_NAME = 'gemini-2.5-flash';

const HEALTH_DISCLAIMER = `\n\n*Disclaimer: MediSense AI is an artificial intelligence wellness helper. The summaries, plans, or guidelines provided above are purely for educational and motivational purposes. They do not constitute official clinical medical advice, diagnostics, or treatments. Please consult a qualified clinical physician or healthcare expert before acting on these suggestions or starting any fitness regimen.*`;

/**
 * Summarizes and translates complex terminology inside medical reports simply.
 */
export async function summarizeMedicalReport(fileName: string, content: string): Promise<string> {
  const ai = getAIClient();
  const prompt = `
You are MediSense AI, an empathetic, highly knowledgeable, supportive medical report compiler and wellness assistant. 
Review the text content extracted from the medical report file titled "${fileName}".

Extracted Document Content:
-------------------
${content}
-------------------

Tasks:
1. Provide a concise description of the document (what kind of test or report is it).
2. Synthesize and highlight key parameters or values. Clearly flag any values that appear atypical, high, or low, translating technical jargon (such as MCV, LDL, Creatinine, etc.) into understandable, layperson explanations.
3. Highlight constructive, non-alarmist health suggestions (e.g., diet shifts, standard follow-ups, lifestyle tracking).
4. Strictly frame the output in clean, professional markdown with elegant bold sections.

Adhere to our strict safety rule: Keep the tone highly supportive and reassuring, never catastrophic. Wrap up with a warm advisory to seek clinical counsel.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [prompt],
    });
    return (response.text || "Failed to analyze report.") + HEALTH_DISCLAIMER;
  } catch (error) {
    console.error("Gemini API error during report analysis:", error);
    throw new Error("MediSense AI was unable to complete the analysis because of a downstream AI model query error.", { cause: error });
  }
}

/**
 * Evaluates blood pressure, weight indices, water levels, sleep etc and writes gentle feedback.
 */
export async function evaluateHealthMetrics(metrics: any): Promise<string> {
  const ai = getAIClient();
  const prompt = `
You are MediSense AI. Analyze the following patient wellness metric profile and generate a supportive summary, simple metric definitions, and physical tips:

Metrics:
- Weight: ${metrics.weight ? `${metrics.weight} kg` : 'Not recorded'}
- Blood Pressure: ${metrics.bloodPressureSystolic && metrics.bloodPressureDiastolic ? `${metrics.bloodPressureSystolic}/${metrics.bloodPressureDiastolic} mmHg` : 'Not recorded'}
- Heart Rate: ${metrics.heartRate ? `${metrics.heartRate} bpm` : 'Not recorded'}
- Sleep: ${metrics.sleepHours ? `${metrics.sleepHours} hours` : 'Not recorded'}
- Water Intake: ${metrics.waterIntakeMl ? `${metrics.waterIntakeMl} ml` : 'Not recorded'}
- BMI: ${metrics.bmi ? `${metrics.bmi}` : 'Not calculated'}

Write a 3-paragraph diagnostic summary:
1. Acknowledge their active tracking and review which areas are aligned with standard targets (e.g., hydration levels, resting pulse, sleep cycles).
2. Explain what blood pressure and BMI denote in a friendly, conversational manner. Include brief targets (e.g. ideal systolic under 120, diastolic under 80).
3. Offer 2 concrete, positive nutritional or active tips based on their data.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [prompt],
    });
    return (response.text || "Failed to analyze metrics.") + HEALTH_DISCLAIMER;
  } catch (error) {
    console.error("Gemini API error during metric assessment:", error);
    throw new Error("Unable to fetch automated health metrics evaluation from Gemini AI.", { cause: error });
  }
}

/**
 * Design a markdown Wellness and Fitness guideline schedule.
 */
export async function createWellnessPlan(goals: any, metrics: any): Promise<string> {
  const ai = getAIClient();
  const prompt = `
You are MediSense AI. Construct a customized, professional, educational Weekly Wellness & Fitness Plan based on the user's active goals and stats.

Goals Profile:
- Target daily steps: ${goals?.stepsGoal || 10000} steps
- Hydration goal: ${goals?.waterGoalMl || 2000} ml
- Sleep target: ${goals?.sleepGoalHours || 8} hours
- Weight milestone: ${goals?.weightGoal ? `${goals?.weightGoal} kg` : 'Maintain current'}

Provide:
1. A structured weekly workout/aerobic routine (Warmups, low-to-moderate exercises like walking, swimming, light strength).
2. A customized hydration strategy (how to segment water throughout the day).
3. Active behavioral tips to ensure quality sleep (wind-down routines, environment setup).
4. Short motivational encouragement.

Use highly polished typography and spacing.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [prompt],
    });
    return (response.text || "Failed to compile wellness plan.") + HEALTH_DISCLAIMER;
  } catch (error) {
    console.error("Gemini API error during wellness compilation:", error);
    throw new Error("Downstream AI model was unable to generate a wellness guide.", { cause: error });
  }
}

/**
 * Handles conversational inquiries.
 */
export async function converseWithAssistant(chatHistory: { role: string, text: string }[], newPrompt: string): Promise<string> {
  const ai = getAIClient();
  
  // Convert custom chatHistory format to Gemini SDK standard structure
  const formattedContents = chatHistory.map(entry => ({
    role: entry.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: entry.text }]
  }));
  
  // Append new user prompt
  formattedContents.push({
    role: 'user',
    parts: [{ text: `You are MediSense AI, an empathetic, highly knowledgeable medical report parsing and health coaching assistant. Please respond to the user's query about wellness, vitals, nutrition, or active training. Always deliver friendly, factual, safe, and motivating information. Always mention relevant medical guidance without scaring or diagnosing the user directly. Call out clinical advisory if user inquires about severe clinical queries.\n\nQuery: ${newPrompt}` }]
  });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: formattedContents,
    });
    return (response.text || "MediSense AI is currently unable to comment.") + HEALTH_DISCLAIMER;
  } catch (error) {
    console.error("Gemini API conversational error:", error);
    throw new Error("Assistant response dropped due to a connection disruption under Gemini services.", { cause: error });
  }
}

/**
 * Generates a clinical weekly summary intended to be sent via email to patient's Primary Care Physician.
 */
export async function generateWeeklyClinicalSummary(
  user: any,
  goals: any,
  metrics: any[],
  workouts: any[],
  meds: any[]
): Promise<string> {
  const ai = getAIClient();
  const prompt = `
You are MediSense AI. Generate a professional, highly structured Clinical Wellness Weekly Summary intended for a user to share with their Primary Care Physician (PCP).
Analyze the following patient health telemetry from the last 7 days:

PATIENT INFORMATION:
- Name: ${user.fullName || 'Not provided'}
- Email: ${user.email || 'Not provided'}

WEEKLY TELEMETRY (Last 7 Days):
${metrics.length > 0 ? metrics.map(m => `- Date: ${m.recordedAt}, Weight: ${m.weight ? `${m.weight} kg` : 'N/A'}, Blood Pressure: ${m.bloodPressureSystolic && m.bloodPressureDiastolic ? `${m.bloodPressureSystolic}/${m.bloodPressureDiastolic} mmHg` : 'N/A'}, Heart Rate: ${m.heartRate ? `${m.heartRate} bpm` : 'N/A'}, Sleep: ${m.sleepHours ? `${m.sleepHours} hrs` : 'N/A'}, Water: ${m.waterIntakeMl ? `${m.waterIntakeMl} ml` : 'N/A'}, BMI: ${m.bmi || 'N/A'}`).join('\n') : '- No metrics recorded.'}

WEEKLY WORKOUT ACTIVITY:
${workouts.length > 0 ? workouts.map(w => `- Date: ${w.date}, Type: ${w.type}, Duration: ${w.durationMinutes} mins, Calories: ${w.caloriesBurned} kcal, Steps: ${w.steps || 0}`).join('\n') : '- No workout logs recorded.'}

CURRENT ACTIVE MEDICATIONS:
${meds.length > 0 ? meds.map(m => `- ${m.name} (${m.dosage}) - Frequency: ${m.frequency}`).join('\n') : '- No active medications listed.'}

PATIENT WELLNESS GOALS:
- Steps: ${goals?.stepsGoal || 10000} steps/day
- Water: ${goals?.waterGoalMl || 2000} ml/day
- Sleep: ${goals?.sleepGoalHours || 8} hrs/day
- Target Weight: ${goals?.weightGoal ? `${goals?.weightGoal} kg` : 'N/A'}

Tasks:
1. Synthesize a professional weekly trend diagnostic summary for the PCP (trends in Blood Pressure, resting Heart Rate, active metabolic output/steps, body weight stability, average water/hydration compliance, and sleep quality).
2. Bullet point the average values computed over the week (Average Blood Pressure, Average Sleep hours, Average daily Water intake, Total workout minutes, and Total steps).
3. Call out any notable deviations, positive compliance, or alerts (e.g. consistently elevated systolic or diastolic blood pressure, or excellent compliance with physical steps and hydration goals).
4. Outline 2-3 specific questions or clinical topics the patient can discuss with their PCP based on these weekly trends.
5. Provide a pristine, highly readable text-based template formatted as a formal email ready to copy and send to a doctor. Write it from the patient's perspective, starting with: "Dear Dr. [Physician's Last Name],"

Keep the tone objective, clinical, professional, and helpful. Maintain high typography quality and use clean section dividers. Keep the summary focused and clear!
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [prompt],
    });
    return (response.text || "Failed to compile weekly trends summary.") + HEALTH_DISCLAIMER;
  } catch (error) {
    console.error("Gemini API error during clinical weekly summary generation:", error);
    throw new Error("Unable to construct the clinical weekly summary because of a downstream AI model query error.", { cause: error });
  }
}

