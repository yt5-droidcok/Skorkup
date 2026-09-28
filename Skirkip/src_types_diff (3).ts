--- src/types.ts (原始)
export type Screen = 'resume' | 'teams-count' | 'teams-setup' | 'program' | 'questions' | 'ready' | 'countdown' | 'game' | 'winner' | 'certificate';

export type QuestionType = 'text' | 'image' | 'audio';
export type RoundTheme = 1 | 2 | 3;
export type CharacterMood = 'normal' | 'happy' | 'sad' | 'surprised' | 'sleepy' | 'excited' | 'thinking';

export interface Team {
  id: number;
  name: string;
  color: string;
  avatar: string;
  score: number;
  lives: number;
  eliminated: boolean;
  answering: boolean;
  combo: number;
  maxCombo: number;
  mood: CharacterMood;
  powerups: PowerupType[];
  activePowerup: PowerupType | null;
  shieldActive: boolean;
  doubleNext: boolean;
  correctStreak: number;
  totalCorrect: number;
  totalWrong: number;
}

export type PowerupType = 'shield' | 'sabotage' | 'hint' | 'double';

export interface Powerup {
  type: PowerupType;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

export const POWERUPS: Record<PowerupType, Powerup> = {
  shield: { type: 'shield', name: 'Perisai', emoji: '🛡️', description: 'Lindungi nyawa dari 1 jawaban salah', color: '#3498db' },
  sabotage: { type: 'sabotage', name: 'Sabotase', emoji: '✖️', description: 'Kurangi 10 poin tim lawan', color: '#e74c3c' },
  hint: { type: 'hint', name: 'Bocoran', emoji: '🔮', description: 'Lihat huruf pertama jawaban', color: '#9b59b6' },
  double: { type: 'double', name: 'Poin Ganda', emoji: '💎', description: 'Jawaban benar berikutnya = 2x poin', color: '#f5c542' },
};

export interface Question {
  id: string;
  text: string;
  answer: string;
  order: number;
  type: QuestionType;
  imageData?: string;
  audioData?: string;
  round: RoundTheme;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface HistoryEntry {
  type: 'correct' | 'wrong' | 'lifeLost' | 'lifeRestored' | 'powerup' | 'combo';
  teamId: number;
  timestamp: number;
  scoreDelta?: number;
  livesDelta?: number;
  detail?: string;
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earnedBy?: number;
}

export const BADGES: Badge[] = [
  { id: 'debut', name: 'Debut Panggung', emoji: '🌟', description: 'Main pertama kali' },
  { id: 'streak', name: 'Streak Master', emoji: '🔥', description: 'Combo 3x berturut-turut' },
  { id: 'perfect', name: 'Otak Cemerlang', emoji: '🧠', description: 'Jawab semua soal benar' },
  { id: 'survivor', name: 'Pantang Menyerah', emoji: '💪', description: 'Masih punya nyawa di akhir' },
  { id: 'champion', name: 'Bintang Panggung', emoji: '👑', description: 'Juara 1' },
  { id: 'supporter', name: 'Aktor Pendukung', emoji: '🎭', description: 'Juara 2' },
  { id: 'rising', name: 'Pendatang Baru', emoji: '🌱', description: 'Juara 3' },
];

export interface Settings {
  shuffleQuestions: boolean;
  autoLifeLoss: boolean;
  timerEnabled: boolean;
  timerSeconds: number;
  powerupsEnabled: boolean;
  roundsEnabled: boolean;
}

export const TEAM_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a'
];

export const AVATARS = ['🐱', '🐶', '🦉', '🦊', '🐼', '🐰', '🦁', '🐸', '🦄', '🐧'];

export const MOOD_EMOJIS: Record<string, Record<CharacterMood, string>> = {
  '🐱': { normal: '🐱', happy: '😺', sad: '😿', surprised: '🙀', sleepy: '😴', excited: '😸', thinking: '🐱' },
  '🐶': { normal: '🐶', happy: '🐶', sad: '🐕', surprised: '🐕', sleepy: '🐶', excited: '🐕', thinking: '🐶' },
  '🦉': { normal: '🦉', happy: '🦉', sad: '🦉', surprised: '🦉', sleepy: '🦉', excited: '🦉', thinking: '🦉' },
  '🦊': { normal: '🦊', happy: '🦊', sad: '🦊', surprised: '🦊', sleepy: '🦊', excited: '🦊', thinking: '🦊' },
  '🐼': { normal: '🐼', happy: '🐼', sad: '🐼', surprised: '🐼', sleepy: '🐼', excited: '🐼', thinking: '🐼' },
  '🐰': { normal: '🐰', happy: '🐰', sad: '🐰', surprised: '🐰', sleepy: '🐰', excited: '🐰', thinking: '🐰' },
  '🦁': { normal: '🦁', happy: '🦁', sad: '🦁', surprised: '🦁', sleepy: '🦁', excited: '🦁', thinking: '🦁' },
  '🐸': { normal: '🐸', happy: '🐸', sad: '🐸', surprised: '🐸', sleepy: '🐸', excited: '🐸', thinking: '🐸' },
  '🦄': { normal: '🦄', happy: '🦄', sad: '🦄', surprised: '🦄', sleepy: '🦄', excited: '🦄', thinking: '🦄' },
  '🐧': { normal: '🐧', happy: '🐧', sad: '🐧', surprised: '🐧', sleepy: '🐧', excited: '🐧', thinking: '🐧' },
};

export const DEFAULT_SETTINGS: Settings = {
  shuffleQuestions: false,
  autoLifeLoss: false,
  timerEnabled: false,
  timerSeconds: 30,
  powerupsEnabled: true,
  roundsEnabled: true,
};

export const ROUND_THEMES = {
  1: { name: 'Pembuka', subtitle: 'Aksi Dimulai!', color: '#f39c12' },
  2: { name: 'Konflik', subtitle: 'Semakin Seru!', color: '#9b59b6' },
  3: { name: 'Final Showdown', subtitle: 'Panggung Emas!', color: '#f5c542' },
};

export const CHAMPION_TITLES = ['👑 Bintang Panggung', '🎭 Aktor Pendukung Terbaik', '🌱 Pendatang Baru Promising'];


+++ src/types.ts (修改后)
export type Screen = 'resume' | 'teams-count' | 'teams-setup' | 'program' | 'questions' | 'ready' | 'countdown' | 'game' | 'winner' | 'certificate';

export type QuestionType = 'text' | 'image';
export type RoundTheme = 1 | 2 | 3;
export type CharacterMood = 'normal' | 'happy' | 'sad' | 'surprised' | 'sleepy' | 'excited' | 'thinking';

export interface Team {
  id: number;
  name: string;
  color: string;
  avatar: string;
  score: number;
  lives: number;
  eliminated: boolean;
  answering: boolean;
  combo: number;
  maxCombo: number;
  mood: CharacterMood;
  powerups: PowerupType[];
  activePowerup: PowerupType | null;
  shieldActive: boolean;
  doubleNext: boolean;
  correctStreak: number;
  totalCorrect: number;
  totalWrong: number;
}

export type PowerupType = 'shield' | 'sabotage' | 'hint' | 'double';

export interface Powerup {
  type: PowerupType;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

export const POWERUPS: Record<PowerupType, Powerup> = {
  shield: { type: 'shield', name: 'Perisai', emoji: '🛡️', description: 'Lindungi nyawa dari 1 jawaban salah', color: '#3498db' },
  sabotage: { type: 'sabotage', name: 'Sabotase', emoji: '✖️', description: 'Kurangi 10 poin tim lawan', color: '#e74c3c' },
  hint: { type: 'hint', name: 'Bocoran', emoji: '🔮', description: 'Lihat huruf pertama jawaban', color: '#9b59b6' },
  double: { type: 'double', name: 'Poin Ganda', emoji: '💎', description: 'Jawaban benar berikutnya = 2x poin', color: '#f5c542' },
};

export interface Question {
  id: string;
  text: string;
  answer: string;
  order: number;
  type: QuestionType;
  imageData?: string;
  audioData?: string;
  round: RoundTheme;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface HistoryEntry {
  type: 'correct' | 'wrong' | 'lifeLost' | 'lifeRestored' | 'powerup' | 'combo';
  teamId: number;
  timestamp: number;
  scoreDelta?: number;
  livesDelta?: number;
  detail?: string;
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earnedBy?: number;
}

export const BADGES: Badge[] = [
  { id: 'debut', name: 'Debut Panggung', emoji: '🌟', description: 'Main pertama kali' },
  { id: 'streak', name: 'Streak Master', emoji: '🔥', description: 'Combo 3x berturut-turut' },
  { id: 'perfect', name: 'Otak Cemerlang', emoji: '🧠', description: 'Jawab semua soal benar' },
  { id: 'survivor', name: 'Pantang Menyerah', emoji: '💪', description: 'Masih punya nyawa di akhir' },
  { id: 'champion', name: 'Bintang Panggung', emoji: '👑', description: 'Juara 1' },
  { id: 'supporter', name: 'Aktor Pendukung', emoji: '🎭', description: 'Juara 2' },
  { id: 'rising', name: 'Pendatang Baru', emoji: '🌱', description: 'Juara 3' },
];

export interface Settings {
  sound: boolean;
  shuffleQuestions: boolean;
  autoLifeLoss: boolean;
  timerEnabled: boolean;
  timerSeconds: number;
  powerupsEnabled: boolean;
  roundsEnabled: boolean;
}

export const TEAM_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a'
];

export const AVATARS = ['🐱', '🐶', '🦉', '🦊', '🐼', '🐰', '🦁', '🐸', '🦄', '🐧'];

export const MOOD_EMOJIS: Record<string, Record<CharacterMood, string>> = {
  '🐱': { normal: '🐱', happy: '😺', sad: '😿', surprised: '🙀', sleepy: '😴', excited: '😸', thinking: '🐱' },
  '🐶': { normal: '🐶', happy: '🐶', sad: '🐕', surprised: '🐕', sleepy: '🐶', excited: '🐕', thinking: '🐶' },
  '🦉': { normal: '🦉', happy: '🦉', sad: '🦉', surprised: '🦉', sleepy: '🦉', excited: '🦉', thinking: '🦉' },
  '🦊': { normal: '🦊', happy: '🦊', sad: '🦊', surprised: '🦊', sleepy: '🦊', excited: '🦊', thinking: '🦊' },
  '🐼': { normal: '🐼', happy: '🐼', sad: '🐼', surprised: '🐼', sleepy: '🐼', excited: '🐼', thinking: '🐼' },
  '🐰': { normal: '🐰', happy: '🐰', sad: '🐰', surprised: '🐰', sleepy: '🐰', excited: '🐰', thinking: '🐰' },
  '🦁': { normal: '🦁', happy: '🦁', sad: '🦁', surprised: '🦁', sleepy: '🦁', excited: '🦁', thinking: '🦁' },
  '🐸': { normal: '🐸', happy: '🐸', sad: '🐸', surprised: '🐸', sleepy: '🐸', excited: '🐸', thinking: '🐸' },
  '🦄': { normal: '🦄', happy: '🦄', sad: '🦄', surprised: '🦄', sleepy: '🦄', excited: '🦄', thinking: '🦄' },
  '🐧': { normal: '🐧', happy: '🐧', sad: '🐧', surprised: '🐧', sleepy: '🐧', excited: '🐧', thinking: '🐧' },
};

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  shuffleQuestions: false,
  autoLifeLoss: false,
  timerEnabled: false,
  timerSeconds: 30,
  powerupsEnabled: true,
  roundsEnabled: true,
};

export const ROUND_THEMES = {
  1: { name: 'Pembuka', subtitle: 'Aksi Dimulai!', color: '#f39c12' },
  2: { name: 'Konflik', subtitle: 'Semakin Seru!', color: '#9b59b6' },
  3: { name: 'Final Showdown', subtitle: 'Panggung Emas!', color: '#f5c542' },
};

export const CHAMPION_TITLES = ['👑 Bintang Panggung', '🎭 Aktor Pendukung Terbaik', '🌱 Pendatang Baru Promising'];
