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
        setData(res.trends || res || []);
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
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <p className="text-slate-400">Loading your trends…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-teal-50 flex items-center justify-center text-2xl">
            📈
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            No check-ins yet
          </h2>
          <p className="text-slate-500 leading-relaxed">
            Once you complete a check-in, your wellbeing scores will appear here
            as a gentle timeline. It is a non-clinical way to notice patterns
            over time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-1">
            Your wellbeing over time
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            A descriptive view of your check-in scores. Not a clinical measure.
          </p>
          <WellbeingChart data={data} />
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">
            Past check-ins
          </h3>
          <ul className="divide-y divide-slate-100">
            {data.map((d) => (
              <li
                key={d.date}
                className="flex items-center justify-between py-3"
              >
                <span className="text-sm text-slate-600">{d.date}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-teal-500"
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-10 text-right">
                    {d.score}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
