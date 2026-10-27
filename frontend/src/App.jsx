import { useEffect, useState } from 'react';
import Onboarding from './pages/Onboarding.jsx';
import Chat from './pages/Chat.jsx';
import Checkin from './pages/Checkin.jsx';
import Trends from './pages/Trends.jsx';
import NonClinicalFooter from './components/NonClinicalFooter.jsx';
import Sidebar from './components/Sidebar.jsx';
import { createSession } from './api.js';

const STORAGE_KEYS = {
  onboarded: 'mindpulse_onboarded',
  access: 'mindpulse_access',
  sessionId: 'mindpulse_session_id',
  userId: 'mindpulse_user_id',
  conversations: 'mindpulse_conversations',
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

function readConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.conversations);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeConversations(conversations) {
  try {
    localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(conversations));
  } catch {
    // Ignore storage failures silently.
  }
}

function normalizeTitle(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'New chat';
}

export default function App() {
  const [onboarded, setOnboarded] = useState(() =>
    readStoredValue(STORAGE_KEYS.onboarded, false),
  );
  const [access, setAccess] = useState(() => readStoredValue(STORAGE_KEYS.access, ''));
  const [sessionId, setSessionId] = useState(() =>
    readStoredValue(STORAGE_KEYS.sessionId, ''),
  );
  const [userId, setUserId] = useState(() => readStoredValue(STORAGE_KEYS.userId, ''));
  const [tab, setTab] = useState('chat');
  const [chatSeed, setChatSeed] = useState('');
  const [chatKey, setChatKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState(() => readConversations());

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.onboarded, onboarded);
  }, [onboarded]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.access, access);
  }, [access]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.sessionId, sessionId);
  }, [sessionId]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.userId, userId);
  }, [userId]);

  useEffect(() => {
    writeConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function completeOnboarding(nextAccess) {
    setAccess(nextAccess);
    try {
      const id = await createSession(nextAccess);
      setSessionId(id || '');
      writeStoredValue(STORAGE_KEYS.sessionId, id || '');
      const storedUser = readStoredValue(STORAGE_KEYS.userId, '');
      setUserId(storedUser || '');
    } catch {
      setSessionId('');
      setUserId('');
      writeStoredValue(STORAGE_KEYS.sessionId, '');
      writeStoredValue(STORAGE_KEYS.userId, '');
    }
    setOnboarded(true);
  }

  async function handleNewChat() {
    setChatSeed('');
    setSidebarOpen(false);
    setTab('chat');
    try {
      const id = await createSession(access);
      setSessionId(id || '');
      writeStoredValue(STORAGE_KEYS.sessionId, id || '');
      const storedUser = readStoredValue(STORAGE_KEYS.userId, '');
      setUserId(storedUser || '');
    } catch {
      setSessionId('');
      setUserId('');
      writeStoredValue(STORAGE_KEYS.sessionId, '');
      writeStoredValue(STORAGE_KEYS.userId, '');
    }
    setChatKey((current) => current + 1);
  }

  function handleSelectConversation(id) {
    setSessionId(id);
    setChatSeed('');
    setTab('chat');
    setSidebarOpen(false);
    setChatKey((current) => current + 1);
  }

  function handleDeleteConversation(id) {
    if (!id) return;
    const target = conversations.find((item) => item.id === id);
    const confirmed = window.confirm(
      `Delete the conversation "${target?.title || 'this chat'}" from your local history?`,
    );
    if (!confirmed) return;

    setConversations((current) => current.filter((item) => item.id !== id));
    if (sessionId === id) {
      setSessionId('');
      writeStoredValue(STORAGE_KEYS.sessionId, '');
      setChatKey((current) => current + 1);
    }
  }

  function handleClearAllHistory() {
    if (!conversations.length) return;
    const confirmed = window.confirm('Clear all saved chat history?');
    if (!confirmed) return;
    setConversations([]);
  }

  function handleStartFresh() {
    setOnboarded(false);
    setAccess('');
    setSessionId('');
    setTab('chat');
    setChatSeed('');
    setChatKey((current) => current + 1);
    setConversations([]);
    writeStoredValue(STORAGE_KEYS.access, '');
    writeStoredValue(STORAGE_KEYS.sessionId, '');
    writeStoredValue(STORAGE_KEYS.onboarded, false);
    writeConversations([]);
  }

  function talkInChat(summaryText) {
    setChatSeed(summaryText);
    setTab('chat');
  }

  function handleMessageSent({ sessionId: incomingSessionId, text }) {
    const effectiveId = incomingSessionId || sessionId;
    if (!effectiveId) return;

    setConversations((current) => {
      const existing = current.find((item) => item.id === effectiveId);
      const nextTitle = normalizeTitle(existing?.title || text);
      const item = {
        id: effectiveId,
        title: nextTitle,
        updatedAt: new Date().toISOString(),
      };

      const filtered = current.filter((entry) => entry.id !== effectiveId);
      return [item, ...filtered].sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
      );
    });
  }

  if (!onboarded) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <div className="h-dvh overflow-hidden bg-gradient-to-b from-slate-50 to-white">
      <Sidebar
        activeTab={tab}
        conversations={conversations}
        currentSessionId={sessionId}
        mobileOpen={sidebarOpen}
        onSelectTab={setTab}
        onNewChat={handleNewChat}
        onStartFresh={handleStartFresh}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onClearAllHistory={handleClearAllHistory}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex h-dvh flex-col md:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-300"
                aria-label="Open navigation menu"
              >
                ☰
              </button>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-sm font-semibold text-white">
                  M
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-slate-800">MindPulse</p>
                  <p className="text-[10px] text-slate-500">AI Coach</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNewChat}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 text-lg font-semibold text-white shadow-sm transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-teal-300"
              aria-label="Start a new chat"
            >
              ＋
            </button>
          </div>
        </header>

        <main className="flex flex-1 min-h-0 flex-col overflow-y-auto">
          {tab === 'chat' && (
            <Chat
              key={chatKey}
              sessionId={sessionId}
              seedMessage={chatSeed}
              onSessionId={setSessionId}
              onMessageSent={handleMessageSent}
              onNewChat={handleNewChat}
            />
          )}
          {tab === 'checkin' && (
            <Checkin sessionId={sessionId} onTalkInChat={talkInChat} />
          )}
          {tab === 'trends' && <Trends sessionId={sessionId} />}
        </main>

        <NonClinicalFooter />
      </div>
    </div>
  );
}
