import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { quizStore } from '../lib/quizStore';

function FrameworkBadge({ fw }: { fw: string }) {
  const cls: Record<string, string> = {
    CRAFT: 'framework-badge-craft',
    GCSE: 'framework-badge-gcse',
    PTCF: 'framework-badge-ptcf',
    CRISPE: 'framework-badge-crispe',
  };
  return <span className={cls[fw] ?? 'framework-badge-craft'}>{fw}</span>;
}

export default function PracticalRound() {
  const navigate = useNavigate();
  const store = quizStore.get();
  const { scenarios, participantId, sessionId, practicalAnswers: savedAnswers, currentScenarioIndex: savedIdx } = store;

  const [currentIdx, setCurrentIdx] = useState(savedIdx);
  const [answers, setAnswers] = useState<Record<string, string>>(savedAnswers);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!participantId || scenarios.length === 0) {
    navigate('/');
    return null;
  }

  const scenario = scenarios[currentIdx];
  const isLast = currentIdx === scenarios.length - 1;
  const currentAnswer = answers[scenario.id] ?? '';

  function updateAnswer(val: string) {
    setAnswers(prev => ({ ...prev, [scenario.id]: val }));
    quizStore.set({ practicalAnswers: { ...answers, [scenario.id]: val } });
  }

  function goNext() {
    if (!isLast) {
      quizStore.set({ currentScenarioIndex: currentIdx + 1 });
      setCurrentIdx(i => i + 1);
      setError('');
    }
  }

  function goPrev() {
    if (currentIdx > 0) {
      quizStore.set({ currentScenarioIndex: currentIdx - 1 });
      setCurrentIdx(i => i - 1);
      setError('');
    }
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);

    try {
      // Mark participant as submitted
      await supabase.from('participants').update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      }).eq('id', participantId);

      // Insert response rows
      const responseIds: string[] = [];
      for (const sc of scenarios) {
        const { data: rd } = await supabase.from('responses').insert({
          participant_id: participantId,
          session_id: sessionId,
          scenario_id: sc.id,
          participant_name: store.participantName,
          framework_acronym: sc.framework_acronym ?? 'CRAFT',
          answer_text: (answers[sc.id] ?? '').trim() || '(No response submitted)',
          scoring_status: 'pending',
        }).select().single();

        if (rd) responseIds.push(rd.id);
      }

      quizStore.set({ responseIds });
      navigate('/scoring');
    } catch (err) {
      setError('Submission failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-2">
          <span className="bg-blue-light text-blue-dark text-xs font-bold px-4 py-1.5 rounded-full">
            Round 2 of 2 · Practical Prompt Writing · {currentIdx + 1} of {scenarios.length}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <FrameworkBadge fw={scenario.framework_acronym ?? 'CRAFT'} />
          <span className="text-xs text-gray-500">{scenario.category}</span>
        </div>

        <div className="bg-gray-50 border-l-4 border-blue px-4 py-3 rounded-r-lg mb-5 text-sm text-gray-800 leading-relaxed">
          <strong>Scenario: </strong>{scenario.scenario_text}
        </div>

        <div className="mb-1">
          <label className="label">Write the complete prompt you would give to the AI for this scenario</label>
          <textarea
            className="input-field resize-y min-h-[140px] leading-relaxed"
            placeholder={`Write your full ${scenario.framework_acronym ?? 'CRAFT'} prompt here...`}
            value={currentAnswer}
            onChange={e => updateAnswer(e.target.value)}
          />
          <div className="text-xs text-gray-400 text-right mt-1">{currentAnswer.length} characters</div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 my-4">
          {scenarios.map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i < currentIdx ? 'bg-blue' : i === currentIdx ? 'bg-blue ring-2 ring-blue-light ring-offset-1' : 'bg-gray-200'
            }`} />
          ))}
        </div>

        {error && (
          <div className="bg-red-light border border-red-200 text-red text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        <div className="flex gap-3">
          {currentIdx > 0 && (
            <button className="btn-ghost" onClick={goPrev}>← Back</button>
          )}
          {isLast ? (
            <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? <><div className="spinner" />Submitting...</> : 'Submit for Scoring'}
            </button>
          ) : (
            <button className="btn-primary" onClick={goNext}>Next →</button>
          )}
        </div>
      </div>
    </div>
  );
}
