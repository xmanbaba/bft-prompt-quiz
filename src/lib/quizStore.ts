// Simple in-memory quiz state — persists across route navigations in the same tab
export interface QuizState {
  participantId: string | null;
  participantName: string | null;
  sessionId: string | null;
  sessionCode: string | null;
  session: import('../types').Session | null;
  mcqQuestions: import('../types').MCQQuestion[];
  mcqAnswers: Record<string, number>;
  mcqResult: { score: number; total: number; results: Record<string, { correct: boolean; correct_index: number; explanation: string }> } | null;
  scenarios: import('../types').Scenario[];
  practicalAnswers: Record<string, string>;
  currentScenarioIndex: number;
  responseIds: string[];
}

const defaultState: QuizState = {
  participantId: null,
  participantName: null,
  sessionId: null,
  sessionCode: null,
  session: null,
  mcqQuestions: [],
  mcqAnswers: {},
  mcqResult: null,
  scenarios: [],
  practicalAnswers: {},
  currentScenarioIndex: 0,
  responseIds: [],
};

let state: QuizState = { ...defaultState };

export const quizStore = {
  get: () => state,
  set: (updates: Partial<QuizState>) => { state = { ...state, ...updates }; },
  reset: () => { state = { ...defaultState }; },
};
