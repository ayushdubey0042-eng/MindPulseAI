import { useMemo, useState } from 'react';
import Onboarding from './pages/Onboarding.jsx';
import Chat from './pages/Chat.jsx';
import Checkin from './pages/Checkin.jsx';
import Trends from './pages/Trends.jsx';
import NonClinicalFooter from './components/NonClinicalFooter.jsx';

const NAV = [
  { id: 'chat', label: 'Chat' },
  { id: 'checkin', label: 'Check-in' },
  { id: 'trends', label: 'Trends' },
];

export default function App() {
  const [onboarded, setOnboarded] = useState(false);
  const [tab, setTab] = useState('chat');
  const [sessionId, setSessionId] = useState('');
  const [chatSeed, setChatSeed] = useState('');

  function completeOnboarding() {
    setSessionId(crypto.randomUUID());
    setOnboarded(true);
  }

  function talkInChat(summaryText) {
    setChatSeed(summaryText);
    setTab('chat');
  }

  const nav = useMemo(() => NAV, []);

  if (!onboarded) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-sm">
              <span className="text-white font-semibold">M</span>
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-slate-800 text-sm">MindPulse</p>
              <p className="text-[11px] text-slate-500">AI Wellbeing Coach</p>
            </div>
          </div>
          <nav className="flex gap-1 bg-slate-100 rounded-2xl p-1">
            {nav.map((n) => (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-xl transition ${
                  tab === n.id
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {n.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto flex flex-col">
        {tab === 'chat' && (
          <Chat
            sessionId={sessionId}
            seedMessage={chatSeed}
          />
        )}
        {tab === 'checkin' && (
          <Checkin sessionId={sessionId} onTalkInChat={talkInChat} />
        )}
        {tab === 'trends' && <Trends sessionId={sessionId} />}
      </main>

      <NonClinicalFooter />
    </div>
  );
}
