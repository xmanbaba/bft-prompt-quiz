import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tried in order; falls through to the next on error/rate-limit (Groq free tier).
const MODEL_CHAIN = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'gemma2-9b-it',
];

interface FrameworkElement {
  name: string;
  scoring_guidance: string;
}

interface ElementScore {
  score: number;
  note: string;
}

interface ScoringResult {
  elements: Record<string, ElementScore>;
  authenticity_score: number;
  ai_flag: boolean;
  rationale: string;
}

function buildPrompt(scenarioText: string, answerText: string, elements: FrameworkElement[]) {
  const rubric = elements
    .map(el => `- ${el.name}: ${el.scoring_guidance}`)
    .join('\n');

  return `You are grading a prompt-writing exercise for an AI literacy training course.

SCENARIO GIVEN TO THE PARTICIPANT:
${scenarioText}

PARTICIPANT'S PROMPT:
${answerText}

Score the participant's prompt against each framework element below, on a 1-5 scale (1 = missing/absent, 3 = present but weak, 5 = strong and clearly addressed):
${rubric}

Also assess authenticity: does this read like the participant's own unassisted writing, or does it look copy-pasted / AI-generated / implausibly polished for a timed exercise? Score 1-5 (1 = strong signs of AI-generation or copying, 5 = clearly authentic). Set ai_flag to true only if authenticity_score is 2 or lower, and explain briefly in rationale.

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{
  "elements": {
    "<element name>": { "score": <1-5>, "note": "<one short sentence>" },
    ...
  },
  "authenticity_score": <1-5>,
  "ai_flag": <true|false>,
  "rationale": "<one short sentence, empty string if ai_flag is false>"
}`;
}

function extractJson(text: string): ScoringResult {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

async function scoreWithGroq(prompt: string): Promise<ScoringResult> {
  const apiKey = Deno.env.get('GROQ_API_KEY')!;
  let lastErr: unknown;

  for (const model of MODEL_CHAIN) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        }),
      });

      if (!res.ok) {
        lastErr = new Error(`Groq ${model} returned ${res.status}: ${await res.text()}`);
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        lastErr = new Error(`Groq ${model} returned no content`);
        continue;
      }

      return extractJson(content);
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr ?? new Error('All Groq models failed');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { db: { schema: 'bft_prompt_quiz' } },
  );

  let responseId: string | undefined;

  try {
    const body = (await req.json()) as { response_id?: string };
    responseId = body.response_id;

    if (!responseId) {
      return new Response(JSON.stringify({ error: 'response_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('responses').update({ scoring_status: 'scoring' }).eq('id', responseId);

    const { data: response, error: respErr } = await supabase
      .from('responses')
      .select('id, answer_text, scenario_id')
      .eq('id', responseId)
      .single();
    if (respErr || !response) throw respErr ?? new Error('Response not found');

    const { data: scenario, error: scErr } = await supabase
      .from('scenarios')
      .select('scenario_text, framework_id')
      .eq('id', response.scenario_id)
      .single();
    if (scErr || !scenario) throw scErr ?? new Error('Scenario not found');

    const { data: elements, error: elErr } = await supabase
      .from('framework_elements')
      .select('name, scoring_guidance')
      .eq('framework_id', scenario.framework_id)
      .order('position');
    if (elErr || !elements || elements.length === 0) throw elErr ?? new Error('No framework elements found');

    const prompt = buildPrompt(scenario.scenario_text, response.answer_text, elements);
    const result = await scoreWithGroq(prompt);

    const elementNames = elements.map(e => e.name);
    const total_score = elementNames.reduce((sum, name) => sum + (result.elements[name]?.score ?? 0), 0);
    const max_score = elementNames.length * 5;
    const missed_elements = elementNames.filter(name => (result.elements[name]?.score ?? 0) < 3);

    const { error: updateErr } = await supabase
      .from('responses')
      .update({
        scoring_status: 'done',
        element_scores: result.elements,
        total_score,
        max_score,
        missed_elements,
        authenticity_score: result.authenticity_score,
        ai_flag: result.ai_flag,
        rationale: result.rationale || null,
      })
      .eq('id', responseId);
    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('score-response error', err);
    if (responseId) {
      await supabase.from('responses').update({ scoring_status: 'error' }).eq('id', responseId);
    }
    return new Response(JSON.stringify({ error: 'Scoring failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
