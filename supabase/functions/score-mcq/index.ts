import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MCQResult {
  correct: boolean;
  correct_index: number;
  explanation: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { participant_id, answers } = (await req.json()) as {
      participant_id?: string;
      answers?: Record<string, number>;
    };

    if (!participant_id || !answers || typeof answers !== 'object') {
      return new Response(JSON.stringify({ error: 'participant_id and answers are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const questionIds = Object.keys(answers);
    if (questionIds.length === 0) {
      return new Response(JSON.stringify({ score: 0, total: 0, results: {} }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { db: { schema: 'bft_prompt_quiz' } },
    );

    const { data: keys, error } = await supabase
      .from('mcq_answer_keys')
      .select('question_id, correct_index, explanation')
      .in('question_id', questionIds);

    if (error) throw error;

    const results: Record<string, MCQResult> = {};
    let score = 0;

    for (const key of keys ?? []) {
      const picked = answers[key.question_id];
      const correct = picked === key.correct_index;
      if (correct) score++;
      results[key.question_id] = {
        correct,
        correct_index: key.correct_index,
        explanation: key.explanation,
      };
    }

    return new Response(JSON.stringify({ score, total: questionIds.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('score-mcq error', err);
    return new Response(JSON.stringify({ error: 'Scoring failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
