import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { quizStore } from '../lib/quizStore';
import type { Response } from '../types';

function FrameworkBadge({ fw }: { fw: string }) {
  const cls: Record<string, string> = {
    CRAFT: 'framework-badge-craft',
    GCSE: 'framework-badge-gcse',
    PTCF: 'framework-badge-ptcf',
    CRISPE: 'framework-badge-crispe',
  };
  return <span className={cls[fw] ?? 'framework-badge-craft'}>{fw}</span>;
}

export default function Result() {
  const navigate = useNavigate();
  const { participantId, participantName, mcqResult, session } = quizStore.get();
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!participantId) { navigate('/'); return; }
    supabase.from('responses')
      .select('*, scenarios(title, category, scenario_text)')
      .eq('participant_id', participantId)
      .order('submitted_at')
      .then(({ data }) => {
        setResponses((data as Response[]) ?? []);
        setLoading(false);
      });
  }, [participantId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-48px)]">
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 4 }} />
      </div>
    );
  }

  const practicalTotal = responses.reduce((s, r) => s + (r.total_score ?? 0), 0);
  const practicalMax = responses.reduce((s, r) => s + (r.max_score ?? 0), 0);
  const flags = responses.filter(r => r.ai_flag).length;

  // Pass/fail: average element score vs threshold
  const passThreshold = session?.pass_threshold ?? 3.5;
  const avgElementScore = practicalMax > 0
    ? ((practicalTotal / practicalMax) * 5)
    : 0;
  const passed = avgElementScore >= passThreshold;

  return (
    <div className="flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-2xl">
        <div className="eyebrow">Your Result</div>
        <h2 className="text-2xl font-extrabold text-blue-dark mb-4">{participantName}</h2>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-blue-light border border-blue-mid rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold text-blue-dark">{mcqResult?.score ?? 0}/{mcqResult?.total ?? 0}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Framework Recall</div>
          </div>
          <div className="bg-blue-light border border-blue-mid rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold text-blue-dark">{practicalTotal}/{practicalMax}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Practical Score</div>
          </div>
          <div className={`rounded-xl p-4 text-center border ${passed ? 'bg-green-light border-green-200' : 'bg-red-light border-red-200'}`}>
            <div className={`text-2xl font-extrabold ${passed ? 'text-green' : 'text-red'}`}>
              {passed ? 'PASS' : 'NEEDS WORK'}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Benchmark ({passThreshold}/5)</div>
          </div>
        </div>

        {/* Per-response breakdown */}
        {responses.map(r => {
          const elements = r.element_scores ? Object.entries(r.element_scores) : [];
          return (
            <div key={r.id} className="card mb-4">
              <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FrameworkBadge fw={r.framework_acronym} />
                  <strong className="text-sm">{r.scenarios?.category}</strong>
                </div>
                <span className="bg-blue text-white text-xs font-extrabold px-3 py-1.5 rounded-full">
                  {r.scoring_status === 'done' ? `${r.total_score} / ${r.max_score}` : 'Not scored'}
                </span>
              </div>

              {r.scoring_status === 'done' && elements.length > 0 ? (
                <>
                  {elements.map(([el, data]) => (
                    <div key={el} className="flex justify-between items-center py-2 border-b border-dashed border-gray-200 last:border-0 text-sm">
                      <span className="font-bold text-gray-800">{el}</span>
                      <div className="flex items-center gap-3">
                        <span className={data.score >= 3 ? 'chip-ok' : 'chip-miss'}>
                          {data.score >= 3 ? 'Present' : 'Missing / weak'}
                        </span>
                        <span className="text-xs text-gray-500 max-w-[160px] text-right">{data.note}</span>
                      </div>
                    </div>
                  ))}
                  {(r.missed_elements ?? []).length > 0 && (
                    <div className="bg-red-light border border-red-200 rounded-lg px-4 py-3 mt-3 text-xs text-red">
                      <strong>Strengthen next time:</strong> {r.missed_elements!.join(', ')} {r.missed_elements!.length === 1 ? 'was' : 'were'} missing or unclear.
                    </div>
                  )}
                  {r.ai_flag && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mt-2 text-xs text-yellow-800 font-bold">
                      ⚠ This response may not fully reflect your own unassisted writing. {r.rationale}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 m-0">
                  {r.scoring_status === 'error'
                    ? 'Automatic scoring could not be completed for this item. Your facilitator will review it.'
                    : 'Scoring in progress...'}
                </p>
              )}
            </div>
          );
        })}

        {flags > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-4 text-sm text-yellow-800">
            <strong>{flags} authenticity flag{flags > 1 ? 's' : ''}</strong> were raised on your responses. Your facilitator will review these.
          </div>
        )}

        <div className="bg-blue-light border border-blue-mid rounded-lg px-4 py-3 text-sm text-blue-dark font-bold text-center mb-4">
          📸 Take a screenshot of this page — your results are saved to the session record, but this is the easiest way to keep your own copy.
        </div>

        <button className="btn-ghost" onClick={() => { quizStore.reset(); navigate('/'); }}>Done</button>
      </div>
    </div>
  );
}
