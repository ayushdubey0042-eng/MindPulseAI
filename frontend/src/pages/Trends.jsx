import { useEffect, useState } from 'react';
import { getTrends } from '../api.js';
import WellbeingChart from '../components/WellbeingChart.jsx';

export default function Trends({ sessionId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getTrends(sessionId);
        const sorted = [...res].sort((a, b) => new Date(a.created_at || a.date) - new Date(b.created_at || b.date));
        setData(sorted);
      } catch (e) {
        setError("Couldn't load your trends right now.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <p className="text-slate-400">Loading your trends…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl">
            📈
          </div>
          <h2 className="mb-2 text-xl font-semibold text-slate-800">No check-ins yet</h2>
          <p className="leading-relaxed text-slate-500">
            Once you complete a K10 check-in, your wellbeing scores will appear here as a gentle timeline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-xl font-semibold text-slate-800">Your wellbeing over time</h2>
          <p className="mb-5 text-sm text-slate-500">K10 scores are shown on a 10-50 scale, where higher scores mean more distress.</p>
          <WellbeingChart data={data} />
          <p className="mt-3 text-xs text-slate-500">Higher scores mean more distress. This is not a diagnosis.</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-slate-800">Past check-ins</h3>
          <ul className="divide-y divide-slate-100">
            {data.map((d) => (
              <li key={`${d.created_at || d.date}-${d.score}`} className="flex items-center justify-between py-3">
                <span className="text-sm text-slate-600">{d.date}</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-teal-500"
                      style={{ width: `${((d.score - 10) / 40) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm font-medium text-slate-700">{d.score}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
