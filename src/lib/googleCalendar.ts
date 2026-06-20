import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleAuthProvider } from './firebase.ts';

// Add the required Google Calendar scopes to our Google Auth provider
googleAuthProvider.addScope('https://www.googleapis.com/auth/calendar.events');

/**
 * Retrieve a valid Google OAuth access token.
 * Tries the silent platform session token endpoint first, falls back to an interactive popup.
 */
export async function getGoogleCalendarToken(): Promise<string> {
  // 1. Try silently fetching from the platform-provided session endpoint
  try {
    const res = await fetch('/api/session/google-token');
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        console.log('Successfully retrieved Google access token silently.');
        return data.access_token;
      }
    }
  } catch (error) {
    console.warn('Silent session token endpoint retrieval failed. Proceeding with Auth popup...');
  }

  // 2. Interactive popup fallback
  console.log('Initiating Google OAuth login flow for Google Calendar integrations...');
  const result = await signInWithPopup(auth, googleAuthProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Could not retrieve a Google Calendar Access Token from signature.');
  }
  return credential.accessToken;
}

interface MedicationEventItem {
  id?: number;
  name: string;
  dosage: string;
  frequency: string;
  reminderTime: string;
  startDate: string;
  endDate: string | null;
}

/**
 * Creates a recurring medication calendar event in the user's Google Calendar.
 */
export async function createMedicationEvent(med: MedicationEventItem): Promise<{ htmlLink: string }> {
  const token = await getGoogleCalendarToken();
  const reminderTime = med.reminderTime || '09:00';
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Construct start/end time local strings (YYYY-MM-DDTHH:MM:SS)
  const startISO = `${med.startDate}T${reminderTime}:00`;
  
  // Calculate 15 mins later
  const [h, m] = reminderTime.split(':').map(Number);
  const endMins = (h * 60 + m + 15) % 1440;
  const endH = Math.floor(endMins / 60);
  const endMin = endMins % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const endISO = `${med.startDate}T${pad(endH)}:${pad(endMin)}:00`;

  // Generate recurrence rule (RRULE)
  let recurrenceRule = 'RRULE:FREQ=DAILY';
  const freqCheck = med.frequency.toLowerCase();
  if (freqCheck.includes('weekly')) {
    recurrenceRule = 'RRULE:FREQ=WEEKLY';
  } else if (freqCheck.includes('monthly')) {
    recurrenceRule = 'RRULE:FREQ=MONTHLY';
  }

  if (med.endDate) {
    const untilStr = med.endDate.replace(/-/g, '') + 'T235959Z';
    recurrenceRule += `;UNTIL=${untilStr}`;
  }

  const eventPayload = {
    summary: `💊 Medication: ${med.name} (${med.dosage})`,
    description: `MediSense AI Automated Reminder\n\nTake dosage for: ${med.name}\nQuantity/Strength: ${med.dosage}\nFrequency schedule: ${med.frequency}\nReminder Mark: ${reminderTime}\n\nThis reminder event is synchronized with your clinician portal. Please record your compliance check in your MediSense AI App.`,
    start: {
      dateTime: startISO,
      timeZone: localTimeZone,
    },
    end: {
      dateTime: endISO,
      timeZone: localTimeZone,
    },
    recurrence: [recurrenceRule],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 10 },
        { method: 'email', minutes: 30 }
      ],
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Google Calendar event placement failed:', errText);
    throw new Error(`Google Calendar API Error: ${response.statusText} (${response.status})`);
  }

  const result = await response.json();
  return { htmlLink: result.htmlLink };
}
