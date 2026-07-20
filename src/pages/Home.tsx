import { useNavigate } from 'react-router-dom';
import { Users, Shield } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] p-4">
      <div className="card w-full max-w-md">
        <div className="eyebrow">CRAFT · GCSE · PTCF · CRISPE</div>
        <h1 className="text-2xl font-extrabold text-blue-dark mb-1">AI Prompting Quiz</h1>
        <p className="text-sm text-gray-600 mb-6">
          Benchmark your AI prompt-writing skills against the frameworks taught in your BFT training session.
        </p>
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => navigate('/join')}
            className="flex items-center gap-4 border-2 border-gray-200 rounded-xl p-4 bg-white hover:border-blue hover:bg-blue-light transition-all text-left"
          >
            <div className="text-3xl"><Users className="w-8 h-8 text-blue" /></div>
            <div>
              <div className="font-bold text-blue-dark text-sm">I'm a Participant</div>
              <div className="text-xs text-gray-500 mt-0.5">Join with your name and the session code</div>
            </div>
          </button>
          <button
            onClick={() => navigate('/facilitator')}
            className="flex items-center gap-4 border-2 border-gray-200 rounded-xl p-4 bg-white hover:border-blue hover:bg-blue-light transition-all text-left"
          >
            <div className="text-3xl"><Shield className="w-8 h-8 text-blue" /></div>
            <div>
              <div className="font-bold text-blue-dark text-sm">I'm the Facilitator</div>
              <div className="text-xs text-gray-500 mt-0.5">Sign in to manage sessions and view results</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
