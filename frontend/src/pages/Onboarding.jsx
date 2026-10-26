import { useState } from 'react';

const ORG_OPTIONS = [
  {
    id: 'organisation',
    title: 'Through my organisation',
    desc: 'MindPulse is provided as part of a workplace or school wellbeing programme.',
  },
  {
    id: 'independent',
    title: 'Independently',
    desc: 'I am using MindPulse on my own, for my personal wellbeing.',
  },
];

export default function Onboarding({ onComplete }) {
  const [access, setAccess] = useState('');
  const [accepted, setAccepted] = useState(false);

  const canContinue = access && accepted;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-sky-50 via-white to-teal-50">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-3xl shadow-xl shadow-sky-100/60 border border-sky-100 p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-md">
              <span className="text-white text-xl font-semibold">M</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">MindPulse</h1>
              <p className="text-sm text-slate-500">AI Wellbeing Coach</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-slate-800 mb-3">Welcome</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            MindPulse is a friendly, non-clinical wellbeing coach. It offers
            gentle reflection, check-ins, and conversation to help you build
            healthy habits. It does not diagnose, treat, or replace
            professional care.
          </p>

          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 mb-6">
            <p className="text-sm text-amber-800 leading-relaxed">
              This is a non-clinical AI coach. If you are ever worried about
              your safety or someone else's, please contact a qualified
              professional or a local support line.
            </p>
          </div>

          <fieldset className="mb-6">
            <legend className="text-sm font-medium text-slate-700 mb-3">
              How are you using MindPulse?
            </legend>
            <div className="grid gap-3">
              {ORG_OPTIONS.map((opt) => {
                const active = access === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition ${
                      active
                        ? 'border-teal-400 bg-teal-50/70 ring-1 ring-teal-200'
                        : 'border-slate-200 hover:border-teal-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="access"
                      value={opt.id}
                      checked={active}
                      onChange={() => setAccess(opt.id)}
                      className="mt-1 accent-teal-600"
                    />
                    <span>
                      <span className="block font-medium text-slate-800">
                        {opt.title}
                      </span>
                      <span className="block text-sm text-slate-500">
                        {opt.desc}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 accent-teal-600"
            />
            <span className="text-sm text-slate-600 leading-relaxed">
              I have read and accept the privacy and data handling terms. I
              understand MindPulse is not a clinical service and does not
              provide medical advice.
            </span>
          </label>

          <button
            type="button"
            disabled={!canContinue}
            onClick={() => onComplete?.(access)}
            className="w-full rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-medium py-3 transition shadow-md shadow-teal-200/50 disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-105 enabled:active:translate-y-px"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}