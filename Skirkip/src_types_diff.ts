--- src/types.ts (原始)


+++ src/types.ts (修改后)
export type Screen = 'resume' | 'teams-count' | 'teams-setup' | 'questions' | 'ready' | 'countdown' | 'game' | 'winner';

export interface Team {
  id: number;
  name: string;
  color: string;
  avatar: string;
  score: number;
  lives: number;
  eliminated: boolean;
  answering: boolean;
}

export interface Question {
  id: string;
  text: string;
  answer: string;
  order: number;
}

export interface HistoryEntry {
  type: 'correct' | 'wrong' | 'lifeLost' | 'lifeRestored';
  teamId: number;
  timestamp: number;
  scoreDelta?: number;
  livesDelta?: number;
}

export interface Settings {
  sound: boolean;
  music: boolean;
  shuffleQuestions: boolean;
  autoLifeLoss: boolean;
  timerEnabled: boolean;
  timerSeconds: number;
}

export interface GameState {
  screen: Screen;
  teams: Team[];
  questions: Question[];
  currentQuestionIndex: number;
  settings: Settings;
  history: HistoryEntry[];
  showAnswer: boolean;
  activeTeam: number | null;
}

export const TEAM_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a'
];

export const AVATARS = ['🐱', '🐶', '🦉', '🦊', '🐼', '🐰', '🦁', '🐸', '🦄', '🐧'];

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  music: false,
  shuffleQuestions: false,
  autoLifeLoss: false,
  timerEnabled: false,
  timerSeconds: 30,
};
