// MindPulse API layer.
// Talks to a FastAPI backend when VITE_USE_MOCK !== 'true'.
// Falls back to in-memory mock data otherwise.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ---------- helpers ----------
async function postJson(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function getJson(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

// ---------- mock data ----------
const MOCK_QUESTIONS = [
  { id: 1, text: 'I have felt calm and settled over the last two weeks.' },
  { id: 2, text: 'I have felt able to cope with day-to-day pressures.' },
  { id: 3, text: 'I have slept well and felt rested.' },
  { id: 4, text: 'I have had energy for the things that matter to me.' },
  { id: 5, text: 'I have felt connected to people around me.' },
  { id: 6, text: 'I have been able to focus on what I am doing.' },
  { id: 7, text: 'I have felt optimistic about the near future.' },
  { id: 8, text: 'I have found time for things I enjoy.' },
  { id: 9, text: 'I have felt useful and valued.' },
  { id: 10, text: 'I have felt able to reach out when I needed support.' },
];

const mockTrends = (sessionId) => [
  { date: '2026-10-05', score: 32 },
  { date: '2026-10-12', score: 38 },
  { date: '2026-10-19', score: 41 },
];

function mockChatReply(message) {
  const lower = message.toLowerCase();
  if (lower.includes('hopeless')) {
    return {
      reply:
        "I hear how heavy things feel right now, and I want you to know you are not alone in this. Because what you're describing sounds really significant, I'd gently encourage you to reach out to a trusted professional or a local support line — they can support you in ways I am not able to. You deserve real, human support through this.",
      risk_flag: true,
      risk_level: 'high',
    };
  }
  return {
    reply:
      "Thanks for sharing that with me. It sounds like there's a lot going on. Can you tell me a little more about what's been on your mind lately, and whether there's a specific moment or feeling you'd like to explore together?",
    risk_flag: false,
    risk_level: 'none',
  };
}

function mockAssessment(answers) {
  const total = answers.reduce((sum, a) => sum + a.value, 0);
  const max = answers.length * 5;
  const pct = Math.round((total / max) * 100);
  let band = 'Moderate';
  let explanation =
    "You are managing in some areas and finding others more challenging, which is completely normal. Small, consistent changes — a steady routine, a moment of calm each day, and reaching out to people you trust — can make a real difference over time.";
  if (pct >= 75) {
    band = 'Good';
    explanation =
      "Your answers suggest things are going quite well overall right now. The habits and connections that are working for you are worth noticing and protecting as life shifts.";
  } else if (pct < 40) {
    band = 'Low';
    explanation =
      "Your answers suggest the last couple of weeks have felt quite difficult. This is a signal to be gentle with yourself, and to consider leaning on trusted people or a professional — you do not have to work through this alone.";
  }
  return { score: pct, band, explanation };
}

// ---------- public API ----------
export async function sendChatMessage(sessionId, message) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 700));
    return mockChatReply(message);
  }
  return postJson('/chat', { session_id: sessionId, message });
}

export async function getAssessmentQuestions() {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return { questions: MOCK_QUESTIONS };
  }
  return getJson('/assessment/questions');
}

export async function submitAssessment(sessionId, answers) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600));
    return mockAssessment(answers);
  }
  return postJson('/assessment', { session_id: sessionId, answers });
}

export async function getTrends(sessionId) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return { trends: mockTrends(sessionId) };
  }
  return getJson(`/trends?session_id=${encodeURIComponent(sessionId)}`);
}
