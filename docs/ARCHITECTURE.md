# MediSense AI System Architecture Documentation

Welcome to the **MediSense AI** architectural documentation. This project implements a fully secure, scalable, and modular full-stack clinical insights and personal health portal.

---

## Technical Stack Overview

- **Frontend Client (React & Tailwind CSS)**: Runs React with Vite, utilizing Tailwind CSS for beautiful responsive utility styling, `motion` for fluid tab and modal transitions, and `recharts` for interactive trend charting.
- **Backend Service (Express.js & Node.js)**: A lightweight REST API that proxies AI queries securely, verifies sessions, and streams/processes uploads.
- **Relational Storage (Cloud SQL - PostgreSQL)**: Active PostgreSQL database utilized for durable, high-integrity physical storage.
- **Object-Relational Mapper (Drizzle ORM)**: Type-safe database query and migration toolkit designed for sub-millisecond Postgres interactions.
- **AI Integration (Gemini v2.5 APIs)**: Custom wrappers for report analysis, trend summaries, and fitness scheduling utilizing `@google/genai` on the server-side to hide API keys from browsers.

---

## Architectural Modules

### 1. Database & Schema Design (`/src/db/`)
Managed via Drizzle ORM, mapping users securely by their Firebase Auth UIDs:
- `users`: Synchronized record holding registered users' emails and names.
- `health_metrics`: Timeseries vital records (weight, BP, Sleep, Blood Pulse, BMI, Hydration).
- `medical_reports`: Keeps parsed medical records and Gemini summaries.
- `medications` & `medication_logs`: Manages prescription inventories and chronological compliance (taking medicine).
- `fitness_goals` & `workout_logs`: Keeps custom goals and workout sessions.

### 2. Authorization Security (`/src/middleware/auth.ts`)
- Leverages **Firebase Security Token Verification**.
- On every protected request, the API checks for the authorization token header (`Authorization: Bearer <JWT>`).
- Decodes the token via `firebase-admin`, retrieves user ID details, constructs/upserts the Postgres record if this is their first visit, and appends the DB user object directly into Express request context.

### 3. Server Endpoints & API Controllers (`/src/server/routes.ts`)
Exposes highly structured, validated endpoints:
- `GET/POST /api/me`: Sync user information.
- `GET/POST /api/metrics`: Retrieve or catalog vital indices.
- `POST /api/metrics/evaluate`: Summarize recent trend lines with Gemini.
- `GET/POST/DELETE /api/reports`: List, upload, parse, and erase lab report summaries.
- `GET/POST/PATCH/DELETE /api/medications`: Coordinate prescription schedules.
- `POST /api/medications/log`: Log that medication was administrative today.
- `GET/POST /api/fitness/goals`: View or save step goals, water limits, etc.
- `GET/POST /api/fitness/workouts`: Log dynamic exercises (Run, Walk, Yoga).
- `POST /api/ai/chat`: Interactive medical query support.
- `POST /api/ai/wellness-plan`: Generate detailed Markdown outline fitness plans.

---

## Development Operations Setup

### Starting Development Server (Vite + Express in parallel)
```bash
npm run dev
```

### Production Bundling Flow
```bash
npm run build
```
This builds both:
1. Client-side static single-page resources compiled to `/dist/`.
2. Server-side code bundled tightly using `esbuild` to `/dist/server.cjs`.

### Initializing and Seeding Database
Database schema alterations are pushed automatically to Cloud SQL via standard migrations configured inside:
- `/src/db/drizzle.config.ts`
- `/src/db/schema.ts`
