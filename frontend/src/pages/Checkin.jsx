import { useState } from 'react';
import { getAssessmentQuestions, submitAssessment } from '../api.js';

const SCALE = [
  { value: 1, label: 'Never' },
  { value: 2, label: 'Rarely' },
  { value: 3, label: 'Sometimes' },
  { value: 4, label: 'Often' },
  { value: 5, label: 'Always' },
];

function ProgressBar({ current, total }) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
        <span>
          Question {current + 1} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Checkin({ sessionId, onTalkInChat }) {
  const [stage, setStage] = useState('intro'); // intro | questions | result
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function start() {
    setLoading(true);
    setError('');
    try {
      const data = await getAssessmentQuestions();
      setQuestions(data.questions || data);
      setStage('questions');
      setCurrent(0);
    } catch (e) {
      setError("Couldn't load the check-in questions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function select(value) {
    setAnswers((a) => ({ ...a, [questions[current].id]: value }));
  }

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const list = questions.map((q) => ({ id: q.id, value: answers[q.id] }));
      const data = await submitAssessment(sessionId, list);
      setResult(data);
      setStage('result');
    } catch (e) {
      setError("Couldn't submit your check-in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- intro ----------
  if (stage === 'intro') {
    return (
      <div className="px-4 py-8">
        <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-3">
            Weekly check-in
          </h2>
          <p className="text-slate-600 leading-relaxed mb-5">
            This short, optional check-in takes about two minutes. It is not a
            clinical assessment — it is a gentle way to notice how you have been
            doing over the last couple of weeks. Your answers help the coach
            reflect with you.
          </p>
          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-4">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={start}
            disabled={loading}
            className="rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-medium px-6 py-3 text-sm transition shadow-md shadow-teal-200/50 disabled:opacity-50 enabled:hover:brightness-105 enabled:active:translate-y-px"
          >
            {loading ? 'Loading…' : 'Start check-in'}
          </button>
        </div>
      </div>
    );
  }

  // ---------- questions ----------
  if (stage === 'questions') {
    const q = questions[current];
    const selected = answers[q?.id];
    const isLast = current === questions.length - 1;
    const canNext = selected !== undefined;

    return (
      <div className="px-4 py-8">
        <div className="max-w-xl mx-auto">
          <ProgressBar current={current} total={questions.length} />
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mt-6">
            <p className="text-lg text-slate-800 font-medium leading-relaxed mb-6">
              {q.text}
            </p>
            <div className="grid gap-2">
              {SCALE.map((opt) => {
                const active = selected === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 cursor-pointer transition ${
                      active
                        ? 'border-teal-400 bg-teal-50/70 ring-1 ring-teal-200'
                        : 'border-slate-200 hover:border-teal-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-700">
                      {opt.label}
                    </span>
                    <span className="text-xs text-slate-400">{opt.value}</span>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt.value}
                      checked={active}
                      onChange={() => select(opt.value)}
                      className="accent-teal-600"
                    />
                  </label>
                );
              })}
            </div>

            {error && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mt-4">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between mt-7">
              <button
                type="button"
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 disabled:opacity-40 enabled:hover:bg-slate-50"
              >
                Back
              </button>
              {isLast ? (
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canNext || loading}
                  className="rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-medium px-6 py-2.5 text-sm transition shadow-md shadow-teal-200/50 disabled:opacity-40 enabled:hover:brightness-105"
                >
                  {loading ? 'Submitting…' : 'Submit'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => canNext && setCurrent((c) => c + 1)}
                  disabled={!canNext}
                  className="rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-medium px-6 py-2.5 text-sm transition shadow-md shadow-teal-200/50 disabled:opacity-40 enabled:hover:brightness-105"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- result ----------
  const bandColors = {
    Low: 'text-amber-700 bg-amber-50 border-amber-200',
    Moderate: 'text-sky-700 bg-sky-50 border-sky-200',
    Good: 'text-teal-700 bg-teal-50 border-teal-200',
  };
  const bandClass = bandColors[result?.band] || bandColors.Moderate;

  return (
    <div className="px-4 py-8">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
        <h2 className="text-2xl font-semibold text-slate-800 mb-1">
          Your check-in result
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          A gentle snapshot — not a diagnosis.
        </p>

        <div className={`rounded-2xl border px-4 py-3 inline-block mb-6 ${bandClass}`}>
          <span className="text-xs uppercase tracking-wide font-semibold">
            {result.band} wellbeing
          </span>
        </div>

        <div className="mb-6">
          <div className="flex items-end gap-2 mb-1">
            <span className="text-4xl font-semibold text-slate-800">
              {result.score}
            </span>
            <span className="text-slate-400 mb-1">/ 100</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all duration-500"
              style={{ width: `${result.score}%` }}
            />
          </div>
        </div>

        <p className="text-slate-600 leading-relaxed mb-6">
          {result.explanation}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onTalkInChat}
            className="rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-medium px-5 py-3 text-sm transition shadow-md shadow-teal-200/50 hover:brightness-105 active:translate-y-px"
          >
            Talk about this in chat
          </button>
          <button
            type="button"
            onClick={() => {
              setStage('intro');
              setAnswers({});
              setResult(null);
            }}
            className="rounded-2xl px-5 py-3 text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50"
          >
            Take it again
          </button>
        </div>
      </div>
    </div>
  );
}
