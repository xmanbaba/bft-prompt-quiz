import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Session, Participant, Response, Industry, Framework } from '../types';
import { LogOut, RefreshCw, Download, Plus, X, Copy, Check } from 'lucide-react';

function FrameworkBadge({ fw }: { fw: string }) {
  const cls: Record<string, string> = {
    CRAFT: 'framework-badge-craft',
    GCSE: 'framework-badge-gcse',
    PTCF: 'framework-badge-ptcf',
    CRISPE: 'framework-badge-crispe',
  };
  return <span className={cls[fw] ?? 'framework-badge-craft'}>{fw}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="ml-2 text-blue hover:text-blue-dark transition-colors" title="Copy code">
      {copied ? <Check className="w-4 h-4 text-green" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export default function FacilitatorDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'sessions' | 'participants' | 'responses'>('sessions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [projecting, setProjecting] = useState<Response | null>(null);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [createdSession, setCreatedSession] = useState<Session | null>(null);
  const [newSession, setNewSession] = useState({
    name: '', industry_id: '', framework_ids: [] as string[],
    pass_threshold: 3.5, mcq_count: 8, scenarios_per_framework: 2,
    require_email: false, session_date: ''
  });
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (!data.user) navigate('/facilitator'); });
    loadLookups();
    loadSessions();
  }, [navigate]);

  async function loadLookups() {
    const [{ data: ind }, { data: fw }] = await Promise.all([
      supabase.from('industries').select('*').eq('active', true).order('name'),
      supabase.from('frameworks').select('*').eq('active', true).order('acronym'),
    ]);
    setIndustries(ind ?? []);
    setFrameworks(fw ?? []);
  }

  async function loadSessions() {
    setLoading(true);
    const { data } = await supabase
      .from('sessions')
      .select('*, industry:industries(id,name,slug)')
      .order('created_at', { ascending: false });
    setSessions((data as Session[]) ?? []);
    setLoading(false);
  }

  const loadSessionData = useCallback(async (session: Session) => {
    setSelectedSession(session);
    setSelectedParticipant(null);
    const [{ data: parts }, { data: resps }] = await Promise.all([
      supabase.from('participants').select('*').eq('session_id', session.id).order('joined_at'),
      supabase.from('responses').select('*, scenarios(title, category, scenario_text)').eq('session_id', session.id).order('submitted_at'),
    ]);
    setParticipants((parts as Participant[]) ?? []);
    setResponses((resps as Response[]) ?? []);
    setTab('participants');
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  async function createSession() {
    if (!newSession.name || !newSession.industry_id || newSession.framework_ids.length === 0) return;
    setCreating(true);
    const code = newSession.name.replace(/\s+/g, '').toUpperCase().slice(0, 6) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const { data: user } = await supabase.auth.getUser();

    const { data: sess, error } = await supabase.from('sessions').insert({
      name: newSession.name,
      industry_id: newSession.industry_id,
      facilitator_id: user.user!.id,
      code,
      pass_threshold: newSession.pass_threshold,
      mcq_count: newSession.mcq_count,
      scenarios_per_framework: newSession.scenarios_per_framework,
      require_email: newSession.require_email,
      session_date: newSession.session_date || null,
      status: 'active',
    }).select('*, industry:industries(id,name,slug)').single();

    if (!error && sess) {
      for (const fwId of newSession.framework_ids) {
        await supabase.from('session_frameworks').insert({ session_id: sess.id, framework_id: fwId });
      }
      setCreatedSession(sess as unknown as Session);
      setNewSession({ name: '', industry_id: '', framework_ids: [], pass_threshold: 3.5, mcq_count: 8, scenarios_per_framework: 2, require_email: false, session_date: '' });
      await loadSessions();
    }
    setCreating(false);
  }

  function exportCSV() {
    if (!selectedSession) return;
    const rows = [['Participant', 'Email', 'Status', 'Item', 'Framework', 'Category', 'Score', 'Max', 'AI Flag', 'Missed Elements', 'Answer']];
    participants.forEach(p => {
      const myResps = responses.filter(r => r.participant_id === p.id);
      if (!myResps.length) {
        rows.push([p.name, p.email ?? '', p.status, '', '', '', '', '', '', '', '']);
      } else {
        myResps.forEach(r => {
          rows.push([p.name, p.email ?? '', p.status, r.scenario_id, r.framework_acronym,
            (r.scenarios as { category?: string })?.category ?? '',
            String(r.total_score ?? ''), String(r.max_score ?? ''),
            r.ai_flag ? 'Yes' : 'No', (r.missed_elements ?? []).join('; '), r.answer_text ?? '']);
        });
      }
    });
    const csv = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${selectedSession.code}_results.csv`;
    a.click();
  }

  const passThreshold = selectedSession?.pass_threshold ?? 3.5;
  const submittedParticipants = participants.filter(p => p.status === 'submitted');
  const passCount = submittedParticipants.filter(p => {
    const myResps = responses.filter(r => r.participant_id === p.id && r.scoring_status === 'done');
    if (!myResps.length) return false;
    const total = myResps.reduce((s, r) => s + (r.total_score ?? 0), 0);
    const max = myResps.reduce((s, r) => s + (r.max_score ?? 0), 0);
    return max > 0 && (total / max) * 5 >= passThreshold;
  }).length;

  const displayedResponses = selectedParticipant
    ? responses.filter(r => r.participant_id === selectedParticipant)
    : responses;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-dark text-white px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-lg">
        <div>
          <h2 className="font-extrabold text-base">{selectedSession?.name ?? 'BFT Prompting Quiz'}</h2>
          {selectedSession && (
            <div className="flex items-center gap-1 text-xs text-white/60 mt-0.5">
              Code: <span className="font-bold text-white">{selectedSession.code}</span>
              <CopyButton text={selectedSession.code} />
              · {(selectedSession.industry as Industry)?.name}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedSession && (
            <button onClick={() => { setSelectedSession(null); setTab('sessions'); }}
              className="bg-white/15 border border-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-md">
              ← Sessions
            </button>
          )}
          {selectedSession && (
            <button onClick={exportCSV}
              className="bg-white/15 border border-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1">
              <Download className="w-3 h-3" />CSV
            </button>
          )}
          {selectedSession && (
            <button onClick={() => loadSessionData(selectedSession)}
              className="bg-white/15 border border-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />Refresh
            </button>
          )}
          <button onClick={handleSignOut}
            className="bg-white/15 border border-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1">
            <LogOut className="w-3 h-3" />Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* SESSION LIST */}
        {!selectedSession && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-blue-dark text-lg">Your Sessions</h3>
              <button onClick={() => { setCreatedSession(null); setShowCreateSession(true); }}
                className="bg-blue text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1 hover:opacity-90">
                <Plus className="w-3 h-3" />New Session
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><div className="spinner" style={{ width: 32, height: 32, borderWidth: 4 }} /></div>
            ) : sessions.length === 0 ? (
              <div className="card text-center text-gray-500 py-12">No sessions yet. Create your first one.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sessions.map(s => (
                  <button key={s.id} onClick={() => loadSessionData(s)}
                    className="card text-left hover:border-blue hover:shadow transition-all">
                    <div className="font-bold text-sm text-gray-800 mb-1">{s.name}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      {(s.industry as Industry)?.name} ·
                      <span className="font-bold text-blue-dark">{s.code}</span>
                      <CopyButton text={s.code} />
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-light text-green' : 'bg-gray-100 text-gray-500'}`}>
                      {s.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* SESSION DETAIL */}
        {selectedSession && (
          <>
            <div className="flex gap-3 flex-wrap mb-5">
              {[
                { label: 'Joined', val: participants.length },
                { label: 'Submitted', val: submittedParticipants.length },
                { label: `Passed (≥${passThreshold}/5)`, val: `${passCount}/${submittedParticipants.length}` },
                { label: 'AI Flags', val: responses.filter(r => r.ai_flag).length },
              ].map(s => (
                <div key={s.label} className="bg-blue-light border border-blue-mid rounded-lg px-4 py-2 text-center min-w-[90px]">
                  <div className="font-extrabold text-blue-dark text-lg leading-none">{s.val}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="flex border-b-2 border-gray-200 mb-5 overflow-x-auto">
              {(['participants', 'responses'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-5 py-2.5 text-sm font-bold capitalize border-b-2 -mb-0.5 whitespace-nowrap transition-colors ${tab === t ? 'border-blue text-blue-dark' : 'border-transparent text-gray-500'}`}>
                  {t}
                </button>
              ))}
            </div>

            {tab === 'participants' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {participants.length === 0 && (
                  <div className="col-span-full text-center text-gray-500 py-8">
                    No participants yet. Share this code with them:
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="text-2xl font-extrabold text-blue-dark tracking-widest">{selectedSession.code}</span>
                      <CopyButton text={selectedSession.code} />
                    </div>
                  </div>
                )}
                {participants.map(p => {
                  const myResps = responses.filter(r => r.participant_id === p.id && r.scoring_status === 'done');
                  const total = myResps.reduce((s, r) => s + (r.total_score ?? 0), 0);
                  const max = myResps.reduce((s, r) => s + (r.max_score ?? 0), 0);
                  const avg = max > 0 ? (total / max) * 5 : 0;
                  const pass = myResps.length > 0 && avg >= passThreshold;
                  return (
                    <button key={p.id}
                      onClick={() => { setSelectedParticipant(selectedParticipant === p.id ? null : p.id); setTab('responses'); }}
                      className={`card text-left transition-all hover:border-blue ${selectedParticipant === p.id ? 'border-blue bg-blue-light' : ''}`}>
                      <div className="font-bold text-xs text-gray-800 truncate">{p.name}</div>
                      {p.email && <div className="text-xs text-gray-400 truncate">{p.email}</div>}
                      <div className={`text-xs font-bold mt-1 ${p.status === 'submitted' ? 'text-green' : 'text-blue'}`}>
                        {p.status === 'submitted' ? '✓ Submitted' : '● In progress'}
                      </div>
                      {myResps.length > 0 && (
                        <div className={`text-xs font-bold mt-1 ${pass ? 'text-green' : 'text-red'}`}>
                          {pass ? 'PASS' : 'NEEDS WORK'} · {avg.toFixed(1)}/5
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {tab === 'responses' && (
              <>
                {selectedParticipant && (
                  <button onClick={() => setSelectedParticipant(null)} className="text-xs text-blue mb-3 flex items-center gap-1">
                    <X className="w-3 h-3" />Clear filter: {participants.find(p => p.id === selectedParticipant)?.name}
                  </button>
                )}
                {displayedResponses.length === 0 && <div className="text-center text-gray-500 py-8">No responses yet.</div>}
                {displayedResponses.map(r => (
                  <div key={r.id} className="card mb-4">
                    <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm">{participants.find(p => p.id === r.participant_id)?.name}</strong>
                        <FrameworkBadge fw={r.framework_acronym} />
                        {r.ai_flag && <span className="chip-miss">AI flag</span>}
                      </div>
                      <div className="flex gap-2 items-center">
                        {r.scoring_status === 'done' && (
                          <span className="bg-blue text-white text-xs font-extrabold px-3 py-1 rounded-full">{r.total_score}/{r.max_score}</span>
                        )}
                        <button onClick={() => setProjecting(r)}
                          className="text-xs font-bold text-blue border border-blue px-3 py-1 rounded-lg hover:bg-blue-light">
                          Project
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-2"><strong>Scenario:</strong> {(r.scenarios as { scenario_text?: string })?.scenario_text}</p>
                    <p className="text-sm whitespace-pre-wrap text-gray-700">{r.answer_text}</p>
                    {r.missed_elements && r.missed_elements.length > 0 && (
                      <div className="bg-red-light border border-red-200 text-red text-xs rounded-lg px-3 py-2 mt-2">
                        Missing: {r.missed_elements.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* PROJECTION PANEL */}
      {projecting && (
        <div className="fixed inset-0 bg-blue-dark text-white z-50 overflow-y-auto p-8">
          <div className="flex justify-between items-center mb-6 text-sm text-white/60">
            <span>Projection view — share your screen</span>
            <button onClick={() => setProjecting(null)} className="bg-white/15 border border-white/30 px-4 py-2 rounded-lg text-white text-xs font-semibold">Close</button>
          </div>
          <div className="text-2xl font-extrabold mb-1">{participants.find(p => p.id === projecting.participant_id)?.name}</div>
          <div className="text-sm text-white/60 mb-4">{projecting.framework_acronym} · {(projecting.scenarios as { scenario_text?: string })?.scenario_text}</div>
          <div className="bg-white/8 rounded-xl p-5 text-base leading-relaxed whitespace-pre-wrap mb-5">{projecting.answer_text}</div>
          {projecting.element_scores && (
            <div className="flex flex-col gap-2">
              {Object.entries(projecting.element_scores).map(([el, data]) => (
                <div key={el} className="flex justify-between bg-white/6 rounded-lg px-4 py-3 text-sm">
                  <span>{el}</span><span>{data.score >= 3 ? '✓' : '✗'} {data.note}</span>
                </div>
              ))}
              <div className="flex justify-between bg-white/6 rounded-lg px-4 py-3 text-sm font-bold">
                <span>Total</span><span>{projecting.total_score} / {projecting.max_score}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE SESSION MODAL */}
      {showCreateSession && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

            {/* SUCCESS STATE — show code prominently */}
            {createdSession ? (
              <div className="text-center py-4">
                <div className="text-green text-4xl mb-3">✓</div>
                <h3 className="font-extrabold text-blue-dark text-lg mb-1">Session Created!</h3>
                <p className="text-sm text-gray-500 mb-4">{createdSession.name}</p>
                <div className="bg-blue-light border-2 border-blue rounded-xl p-5 mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Share this code with participants</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-4xl font-extrabold text-blue-dark tracking-widest">{createdSession.code}</span>
                    <CopyButton text={createdSession.code} />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">at bft-prompt-quiz.vercel.app</p>
                </div>
                <button className="btn-primary" onClick={() => { setShowCreateSession(false); setCreatedSession(null); }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-blue-dark text-lg">New Session</h3>
                  <button onClick={() => setShowCreateSession(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                <div className="mb-3">
                  <label className="label">Session name</label>
                  <input className="input-field" placeholder="e.g. WARIF Staff Training — July 2026"
                    value={newSession.name} onChange={e => setNewSession(s => ({ ...s, name: e.target.value }))} />
                </div>

                <div className="mb-3">
                  <label className="label">Industry</label>
                  <select className="input-field" value={newSession.industry_id}
                    onChange={e => setNewSession(s => ({ ...s, industry_id: e.target.value }))}>
                    <option value="">Select industry...</option>
                    {industries.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="label">Frameworks to test</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {frameworks.map(fw => (
                      <button key={fw.id} type="button"
                        onClick={() => setNewSession(s => ({
                          ...s,
                          framework_ids: s.framework_ids.includes(fw.id)
                            ? s.framework_ids.filter(id => id !== fw.id)
                            : [...s.framework_ids, fw.id]
                        }))}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all ${newSession.framework_ids.includes(fw.id) ? 'bg-blue text-white border-blue' : 'border-gray-200 text-gray-600 hover:border-blue'}`}>
                        {fw.acronym}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="label">Pass threshold (/5)</label>
                    <input className="input-field" type="number" min="1" max="5" step="0.5"
                      value={newSession.pass_threshold}
                      onChange={e => setNewSession(s => ({ ...s, pass_threshold: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="label">MCQ count</label>
                    <input className="input-field" type="number" min="4" max="15"
                      value={newSession.mcq_count}
                      onChange={e => setNewSession(s => ({ ...s, mcq_count: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="label">Scenarios/framework</label>
                    <input className="input-field" type="number" min="1" max="4"
                      value={newSession.scenarios_per_framework}
                      onChange={e => setNewSession(s => ({ ...s, scenarios_per_framework: Number(e.target.value) }))} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="label">Session date (optional)</label>
                  <input className="input-field" type="date" value={newSession.session_date}
                    onChange={e => setNewSession(s => ({ ...s, session_date: e.target.value }))} />
                </div>

                <div className="flex items-center gap-2 mb-5">
                  <input type="checkbox" id="req-email" checked={newSession.require_email}
                    onChange={e => setNewSession(s => ({ ...s, require_email: e.target.checked }))}
                    className="accent-blue w-4 h-4" />
                  <label htmlFor="req-email" className="text-sm text-gray-700">
                    Require participants to enter their email address
                  </label>
                </div>

                <button className="btn-primary"
                  onClick={createSession}
                  disabled={creating || !newSession.name || !newSession.industry_id || newSession.framework_ids.length === 0}>
                  {creating ? <><div className="spinner" />Creating...</> : 'Create Session'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
