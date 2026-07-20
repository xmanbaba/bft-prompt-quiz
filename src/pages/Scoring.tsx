import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { quizStore } from '../lib/quizStore';

export default function Scoring() {
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const { responseIds } = quizStore.get();
    if (!responseIds.length) { navigate('/result'); return; }

    async function scoreAll() {
      for (const id of responseIds) {
        try {
          await supabase.functions.invoke('score-response', { body: { response_id: id } });
        } catch (err) {
          console.error('Scoring error for', id, err);
        }
      }
      navigate('/result');
    }

    scoreAll();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] p-4">
      <div className="card w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 4 }} />
        </div>
        <h2 className="text-xl font-extrabold text-blue-dark mb-2">Scoring your responses</h2>
        <p className="text-sm text-gray-500">
          Your prompts are being evaluated against each framework element. This usually takes under a minute — please stay on this page.
        </p>
      </div>
    </div>
  );
}
