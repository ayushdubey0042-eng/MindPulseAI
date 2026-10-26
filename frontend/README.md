# MindPulse AI Wellbeing Coach

A demo, non-clinical wellbeing coaching app for individual users. It offers:

- **Onboarding** — one-time welcome with a non-clinical disclaimer, an
  organisation-vs-independent choice, and a privacy consent checkbox.
- **Chat** — a conversation with an AI coach, including a typing indicator,
  in-flight lock, error handling, and a calm "supportive" card when the backend
  flags risk. A persistent footer reminds users this is not a clinical service.
- **Check-in** — an optional 10-question wellbeing check-in, taken one question
  at a time with a 1–5 scale, a progress bar, Back/Next, and a result screen
  with score, band, and a gentle explanation. "Talk about this in chat" jumps
  back to Chat.
- **Trends** — a self-contained SVG line chart of past check-in scores plus a
  list of past check-ins, with a friendly empty state.

The backend is a FastAPI server (expected at `http://localhost:8000`). A mock
layer lets the app run fully without the backend.

> MindPulse is a **non-clinical** wellbeing coach. It does not diagnose, treat,
> or replace professional care.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed Vite URL (usually `http://localhost:5173`).

## Configuration (mock vs real backend)

All settings live in a `.env` file at the project root.

| Variable | Example | Description |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the FastAPI backend. |
| `VITE_USE_MOCK` | `true` or `false` | When `true`, the app uses the built-in mock layer and never calls the backend. Set to `false` to talk to a real FastAPI server. |

### Mock mode (default)

`.env`:

```
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=true
```

In mock mode the app serves canned data from `src/api.js`. To demo the risk
guardrail, send a chat message that contains the word **"hopeless"** — the
coach will reply inside a calm support card with a referral message.

### Real backend

```
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false
```

The app expects these endpoints (the mock layer matches these shapes):

- `POST /chat` — body `{ session_id, message }`, returns
  `{ reply, risk_flag, risk_level }`.
- `GET /assessment/questions` — returns `{ questions: [{ id, text }] }`.
- `POST /assessment` — body
  `{ session_id, answers: [{ id, value }] }`, returns
  `{ score, band, explanation }`.
- `GET /trends?session_id=...` — returns `{ trends: [{ date, score }] }`.

Restart `npm run dev` after changing `.env`.

## Project structure

```
src/
  App.jsx              Top-level nav + onboarding/state
  api.js               API layer (mock + real backend switch)
  pages/
    Onboarding.jsx
    Chat.jsx
    Checkin.jsx
    Trends.jsx
  components/
    NonClinicalFooter.jsx
    WellbeingChart.jsx     Dependency-free SVG line chart
```

Built with Vite + React and Tailwind CSS. The trends chart is a lightweight
SVG component (no external chart library).
