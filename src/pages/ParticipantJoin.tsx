import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { quizStore } from '../lib/quizStore';
import type { MCQQuestion, Scenario, Session } from '../types';

export default function ParticipantJoin() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionPreview, setSessionPreview] = useState<Session | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  // Look up session as soon as code is 8+ characters
  async function handleCodeBlur() {
    if (code.trim().length < 4) return;
    setCheckingCode(true);
    const { data: session } = await supabase
      .from('sessions')
      .select('*, industry:industries(id,name,slug)')
      .eq('code', code.trim().toUpperCase())
      .eq('status', 'active')
      .single();
    setSessionPreview(session as unknown as Session ?? null);
    setCheckingCode(false);
  }

  async function handleJoin() {
    setError('');
    if (!name.trim()) { setError('Please enter your full name.'); return; }
    if (!code.trim()) { setError('Please enter the session code.'); return; }

    setLoading(true);
    try {
      const { data: session, error: sessErr } = await supabase
        .from('sessions')
        .select('*, industry:industries(id,name,slug)')
        .eq('code', code.trim().toUpperCase())
        .eq('status', 'active')
        .single();

      if (sessErr || !session) {
        setError('Session code not found. Please check with your facilitator.');
        setLoading(false);
        return;
      }

      const typedSession = session as unknown as Session;

      if (typedSession.require_email && !email.trim()) {
        setError('Please enter your email address — this session requires it.');
        setLoading(false);
        return;
      }

      const { data: participant, error: partErr } = await supabase
        .from('participants')
        .insert({ session_id: typedSession.id, name: name.trim(), email: email.trim() || null })
        .select()
        .single();

      if (partErr) {
        setError(partErr.code === '23505'
          ? 'That name is already in use in this session. Please use your full name.'
          : 'Could not join: ' + partErr.message);
        setLoading(false);
        return;
      }

      const { data: sfRows } = await supabase
        .from('session_frameworks')
        .select('framework_id')
        .eq('session_id', typedSession.id);

      const frameworkIds = (sfRows ?? []).map((r: { framework_id: string }) => r.framework_id);

      const { data: allQuestions } = await supabase
        .from('mcq_questions')
        .select('*')
        .or(frameworkIds.length > 0
          ? `framework_id.in.(${frameworkIds.join(',')}),framework_id.is.null`
          : 'framework_id.is.null')
        .eq('active', true);

      const shuffled = (allQuestions ?? []).sort(() => Math.random() - 0.5).slice(0, typedSession.mcq_count);
      const questions: MCQQuestion[] = shuffled.map((q: MCQQuestion & { options: string[] | string }) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      }));

      const { data: scenarioRows } = frameworkIds.length > 0
        ? await supabase
            .from('scenarios')
            .select('*, frameworks(acronym)')
            .eq('industry_id', typedSession.industry_id)
            .in('framework_id', frameworkIds)
            .eq('status', 'active')
        : { data: [] as (Scenario & { frameworks: { acronym: string } })[] };

      const scenariosByFramework: Record<string, Scenario[]> = {};
      (scenarioRows ?? []).forEach((s: Scenario & { frameworks: { acronym: string } }) => {
        const fw = s.frameworks?.acronym ?? 'UNKNOWN';
        if (!scenariosByFramework[fw]) scenariosByFramework[fw] = [];
        scenariosByFramework[fw].push({ ...s, framework_acronym: fw });
      });

      const selectedScenarios: Scenario[] = [];
      Object.values(scenariosByFramework).forEach(fwScenarios => {
        selectedScenarios.push(...fwScenarios.sort(() => Math.random() - 0.5).slice(0, typedSession.scenarios_per_framework));
      });

      quizStore.reset();
      quizStore.set({
        participantId: participant.id,
        participantName: name.trim(),
        sessionId: typedSession.id,
        sessionCode: typedSession.code,
        session: typedSession,
        mcqQuestions: questions,
        scenarios: selectedScenarios,
      });

      navigate('/mcq');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const requiresEmail = sessionPreview?.require_email ?? false;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] p-4">
      <div className="card w-full max-w-md">
        <div className="eyebrow">Join the Quiz</div>
        <h2 className="text-xl font-extrabold text-blue-dark mb-1">Enter your details</h2>
        <p className="text-sm text-gray-500 mb-5">Ask your facilitator for the session code.</p>

        <div className="mb-4">
          <label className="label">Your full name</label>
          <input
            className="input-field"
            placeholder="e.g. Amaka Johnson"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="label">Session code</label>
          <input
            className="input-field uppercase"
            placeholder="e.g. RESTAT01"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setSessionPreview(null); }}
            onBlur={handleCodeBlur}
          />
          {checkingCode && <p className="text-xs text-gray-400 mt-1">Checking code...</p>}
          {sessionPreview && (
            <div className="mt-2 bg-blue-light border border-blue-mid rounded-lg px-3 py-2 text-xs text-blue-dark font-bold">
              ✓ Session found: {sessionPreview.name}
            </div>
          )}
        </div>

        {/* Always show email field if session requires it */}
        {requiresEmail && (
          <div className="mb-4">
            <label className="label">Email address <span className="text-red">*</span></label>
            <input
              className="input-field"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Required by this session for result records.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-light border border-red-200 text-red text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        <button className="btn-primary mb-3" onClick={handleJoin} disabled={loading}>
          {loading ? <><div className="spinner" />Joining...</> : 'Join and Start'}
        </button>
        <button className="btn-ghost" onClick={() => navigate('/')}>Back</button>
      </div>
    </div>
  );
}
