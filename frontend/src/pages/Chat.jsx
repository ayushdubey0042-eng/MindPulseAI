import { useEffect, useRef, useState } from 'react';
import { getChatHistory, sendChatMessage } from '../api.js';

const QUICK_REPLIES = [
  "I'm feeling stressed",
  "I'm feeling low",
  "I'm feeling good today",
  'I need help winding down',
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2" aria-label="Coach is typing">
      <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" />
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  if (msg.risk_flag) {
    return (
      <div className="max-w-[85%] rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 mb-1.5 text-amber-800">
          <span className="text-base">🌿</span>
          <span className="text-xs font-semibold uppercase tracking-wide">
            Supportive note
          </span>
        </div>
        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
          {msg.text}
        </p>
        <p className="mt-2.5 text-xs text-amber-700 leading-relaxed">
          You deserve human support. If you are in crisis, please reach out to a
          qualified professional or a local support line.
        </p>
      </div>
    );
  }
  return (
    <div
      className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
        isUser
          ? 'bg-sky-600 text-white self-end rounded-br-md'
          : 'bg-white text-slate-700 border border-slate-200 self-start rounded-bl-md'
      }`}
    >
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
    </div>
  );
}

// onSessionId (optional): called when the backend creates a new session id,
// so the parent can keep it for the check-in and trends screens.
export default function Chat({ sessionId, seedMessage, onSessionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  // Initial greeting, then reload any saved conversation for this session
  useEffect(() => {
    const greeting = {
      id: 'greeting',
      role: 'coach',
      text: "Hi there — I'm your MindPulse coach. I'm here to listen and reflect with you. How have you been feeling lately?",
    };
    setMessages([greeting]);
    if (sessionId) {
      getChatHistory(sessionId)
        .then((items) => {
          if (!items.length) return;
          const restored = items.map((it) => ({
            id: crypto.randomUUID(),
            // backend uses 'assistant'; this screen calls it 'coach'
            role: it.role === 'assistant' ? 'coach' : 'user',
            text: it.text,
          }));
          // Only restore if nothing else has been added meanwhile
          setMessages((m) => (m.length <= 1 ? [greeting, ...restored] : m));
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optional seed message from Check-in "Talk about this in chat"
  useEffect(() => {
    if (seedMessage) {
      sendSeed(seedMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedMessage]);

  async function sendSeed(text) {
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', text },
    ]);
    setLoading(true);
    setError('');
    try {
      const data = await sendChatMessage(sessionId, text);
      if (data.session_id && data.session_id !== sessionId) {
        onSessionId?.(data.session_id);
      }
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'coach',
          text: data.reply,
          risk_flag: data.risk_flag,
          risk_level: data.risk_level,
        },
      ]);
    } catch (e) {
      setError("I couldn't reach the coach just now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading]);

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setError('');
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', text },
    ]);
    setLoading(true);
    try {
      const data = await sendChatMessage(sessionId, text);
      if (data.session_id && data.session_id !== sessionId) {
        onSessionId?.(data.session_id);
      }
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'coach',
          text: data.reply,
          risk_flag: data.risk_flag,
          risk_level: data.risk_level,
        },
      ]);
    } catch (err) {
      setError("I couldn't reach the coach just now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] sm:h-[calc(100vh-8rem)]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-5 space-y-3"
        aria-live="polite"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendSeed(q)}
                className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-sm text-teal-700 transition hover:bg-teal-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {loading && (
          <div className="self-start bg-white border border-slate-200 rounded-2xl rounded-bl-md shadow-sm">
            <TypingIndicator />
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 pb-2">
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {error}
          </p>
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="border-t border-slate-200 bg-white/80 backdrop-blur px-4 py-3"
      >
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message your coach
          </label>
          <textarea
            id="chat-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Write a message…"
            disabled={loading}
            className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 disabled:opacity-50 max-h-32"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-medium px-5 py-3 text-sm transition shadow-md shadow-teal-200/50 disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-105 enabled:active:translate-y-px"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}