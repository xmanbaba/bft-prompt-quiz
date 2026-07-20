import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ParticipantJoin from './pages/ParticipantJoin';
import MCQRound from './pages/MCQRound';
import PracticalRound from './pages/PracticalRound';
import Scoring from './pages/Scoring';
import Result from './pages/Result';
import FacilitatorLogin from './pages/FacilitatorLogin';
import FacilitatorDashboard from './pages/FacilitatorDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <div className="w-full text-center py-3 border-b border-blue-mid bg-white">
          <span className="font-bold text-blue-dark text-sm">
            BFT Consulting <span className="text-red">×</span> AI Prompting Quiz
          </span>
        </div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join" element={<ParticipantJoin />} />
          <Route path="/mcq" element={<MCQRound />} />
          <Route path="/practical" element={<PracticalRound />} />
          <Route path="/scoring" element={<Scoring />} />
          <Route path="/result" element={<Result />} />
          <Route path="/facilitator" element={<FacilitatorLogin />} />
          <Route path="/facilitator/dashboard" element={<FacilitatorDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
