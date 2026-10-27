// MindPulse API layer.
// Talks to a FastAPI backend when VITE_USE_MOCK !== 'true'.
// Falls back to in-memory mock data otherwise.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const REAL_CHAT = import.meta.env.VITE_REAL_CHAT === 'true';

const STORAGE_KEYS = {
  userId: 'mindpulse_user_id',
  sessionId: 'mindpulse_session_id',
};

function readStoredValue(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures silently.
  }
}

function getStoredUserId() {
  return readStoredValue(STORAGE_KEYS.userId, '');
}

function storeUserId(userId) {
  if (!userId) return;
  writeStoredValue(STORAGE_KEYS.userId, userId);
}

function storeSessionId(sessionId) {
  if (!sessionId) return;
  writeStoredValue(STORAGE_KEYS.sessionId, sessionId);
}

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

const K10_OPTIONS = [
  { value: 1, label: 'None of the time' },
  { value: 2, label: 'A little of the time' },
  { value: 3, label: 'Some of the time' },
  { value: 4, label: 'Most of the time' },
  { value: 5, label: 'All of the time' },
];

const MOCK_QUESTIONS = [
  { id: 1, text: 'About how often did you feel tired out for no good reason?' },
  { id: 2, text: 'About how often did you feel nervous?' },
  { id: 3, text: 'About how often did you feel so nervous that nothing could calm you down?' },
  { id: 4, text: 'About how often did you feel hopeless?' },
  { id: 5, text: 'About how often did you feel restless or fidgety?' },
  { id: 6, text: 'About how often did you feel so restless you could not sit still?' },
  { id: 7, text: 'About how often did you feel depressed?' },
  { id: 8, text: 'About how often did you feel that everything was an effort?' },
  { id: 9, text: 'About how often did you feel so sad that nothing could cheer you up?' },
  { id: 10, text: 'About how often did you feel worthless?' },
];

const mockTrends = () => [
  { date: '2026-10-05', created_at: '2026-10-05T09:00:00', score: 18, band: 'moderate' },
  { date: '2026-10-12', created_at: '2026-10-12T09:00:00', score: 25, band: 'high' },
  { date: '2026-10-19', created_at: '2026-10-19T09:00:00', score: 31, band: 'very_high' },
];

function mockChatReply(message) {
  const lower = message.toLowerCase();
  if (lower.includes('i want to die') || lower.includes('not safe') || lower.includes('kill')) {
    return {
      user_id: getStoredUserId(),
      session_id: readStoredValue(STORAGE_KEYS.sessionId, ''),
      reply: 'Please contact emergency services or a crisis line now. This coach cannot provide crisis support.',
      risk_flag: true,
      risk_level: 'high',
      session_locked: true,
      support_options: [],
    };
  }
  return {
    user_id: getStoredUserId(),
    session_id: readStoredValue(STORAGE_KEYS.sessionId, ''),
    reply:
      "Thanks for sharing that with me. What feels most important to explore right now, and what would help you feel a bit more supported?",
    risk_flag: false,
    risk_level: 'none',
    session_locked: false,
    support_options: [],
  };
}

function mockAssessment(answers) {
  const total = answers.reduce((sum, item) => sum + Number(item.value || 0), 0);
  let band = 'low';
  let explanation =
    'Your responses suggest you are currently experiencing relatively low levels of distress. That is a good moment to notice what is working for you and keep building on it.';
  if (total >= 30) {
    band = 'very_high';
    explanation =
      'Your responses suggest you may be experiencing a high level of distress. While I can help you reflect on your wellbeing and identify possible next steps, I am not a clinician and cannot provide mental health advice or treatment. It is highly recommended that you contact a GP, psychologist, Employee Assistance Program, or another qualified professional for support.';
  } else if (total >= 22) {
    band = 'high';
    explanation =
      'Your responses suggest elevated distress that may be affecting your energy, focus or day-to-day life. It can help to talk with someone who can support you, such as a GP, a psychologist, or your Employee Assistance Program (EAP), and Support Connect in MindPulse can help you find options.';
  } else if (total >= 16) {
    band = 'moderate';
    explanation =
      'Your responses suggest some signs of strain that may be starting to affect your wellbeing. Reflecting on what is contributing, and building in some recovery time, can help before things escalate.';
  }

  const features = {
    low: ['Daily check-ins', 'Wellness Centre activities', 'Mood Calendar tracking and trend monitoring'],
    moderate: ['Daily mood capture', 'Mood Calendar and pattern identification', 'Wellness Centre activities', 'Support Connect resources'],
    high: ['Mood tracking', 'Wellness Centre resources', 'Support Connect'],
    very_high: ['Support Connect', 'Emergency support information'],
  };

  return {
    user_id: getStoredUserId(),
    session_id: readStoredValue(STORAGE_KEYS.sessionId, ''),
    score: total,
    max_score: 50,
    band,
    band_label: {
      low: 'Low (likely well)',
      moderate: 'Moderate distress',
      high: 'High distress',
      very_high: 'Very high distress',
    }[band],
    explanation,
    recommended_features: features[band],
    support_options: [],
    suggested_questions: [
      'What habits or routines are currently supporting your wellbeing?',
      'What helps you stay mentally and emotionally balanced when life becomes busy?',
      'What would you like to do more of to maintain your wellbeing?',
      'What early signs tell you that stress may be starting to build?',
    ],
    chat_seed: 'I just completed the check-in and would like to talk about it.',
  };
}

export async function createSession(affiliation) {
  if (USE_MOCK && !REAL_CHAT) {
    const sessionId = crypto.randomUUID();
    storeSessionId(sessionId);
    return sessionId;
  }
  const storedUserId = getStoredUserId();
  const data = await postJson('/session', {
    user_id: storedUserId || undefined,
    affiliation: affiliation || '',
  });
  if (data.user_id) storeUserId(data.user_id);
  if (data.session_id) storeSessionId(data.session_id);
  return data.session_id || '';
}

export async function sendChatMessage(sessionId, message) {
  if (USE_MOCK && !REAL_CHAT) {
    await new Promise((r) => setTimeout(r, 700));
    const response = mockChatReply(message);
    const finalSessionId = response.session_id || sessionId || readStoredValue(STORAGE_KEYS.sessionId, '');
    if (finalSessionId) storeSessionId(finalSessionId);
    return response;
  }
  const data = await postJson('/chat', { session_id: sessionId || undefined, message });
  if (data.user_id) storeUserId(data.user_id);
  if (data.session_id) storeSessionId(data.session_id);
  return data;
}

export async function getChatHistory(sessionId) {
  if ((USE_MOCK && !REAL_CHAT) || !sessionId) return [];
  const data = await getJson(`/chat/history?session_id=${encodeURIComponent(sessionId)}`);
  return data.messages || [];
}

export async function getAssessmentQuestions() {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      instruction: 'In the past 4 weeks:',
      options: K10_OPTIONS,
      questions: MOCK_QUESTIONS,
    };
  }
  const data = await getJson('/assessment/questions');
  return data;
}

export async function submitAssessment(sessionId, answers) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600));
    const response = mockAssessment(answers);
    if (response.user_id) storeUserId(response.user_id);
    if (response.session_id) storeSessionId(response.session_id);
    return response;
  }
  const data = await postJson('/assessment', { session_id: sessionId || undefined, answers });
  if (data.user_id) storeUserId(data.user_id);
  if (data.session_id) storeSessionId(data.session_id);
  return data;
}

export async function getTrends(sessionId) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return mockTrends(sessionId);
  }
  const data = await getJson(`/trends?session_id=${encodeURIComponent(sessionId)}`);
  return Array.isArray(data) ? data : [];
}