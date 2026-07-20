import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { quizStore } from '../lib/quizStore';

export default function MCQRound() {
  const navigate = useNavigate();
  const { mcqQuestions, mcqAnswers: initialAnswers, participantId } = quizStore.get();
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!participantId || mcqQuestions.length === 0) {
    navigate('/');
    return null;
  }

  function pick(qId: string, idx: number) {
    setAnswers(prev => ({ ...prev, [qId]: idx }));
  }

  async function handleSubmit() {
    if (Object.keys(answers).length < mcqQuestions.length) {
      setError('Please answer all questions before continuing.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('score-mcq', {
        body: { participant_id: participantId, answers },
      });

      if (fnErr) throw fnErr;

      quizStore.set({ mcqAnswers: answers, mcqResult: data });
      navigate('/practical');
    } catch (err) {
      setError('Scoring failed. Please try again.');
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
            Round 1 of 2 · Framework Recall
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-blue-dark mb-1">Knowledge check</h2>
        <p className="text-sm text-gray-500 mb-6">
          {mcqQuestions.length} questions on the prompting frameworks. Pick the best answer for each.
        </p>

        {mcqQuestions.map((q, i) => (
          <div key={q.id} className="card mb-4">
            <p className="font-bold text-sm text-gray-800 mb-3">{i + 1}. {q.question}</p>
            {q.options.map((opt, oi) => (
              <div
                key={oi}
                onClick={() => pick(q.id, oi)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 mb-2 cursor-pointer text-sm transition-all ${
                  answers[q.id] === oi
                    ? 'border-blue bg-blue-light font-bold'
                    : 'border-gray-200 hover:border-blue'
                }`}
              >
                <input type="radio" readOnly checked={answers[q.id] === oi} className="accent-blue" />
                {opt}
              </div>
            ))}
          </div>
        ))}

        {error && (
          <div className="bg-red-light border border-red-200 text-red text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? <><div className="spinner" />Submitting...</> : 'Continue to Practical Round →'}
        </button>
      </div>
    </div>
  );
}
