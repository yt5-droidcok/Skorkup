--- src/types.ts (原始)
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


+++ src/types.ts (修改后)
export type Screen = 'resume' | 'teams-count' | 'teams-setup' | 'program' | 'questions' | 'ready' | 'countdown' | 'game' | 'intermission' | 'winner' | 'certificate';

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
  imageData?: string; // emoji or image URL
  audioData?: string; // description of sound
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
  earnedBy?: number; // team id
}

export const BADGES: Badge[] = [
  { id: 'debut', name: 'Debut Panggung', emoji: '🌟', description: 'Main pertama kali' },
  { id: 'streak', name: 'Streak Master', emoji: '🔥', description: 'Combo 3x berturut-turut' },
  { id: 'perfect', name: 'Otak Cemerlang', emoji: '🧠', description: 'Jawab semua soal benar' },
  { id: 'survivor', name: 'Pantang Menyerah', emoji: '💪', description: 'Masih punya nyawa di akhir' },
  { id: 'champion', name: 'Bintang Panggung', emoji: '👑', description: 'Juara 1' },
  { id: 'supporter', name: 'Aktor Pendukung', emoji: '🎭', description: 'Juara 2' },
  { id: 'rising', name: 'Pendatang Baru', emoji: '🌱', description: 'Juara 3' },
  { id: 'speed', name: 'Kilat Berpikir', emoji: '⚡', description: 'Jawab benar di Speed Round' },
];

export interface Settings {
  sound: boolean;
  music: boolean;
  shuffleQuestions: boolean;
  autoLifeLoss: boolean;
  timerEnabled: boolean;
  timerSeconds: number;
  narratorEnabled: boolean;
  mcEnabled: boolean;
  powerupsEnabled: boolean;
  roundsEnabled: boolean;
}

export interface GameState {
  screen: Screen;
  teams: Team[];
  questions: Question[];
  currentQuestionIndex: number;
  currentRound: RoundTheme;
  settings: Settings;
  history: HistoryEntry[];
  showAnswer: boolean;
  activeTeam: number | null;
  badges: Badge[];
  mcMessage: string | null;
  speedRound: boolean;
}

export const TEAM_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a'
];

export const AVATARS = ['🐱', '🐶', '🦉', '🦊', '🐼', '🐰', '🦁', '🐸', '🦄', '🐧'];

// Mood emoji mapping per avatar
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
  music: false,
  shuffleQuestions: false,
  autoLifeLoss: false,
  timerEnabled: false,
  timerSeconds: 30,
  narratorEnabled: true,
  mcEnabled: true,
  powerupsEnabled: true,
  roundsEnabled: true,
};

// Round themes
export const ROUND_THEMES = {
  1: { name: 'Pembuka', subtitle: 'Aksi Dimulai!', color: '#f39c12', bgGradient: 'from-amber-900/40 via-orange-900/30 to-red-900/40', jingle: 'cheerful' },
  2: { name: 'Konflik', subtitle: 'Semakin Seru!', color: '#9b59b6', bgGradient: 'from-purple-900/40 via-indigo-900/30 to-blue-900/40', jingle: 'tense' },
  3: { name: 'Final Showdown', subtitle: 'Panggung Emas!', color: '#f5c542', bgGradient: 'from-yellow-900/40 via-amber-900/30 to-orange-900/40', jingle: 'epic' },
};

// Champion titles
export const CHAMPION_TITLES = ['👑 Bintang Panggung', '🎭 Aktor Pendukung Terbaik', '🌱 Pendatang Baru Promising'];

// MC Messages
export const MC_MESSAGES = {
  gameStart: [
    'Selamat datang di Quiz Theater! 🎭',
    'Penonton sudah siap! Mari kita mulai! 🎬',
    'Panggung sudah siap, pemain sudah siap!',
  ],
  correct: [
    'Bravo! Jawaban yang cemerlang! 🌟',
    'Luar biasa! Otak yang tajam! 🧠',
    'Tepat sekali! Penonton bersorak! 👏',
    'Hebat! Kamu memang bintang! ⭐',
  ],
  wrong: [
    'Sayang sekali, coba lagi nanti! 💪',
    'Tidak apa-apa, masih ada kesempatan! 🎭',
    'Wah, meleset! Tetap semangat! ✨',
  ],
  combo: [
    'COMBO! Beruntun! Penonton berdiri! 🎉',
    'MEGA COMBO! Standing ovation! 👏👏👏',
    'LUAR BIASA! Tidak terkalahkan! 🔥',
  ],
  roundStart: [
    'Adegan baru dimulai! Siap-siap! 🎬',
    'Babak baru! Tantangan meningkat! 📈',
    'Panggung berubah, semangat tetap menyala! ✨',
  ],
  lowScore: [
    'Jangan menyerah! Comeback menanti! 💪',
    'Masih ada waktu untuk berbalik! ⏰',
    'Semangat! Panggung milikmu! 🎭',
  ],
  powerup: [
    'Power-up aktif! Strategi cerdas! 🎯',
    'Kartu spesial dimainkan! Menarik! 🃏',
    'Wow, langkah yang berani! 🎲',
  ],
  finalRound: [
    'FINAL SHOWDOWN! Ini saatnya! 🏆',
    'Panggung emas! Hanya yang terbaik! ✨',
    'Momen penentuan! Semua mata tertuju! 👀',
  ],
};
