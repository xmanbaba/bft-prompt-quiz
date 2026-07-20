export interface Industry {
  id: string;
  name: string;
  slug: string;
}

export interface Framework {
  id: string;
  acronym: string;
  full_name: string;
  vendor: string;
  tier: 'core' | 'advanced';
}

export interface FrameworkElement {
  id: string;
  framework_id: string;
  position: number;
  name: string;
  scoring_guidance: string;
}

export interface MCQQuestion {
  id: string;
  framework_id: string | null;
  question: string;
  options: string[];
  difficulty: 'standard' | 'advanced';
}

export interface Scenario {
  id: string;
  industry_id: string;
  framework_id: string;
  category: string;
  title: string;
  scenario_text: string;
  framework_acronym?: string;
}

export interface Session {
  id: string;
  code: string;
  name: string;
  industry_id: string;
  pass_threshold: number;
  mcq_count: number;
  scenarios_per_framework: number;
  require_email: boolean;
  status: string;
  industry?: Industry;
}

export interface Participant {
  id: string;
  session_id: string;
  name: string;
  email?: string;
  status: 'in_progress' | 'submitted';
  joined_at: string;
  submitted_at?: string;
}

export interface MCQAttempt {
  score: number;
  total: number;
  results: Record<string, { correct: boolean; correct_index: number; explanation: string }>;
}

export interface ElementScore {
  score: number;
  note: string;
}

export interface Response {
  id: string;
  participant_id: string;
  scenario_id: string;
  framework_acronym: string;
  answer_text: string;
  scoring_status: 'pending' | 'scoring' | 'done' | 'error';
  element_scores: Record<string, ElementScore> | null;
  total_score: number | null;
  max_score: number | null;
  missed_elements: string[] | null;
  authenticity_score: number | null;
  ai_flag: boolean;
  rationale: string | null;
  scenarios?: { title: string; category: string; scenario_text: string };
}
