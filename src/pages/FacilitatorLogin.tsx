import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function FacilitatorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) {
      setError('Incorrect email or password.');
      setLoading(false);
      return;
    }
    navigate('/facilitator/dashboard');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] p-4">
      <div className="card w-full max-w-md">
        <div className="eyebrow">Facilitator</div>
        <h2 className="text-xl font-extrabold text-blue-dark mb-1">Sign in</h2>
        <p className="text-sm text-gray-500 mb-5">BFT facilitator accounts are created by your administrator.</p>

        <div className="mb-4">
          <label className="label">Email</label>
          <input className="input-field" type="email" placeholder="you@bftconsulting.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="label">Password</label>
          <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>

        {error && (
          <div className="bg-red-light border border-red-200 text-red text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        <button className="btn-primary mb-3" onClick={handleLogin} disabled={loading}>
          {loading ? <><div className="spinner" />Signing in...</> : 'Sign In'}
        </button>
        <button className="btn-ghost" onClick={() => navigate('/')}>Back</button>
      </div>
    </div>
  );
}
