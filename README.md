# MediSense AI 🩺✨

**MediSense AI** is a professional-grade, full-stack predictive wellness and health-tracking workspace designed to bridge the gap between patient telemetry and clinical insights. It enables users to monitor real-time physiological vitals, translate complex diagnostic lab PDFs, compile clinical trend reports, track medication schedules, and synchronize wearable tracker telemetry.

---

## Technical Architecture

- **Frontend Client**: React 19, TypeScript, Tailwind CSS, Lucide icons, motion animations.
- **Backend Service**: Express.js REST API with integrated Vite middleware.
- **Relational Storage**: PostgreSQL on Cloud SQL configured with connection pooling.
- **Object-Relational Mapper**: Drizzle ORM.
- **Authentication**: Firebase Admin SDK token session check.
- **AI Co-processor**: Google Gemini (`gemini-3.5-flash`) SDK client.

---

## Key Core Features

### 1. Daily Wellness Dashboard & Metric Visualizers
- **SVG progress Rings**: Visual metrics tracking overall daily goals, water intake progress (2L target), steps progress (10k milestone), and sleep duration indicators.
- **Animated Vitals Cards**: Modern cards displaying milestone weight, blood pressure, heart rate, sleep quality, and BMI indicators. Powered by smooth **Framer Motion spring physics transitions** and layout stagger animations.
- **Timeseries Trends (Recharts)**: Interactive, beautifully customized line and area charts plotting multi-metric timeseries indices for clinical evaluation.

### 2. Clinical Email Weekly Summary (Gemini-Powered)
- **Direct Physician Integration**: Synthesizes the last 7 days of raw blood pressure, pulse, hydration, and training logs into a structured medical-grade draft.
- **Smart Formatting**: Written from the patient's perspective, starting with professional clinical indicators and ending with 2-3 tailored consultation questions.
- **Actionable Copying**: Single-click clipboard copying or direct browser `mailto:` redirection for pasting into patient portals or sending emails.

### 3. Wearable BLE SDK Synchronizer (Simulation Gateway)
- **Multi-Brand Simulation**: Seamless connection stream for Apple Health (❤️), Garmin (🧭), Fitbit (💠), and Whoop (⚡).
- **Interactive Sync Stream**: Live console progress bars simulating Bluetooth secure handshakes, telemetry decryption, and sensor calibration.
- **Database Injection**: Real-time mock telemetry payload confirmation and submission to back-end PostgreSQL tables.

### 4. Interactive Lab Report Parser & Annotator
- **AI Diagnostic Translation**: Converts clinical medical-term jargon from uploaded lab records into layperson summaries.
- **Annotations and Highlights**: Highlight and select text segments directly from original lab copies or AI summaries to pin questions or custom notes for your next physician encounter.

### 5. Medication and Prescription Scheduler
- **Daily Compliance Audits**: Complete list of active medication times and dosage thresholds with tick checklist logging.

---

## Folder Map

```
├── /docs/
│   └── ARCHITECTURE.md          # In-depth controller and schema definitions
├── /src/
│   ├── /components/             # Modals, charts, vitals visualizers, custom tabs
│   │   ├── DashboardTab.tsx     # Progress Rings, Metric Cards, Physician Mail drafts
│   │   ├── FitnessTab.tsx       # Training logs and Wearable BLE Simulator
│   │   ├── ReportsTab.tsx       # Text selections, interactive highlights, and lab copiers
│   │   └── MetricCard.tsx       # Fluid spring layout-animate vitals cards
│   ├── /context/                # Security session token managers
│   ├── /db/                     # Drizzle schemas and pool clients
│   ├── /lib/                    # Gemini API callers and Firebase init
│   ├── /middleware/             # Auth token checking processes
│   ├── App.tsx                  # Tab index, global frames, and user entryways
│   ├── index.css
│   └── main.tsx
├── tsconfig.json
├── vite.config.ts
├── server.ts                    # Customized Express/Vite Dev server
└── package.json
```

---

## Quick Onboarding

To initiate the workspace dev server:
```bash
npm run dev
```

To bundle production assets:
```bash
npm run build
```

To start up the bundled process:
```bash
npm run start
```
