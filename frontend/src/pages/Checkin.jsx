import { useState } from 'react';
import { getAssessmentQuestions, submitAssessment } from '../api.js';

function ProgressBar({ current, total }) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div className="w-full">
      <div className="mb-1.5 flex justify-between text-xs text-slate-500">
        <span>
          Question {current + 1} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Checkin({ sessionId, onTalkInChat }) {
  const [stage, setStage] = useState('intro');
  const [instruction, setInstruction] = useState('In the past 4 weeks:');
  const [questions, setQuestions] = useState([]);
  const [options, setOptions] = useState([]);
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
      setInstruction(data.instruction || 'In the past 4 weeks:');
      setOptions(data.options || []);
      setQuestions(data.questions || []);
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

  if (stage === 'intro') {
    return (
      <div className="px-4 py-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <h2 className="mb-3 text-2xl font-semibold text-slate-800">K10 check-in</h2>
          <p className="mb-5 leading-relaxed text-slate-600">
            This short, optional check-in helps you notice how you have been feeling over the last four weeks.
            It is a reflection tool, not a diagnosis.
          </p>
          {error && (
            <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={start}
            disabled={loading}
            className="rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 px-6 py-3 text-sm font-medium text-white shadow-md shadow-teal-200/50 transition enabled:hover:brightness-105 enabled:active:translate-y-px disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Start check-in'}
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'questions') {
    const q = questions[current];
    const selected = answers[q?.id];
    const isLast = current === questions.length - 1;
    const canNext = selected !== undefined;
    const scale = options.length ? options : [
      { value: 1, label: 'None of the time' },
      { value: 2, label: 'A little of the time' },
      { value: 3, label: 'Some of the time' },
      { value: 4, label: 'Most of the time' },
      { value: 5, label: 'All of the time' },
    ];

    return (
      <div className="px-4 py-8">
        <div className="mx-auto max-w-xl">
          <div className="mb-2 text-sm font-medium text-slate-600">{instruction}</div>
          <ProgressBar current={current} total={questions.length} />
          <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <p className="mb-6 text-lg font-medium leading-relaxed text-slate-800">{q.text}</p>
            <div className="grid gap-2">
              {scale.map((opt) => {
                const active = selected === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 transition ${
                      active
                        ? 'border-teal-400 bg-teal-50/70 ring-1 ring-teal-200'
                        : 'border-slate-200 hover:border-teal-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-700">{opt.label}</span>
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
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {error}
              </p>
            )}

            <div className="mt-7 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 enabled:hover:bg-slate-50 disabled:opacity-40"
              >
                Back
              </button>
              {isLast ? (
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canNext || loading}
                  className="rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-teal-200/50 transition enabled:hover:brightness-105 disabled:opacity-40"
                >
                  {loading ? 'Submitting…' : 'Submit'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => canNext && setCurrent((c) => c + 1)}
                  disabled={!canNext}
                  className="rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-teal-200/50 transition enabled:hover:brightness-105 disabled:opacity-40"
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

  const bandColors = {
    low: 'border-amber-200 bg-amber-50 text-amber-700',
    moderate: 'border-sky-200 bg-sky-50 text-sky-700',
    high: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    very_high: 'border-amber-200 bg-amber-50 text-amber-800',
  };
  const bandClass = bandColors[result?.band] || 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
        <h2 className="mb-1 text-2xl font-semibold text-slate-800">Your check-in result</h2>
        <p className="mb-6 text-sm text-slate-500">A gentle snapshot. This is not a diagnosis.</p>

        <div className={`mb-6 inline-block rounded-2xl border px-4 py-3 ${bandClass}`}>
          <span className="text-xs font-semibold uppercase tracking-wide">{result.band_label}</span>
        </div>

        <div className="mb-6">
          <div className="mb-1 flex items-end gap-2">
            <span className="text-4xl font-semibold text-slate-800">Your score: {result.score} / 50</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all duration-500"
              style={{ width: `${(result.score / 50) * 100}%` }}
            />
          </div>
        </div>

        <p className="mb-6 leading-relaxed text-slate-600">{result.explanation}</p>

        {result.recommended_features?.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-sm font-medium text-slate-700">Suggested resources</p>
            <div className="flex flex-wrap gap-2">
              {result.recommended_features.map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {result.band === 'very_high' && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="mb-2 font-semibold">Support</p>
            <p className="leading-relaxed">{result.explanation}</p>
            {Array.isArray(result.support_options) && result.support_options.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-amber-200 pt-3">
                {result.support_options.map((option) => (
                  <li key={`${option.name}-${option.contact}`}>
                    <div className="font-medium">{option.name}</div>
                    <div>{option.contact}</div>
                    {option.note && <div className="text-xs text-amber-800">{option.note}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {result.band === 'high' && (
          <p className="mb-6 text-sm text-slate-600">
            It may help to talk with a GP, psychologist, or your Employee Assistance Program (EAP).
          </p>
        )}

        {Array.isArray(result.suggested_questions) && result.suggested_questions.length > 0 && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="mb-2 font-medium text-slate-700">Questions to reflect on</p>
            <ul className="space-y-2">
              {result.suggested_questions.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onTalkInChat?.(result.chat_seed)}
            className="rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 px-5 py-3 text-sm font-medium text-white shadow-md shadow-teal-200/50 transition hover:brightness-105 active:translate-y-px"
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
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Take it again
          </button>
        </div>
      </div>
    </div>
  );
}
