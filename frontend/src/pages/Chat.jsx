import { useEffect, useRef, useState } from 'react';
import { getChatHistory, sendChatMessage } from '../api.js';

const QUICK_REPLIES = [
  'I want to reflect on today',
  "I'm feeling a bit overwhelmed",
  'What would help me feel more supported?',
  'I need a calmer moment',
];

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2" aria-label="Coach is typing">
      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';

  if (msg.risk_flag) {
    return (
      <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-[10px] font-semibold text-white shadow-sm">
            M
          </div>
        )}

        <div className={`max-w-[82%] ${isUser ? 'self-end' : 'self-start'}`}>
          {!isUser && (
            <div className="mb-1.5 flex items-center gap-2 pl-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <span>Coach</span>
            </div>
          )}

          <div className="rounded-2xl rounded-bl-[4px] border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
            <div className="mb-1.5 flex items-center gap-2 text-amber-800">
              <span className="text-base">🌿</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                Supportive note
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{msg.text}</p>
            {Array.isArray(msg.support_options) && msg.support_options.length > 0 && (
              <div className="mt-3 border-t border-amber-200 pt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">
                  Support options
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  {msg.support_options.map((option) => (
                    <li key={`${option.name}-${option.contact}`} className="rounded-xl bg-white/70 p-2">
                      <div className="font-medium text-slate-800">{option.name}</div>
                      <div className="text-slate-600">{option.contact}</div>
                      {option.note && <div className="text-xs text-slate-500">{option.note}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {msg.createdAt && (
            <p className="mt-1 text-[10px] text-slate-400">{formatTime(msg.createdAt)}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-[10px] font-semibold text-white shadow-sm">
          M
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? 'self-end' : 'self-start'}`}>
        {isUser ? (
          <div className="mb-1.5 flex justify-end text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <span>You</span>
          </div>
        ) : (
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <span>Coach</span>
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? 'bg-gradient-to-r from-sky-600 to-teal-600 text-white rounded-br-[4px]'
              : 'border border-slate-200 bg-white text-slate-700 rounded-bl-[4px]'
          }`}
        >
          <p className="whitespace-pre-wrap text-sm leading-6">{msg.text}</p>
        </div>

        {msg.createdAt && (
          <p className="mt-1 text-[10px] text-slate-400">{formatTime(msg.createdAt)}</p>
        )}
      </div>
    </div>
  );
}

export default function Chat({ sessionId, seedMessage, onSessionId, onMessageSent, onNewChat }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionLocked, setSessionLocked] = useState(false);
  const [supportOptions, setSupportOptions] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    const greeting = {
      id: 'greeting',
      role: 'coach',
      text: "Hi there — I'm your MindPulse coach. I'm here to listen and reflect with you. How have you been feeling lately?",
      createdAt: new Date().toISOString(),
    };

    setMessages([greeting]);
    if (sessionId) {
      getChatHistory(sessionId)
        .then((items) => {
          if (!items.length) return;
          const restored = items.map((it) => ({
            id: crypto.randomUUID(),
            role: it.role === 'assistant' ? 'coach' : 'user',
            text: it.text,
            createdAt: it.createdAt || undefined,
          }));
          setMessages((m) => (m.length <= 1 ? [greeting, ...restored] : m));
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (seedMessage) {
      sendSeed(seedMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedMessage]);

  async function sendSeed(text) {
    const trimmed = text.trim();
    if (!trimmed || loading || sessionLocked) return;

    const createdAt = new Date().toISOString();
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', text: trimmed, createdAt },
    ]);
    setLoading(true);
    setError('');

    try {
      const data = await sendChatMessage(sessionId, trimmed);
      const effectiveSessionId = data.session_id || sessionId || '';
      if (data.session_id && data.session_id !== sessionId) {
        onSessionId?.(data.session_id);
      }
      onMessageSent?.({ sessionId: effectiveSessionId, text: trimmed });
      setSessionLocked(Boolean(data.session_locked));
      setSupportOptions(Array.isArray(data.support_options) ? data.support_options : []);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'coach',
          text: data.reply,
          risk_flag: data.risk_flag,
          risk_level: data.risk_level,
          support_options: data.support_options || [],
          createdAt: new Date().toISOString(),
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
    if (!text || loading || sessionLocked) return;
    setInput('');
    setError('');

    const createdAt = new Date().toISOString();
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', text, createdAt },
    ]);
    setLoading(true);

    try {
      const data = await sendChatMessage(sessionId, text);
      const effectiveSessionId = data.session_id || sessionId || '';
      if (data.session_id && data.session_id !== sessionId) {
        onSessionId?.(data.session_id);
      }
      onMessageSent?.({ sessionId: effectiveSessionId, text });
      setSessionLocked(Boolean(data.session_locked));
      setSupportOptions(Array.isArray(data.support_options) ? data.support_options : []);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'coach',
          text: data.reply,
          risk_flag: data.risk_flag,
          risk_level: data.risk_level,
          support_options: data.support_options || [],
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError("I couldn't reach the coach just now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-slate-50/40">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-8"
        aria-live="polite"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {messages.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}

          {messages.length === 1 && !loading && !sessionLocked && (
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendSeed(q)}
                  className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-sm text-teal-700 transition hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-300"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {sessionLocked && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
              <p className="mb-3 leading-relaxed">
                This conversation has been paused. Please contact emergency services or a crisis support line. You can start a new chat when you are ready.
              </p>
              <button
                type="button"
                onClick={onNewChat}
                className="rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-4 py-2 font-medium text-white shadow-sm"
              >
                Start a new chat
              </button>
            </div>
          )}

          {loading && (
            <div className="flex w-full justify-start">
              <div className="max-w-[80%] self-start rounded-2xl rounded-bl-[4px] border border-slate-200 bg-white shadow-sm">
                <div className="mb-1.5 flex items-center gap-2 pl-3 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <span>Coach</span>
                </div>
                <TypingIndicator />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 pb-2 sm:px-8">
          <div className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </div>
        </div>
      )}

      {!sessionLocked && (
        <form
          onSubmit={handleSend}
          className="shrink-0 border-t border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-8"
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2">
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
              className="max-h-32 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 px-5 py-3 text-sm font-medium text-white shadow-md shadow-teal-200/50 transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:cursor-not-allowed disabled:opacity-40 enabled:active:translate-y-px"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
