--- src/App.tsx (原始)
export default function App() {
  return (
    <div/>
  );
}


+++ src/App.tsx (修改后)
import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Screen, Team, Question, HistoryEntry, Settings,
  TEAM_COLORS, AVATARS, DEFAULT_SETTINGS
} from './types';
import * as audio from './audio';

// ===== LOCALSTORAGE HELPERS =====
const STORAGE_KEY = 'quiz-theater-state';

function saveState(state: Partial<any>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* silent */ }
}

function loadState(): any {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* silent */ }
}

// ===== TOAST COMPONENT =====
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] toast-enter">
      <div className="bg-[#333] text-white px-6 py-3 rounded-xl shadow-2xl text-lg font-bold">
        {message}
      </div>
    </div>
  );
}

// ===== CONFETTI HELPER =====
function fireConfetti(side: 'left' | 'right' | 'both') {
  const defaults = { spread: 70, ticks: 80, gravity: 0.8, decay: 0.94, startVelocity: 30, colors: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db', '#9b59b6'] };
  if (side === 'left' || side === 'both') {
    confetti({ ...defaults, particleCount: 60, angle: 60, origin: { x: 0, y: 0.7 } });
  }
  if (side === 'right' || side === 'both') {
    confetti({ ...defaults, particleCount: 60, angle: 120, origin: { x: 1, y: 0.7 } });
  }
}

function fireConfettiAt(x: number, y: number) {
  confetti({ particleCount: 30, spread: 50, origin: { x: x / window.innerWidth, y: y / window.innerHeight }, colors: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db'] });
}

// ===== MAIN APP =====
export default function App() {
  const [screen, setScreen] = useState<Screen>('teams-count');
  const [teams, setTeams] = useState<Team[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [activeTeam, setActiveTeam] = useState<number | null>(null);
  const [teamCount, setTeamCount] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [showLightning, setShowLightning] = useState<number | null>(null);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const [curtainOpen, setCurtainOpen] = useState(false);
  const [timerValue, setTimerValue] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [scoreAnim, setScoreAnim] = useState<number | null>(null);
  const [showResume, setShowResume] = useState(false);
  const [revealIndex, setRevealIndex] = useState(-1);
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [heartAnim, setHeartAnim] = useState<{teamId: number, idx: number} | null>(null);
  const [newQText, setNewQText] = useState('');
  const [newQAnswer, setNewQAnswer] = useState('');

  const timerRef = useRef<any>(null);
  const debounceRef = useRef<boolean>(false);

  // Check for saved state on mount
  useEffect(() => {
    const saved = loadState();
    if (saved && saved.screen && saved.screen !== 'teams-count') {
      setShowResume(true);
    }
  }, []);

  // Autosave on state changes
  useEffect(() => {
    if (screen === 'teams-count' && !showResume) return;
    saveState({ screen, teams, questions, currentQ, settings, history, showAnswer, teamCount });
  }, [screen, teams, questions, currentQ, settings, history, showAnswer, teamCount]);

  // Timer logic
  useEffect(() => {
    if (timerRunning && settings.timerEnabled) {
      timerRef.current = setInterval(() => {
        setTimerValue(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (settings.sound) audio.playTimerAlarm();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [timerRunning, settings.timerEnabled, settings.sound]);

  // Start timer when question changes
  useEffect(() => {
    if (settings.timerEnabled && screen === 'game') {
      setTimerValue(settings.timerSeconds);
      setTimerRunning(true);
    } else {
      setTimerRunning(false);
    }
  }, [currentQ, screen, settings.timerEnabled, settings.timerSeconds]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showHelp || showAllQuestions || showStats) {
        if (e.key === 'Escape') { setShowHelp(false); setShowAllQuestions(false); setShowStats(false); }
        return;
      }
      if (screen === 'game') {
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNextQuestion(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); goPrevQuestion(); }
        if (e.key === 'u' || e.key === 'U') handleUndo();
        if (e.key === 'm' || e.key === 'M') toggleSound();
        if (e.key === 'f' || e.key === 'F') toggleFullscreen();
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) {
          if (e.shiftKey) markWrong(num - 1);
          else markCorrect(num - 1);
        }
        if (e.key === '0' && teams.length === 10) {
          if (e.shiftKey) markWrong(9);
          else markCorrect(9);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, teams, currentQ, history, settings, showHelp, showAllQuestions, showStats]);

  // Music control
  useEffect(() => {
    if (settings.music && screen === 'game') audio.startMusic();
    else audio.stopMusic();
  }, [settings.music, screen]);

  // ===== GAME ACTIONS =====
  const showToast = (msg: string) => setToast(msg);

  const toggleSound = () => setSettings(s => ({ ...s, sound: !s.sound }));
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const handleUndo = () => {
    if (history.length === 0) { showToast('Tidak ada aksi untuk dibatalkan'); return; }
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setTeams(ts => ts.map(t => {
      if (t.id !== last.teamId) return t;
      let newT = { ...t };
      if (last.type === 'correct') newT.score -= (last.scoreDelta || 10);
      if (last.type === 'wrong') { /* no score change */ }
      if (last.type === 'lifeLost') { newT.lives = Math.min(3, newT.lives + 1); if (newT.lives > 0) newT.eliminated = false; }
      if (last.type === 'lifeRestored') { newT.lives = Math.max(0, newT.lives - 1); if (newT.lives === 0) newT.eliminated = true; }
      return newT;
    }));
    showToast('Aksi dibatalkan');
    if (settings.sound) audio.playPop();
  };

  const markCorrect = (teamIdx: number) => {
    if (debounceRef.current) return;
    debounceRef.current = true;
    setTimeout(() => debounceRef.current = false, 150);
    if (teamIdx >= teams.length) return;
    const team = teams[teamIdx];
    if (settings.sound) audio.playCorrect();
    fireConfetti('both');
    setScoreAnim(team.id);
    setTimeout(() => setScoreAnim(null), 400);
    setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, score: t.score + 10 } : t));
    setHistory(h => [...h, { type: 'correct', teamId: team.id, timestamp: Date.now(), scoreDelta: 10 }]);
  };

  const markWrong = (teamIdx: number) => {
    if (debounceRef.current) return;
    debounceRef.current = true;
    setTimeout(() => debounceRef.current = false, 150);
    if (teamIdx >= teams.length) return;
    const team = teams[teamIdx];
    if (settings.sound) audio.playWrong();
    setShowLightning(team.id);
    setShakeScreen(true);
    setTimeout(() => { setShowLightning(null); setShakeScreen(false); }, 800);
    setHistory(h => [...h, { type: 'wrong', teamId: team.id, timestamp: Date.now() }]);
    if (settings.autoLifeLoss) {
      loseLife(teamIdx);
    }
  };

  const loseLife = (teamIdx: number) => {
    const team = teams[teamIdx];
    if (team.lives <= 0) return;
    if (settings.sound) audio.playLifeLost();
    setHeartAnim({ teamId: team.id, idx: team.lives - 1 });
    setTimeout(() => setHeartAnim(null), 400);
    setTeams(ts => ts.map((t, i) => {
      if (i !== teamIdx) return t;
      const newLives = t.lives - 1;
      if (newLives <= 0) {
        setTimeout(() => { if (settings.sound) audio.playElimination(); }, 300);
        return { ...t, lives: 0, eliminated: true };
      }
      return { ...t, lives: newLives };
    }));
    setHistory(h => [...h, { type: 'lifeLost', teamId: team.id, timestamp: Date.now(), livesDelta: -1 }]);
  };

  const restoreLife = (teamIdx: number) => {
    const team = teams[teamIdx];
    if (team.lives >= 3) return;
    if (settings.sound) audio.playPop();
    setHeartAnim({ teamId: team.id, idx: team.lives });
    setTimeout(() => setHeartAnim(null), 400);
    setTeams(ts => ts.map((t, i) => {
      if (i !== teamIdx) return t;
      return { ...t, lives: t.lives + 1, eliminated: false };
    }));
    setHistory(h => [...h, { type: 'lifeRestored', teamId: team.id, timestamp: Date.now(), livesDelta: 1 }]);
  };

  const goNextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(c => c + 1);
      setShowAnswer(false);
      if (settings.sound) audio.playWhoosh();
    }
  };

  const goPrevQuestion = () => {
    if (currentQ > 0) {
      setCurrentQ(c => c - 1);
      setShowAnswer(false);
      if (settings.sound) audio.playWhoosh();
    }
  };

  // ===== RESUME =====
  const resumeGame = () => {
    const saved = loadState();
    if (saved) {
      setScreen(saved.screen || 'game');
      setTeams(saved.teams || []);
      setQuestions(saved.questions || []);
      setCurrentQ(saved.currentQuestionIndex || 0);
      setSettings(saved.settings || DEFAULT_SETTINGS);
      setHistory(saved.history || []);
      setShowAnswer(saved.showAnswer || false);
      setTeamCount(saved.teamCount || saved.teams?.length || 2);
    }
    setShowResume(false);
  };

  const startNewGame = () => {
    clearState();
    setScreen('teams-count');
    setTeams([]);
    setQuestions([]);
    setCurrentQ(0);
    setSettings({ ...DEFAULT_SETTINGS });
    setHistory([]);
    setShowAnswer(false);
    setTeamCount(0);
    setShowResume(false);
  };

  // ===== SCREEN RENDERERS =====

  // --- SCREEN 1: TEAM COUNT ---
  const renderTeamsCount = () => (
    <div className="w-full h-full flex flex-col items-center justify-center curtain-bg relative overflow-hidden">
      {/* String lights */}
      <div className="absolute top-0 left-0 right-0 h-8 flex justify-around items-center">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full" style={{
            backgroundColor: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db'][i % 4],
            animation: `twinkle ${1 + (i % 3) * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`,
            boxShadow: `0 0 8px ${['#f5c542', '#d42a2f', '#2ecc71', '#3498db'][i % 4]}`
          }} />
        ))}
      </div>

      <h1 className="font-display text-5xl md:text-7xl font-bold mb-2 gold-shimmer">🎭 QUIZ THEATER 🎭</h1>
      <p className="text-xl md:text-2xl text-[#ffe9a8] mb-8 font-semibold">Cerdas Cermat Panggung Kelas</p>
      <p className="text-2xl md:text-3xl text-white mb-6 font-bold">BERAPA TIM YANG AKAN BERMAIN?</p>

      <div className="flex flex-wrap justify-center gap-4 mb-8 max-w-3xl">
        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <button key={n} onClick={() => { setTeamCount(n); if (settings.sound) audio.playPop(); }}
            className={`theater-btn w-20 h-20 text-3xl font-bold rounded-2xl transition-all ${
              teamCount === n
                ? 'bg-[#f5c542] text-[#1a1210] border-[#d4a017] scale-110 shadow-[0_0_20px_rgba(245,197,66,0.5)]'
                : 'bg-[#3d0608] text-white hover:bg-[#5a0a0e]'
            }`}>
            {n}
          </button>
        ))}
      </div>

      <button onClick={() => { if (teamCount > 0) { setScreen('teams-setup'); if (settings.sound) audio.playPop(); } }}
        disabled={teamCount === 0}
        className={`theater-btn px-12 py-4 text-2xl font-bold rounded-2xl ${
          teamCount > 0 ? 'bg-[#f5c542] text-[#1a1210] marquee-btn gentle-pulse' : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        }`}>
        LANJUT →
      </button>
    </div>
  );

  // --- SCREEN 2: TEAM SETUP ---
  const renderTeamsSetup = () => (
    <div className="w-full h-full flex flex-col items-center p-4 md:p-6 curtain-bg relative overflow-auto">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-[#f5c542] mb-4">SUSUN TIMMU</h2>
      <div className="flex flex-wrap justify-center gap-4 mb-6 max-w-6xl">
        {Array.from({ length: teamCount }).map((_, idx) => {
          const team = teams[idx] || { id: idx, name: `Tim ${idx + 1}`, color: TEAM_COLORS[idx % TEAM_COLORS.length], avatar: AVATARS[idx % AVATARS.length], score: 0, lives: 3, eliminated: false, answering: false };
          return (
            <div key={idx} className="bg-[#2a1810] rounded-2xl p-4 w-48 md:w-56 border-4 flex flex-col items-center"
              style={{ borderColor: team.color }}>
              <div className="text-5xl mb-2">{team.avatar}</div>
              <div className="flex gap-2 mb-2">
                <button onClick={() => {
                  const newTeams = [...teams];
                  if (!newTeams[idx]) newTeams[idx] = { ...team };
                  const curIdx = AVATARS.indexOf(newTeams[idx].avatar);
                  newTeams[idx].avatar = AVATARS[(curIdx - 1 + AVATARS.length) % AVATARS.length];
                  setTeams(newTeams);
                  if (settings.sound) audio.playPop();
                }} className="theater-btn w-10 h-10 bg-[#3d0608] text-white text-lg">◀</button>
                <button onClick={() => {
                  const newTeams = [...teams];
                  if (!newTeams[idx]) newTeams[idx] = { ...team };
                  const curIdx = AVATARS.indexOf(newTeams[idx].avatar);
                  newTeams[idx].avatar = AVATARS[(curIdx + 1) % AVATARS.length];
                  setTeams(newTeams);
                  if (settings.sound) audio.playPop();
                }} className="theater-btn w-10 h-10 bg-[#3d0608] text-white text-lg">▶</button>
              </div>
              <input type="text" value={team.name} placeholder={`Tim ${idx + 1}`}
                onChange={e => {
                  const newTeams = [...teams];
                  if (!newTeams[idx]) newTeams[idx] = { ...team };
                  newTeams[idx].name = e.target.value || `Tim ${idx + 1}`;
                  setTeams(newTeams);
                }}
                className="w-full text-center bg-[#1a1210] text-white rounded-lg px-3 py-2 text-lg font-bold border-2 border-[#5c3a1e] focus:border-[#f5c542] outline-none" />
              <div className="flex flex-wrap gap-1 mt-2 justify-center">
                {TEAM_COLORS.map(color => (
                  <button key={color} onClick={() => {
                    const newTeams = [...teams];
                    if (!newTeams[idx]) newTeams[idx] = { ...team };
                    newTeams[idx].color = color;
                    setTeams(newTeams);
                    if (settings.sound) audio.playPop();
                  }} className={`w-7 h-7 rounded-full border-2 transition-transform ${team.color === color ? 'border-white scale-125' : 'border-transparent'}`}
                    style={{ backgroundColor: color }} />
                ))}
              </div>
              <div className="flex gap-1 mt-2">
                {[0, 1, 2].map(l => (
                  <span key={l} className="text-red-500 text-lg">♥</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4">
        <button onClick={() => { setScreen('teams-count'); if (settings.sound) audio.playPop(); }}
          className="theater-btn px-8 py-3 text-xl bg-[#3d0608] text-white">← Kembali</button>
        <button onClick={() => {
          // Ensure all teams are initialized
          const finalTeams = Array.from({ length: teamCount }).map((_, idx) =>
            teams[idx] || { id: idx, name: `Tim ${idx + 1}`, color: TEAM_COLORS[idx % TEAM_COLORS.length], avatar: AVATARS[idx % AVATARS.length], score: 0, lives: 3, eliminated: false, answering: false }
          );
          setTeams(finalTeams);
          setScreen('questions');
          if (settings.sound) audio.playPop();
        }} className="theater-btn px-8 py-3 text-xl bg-[#f5c542] text-[#1a1210]">Lanjut →</button>
      </div>
    </div>
  );

  // --- SCREEN 3: QUESTIONS INPUT ---
  const renderQuestions = () => (
    <div className="w-full h-full flex flex-col p-4 md:p-6 bg-[#1a1210] overflow-auto">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-[#f5c542] mb-4 text-center">TULIS SOALNYA</h2>

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        {!showBulkInput ? (
          <>
            <div className="mb-4">
              <textarea
                value={editingQuestion !== null ? questions[editingQuestion]?.text || '' : newQText}
                onChange={e => {
                  if (editingQuestion !== null) {
                    const newQs = [...questions];
                    newQs[editingQuestion] = { ...newQs[editingQuestion], text: e.target.value };
                    setQuestions(newQs);
                  } else {
                    setNewQText(e.target.value);
                  }
                }}
                placeholder="Tulis pertanyaan di sini..."
                className="w-full h-24 bg-[#2b3a2a] text-[#f5f5e8] rounded-xl p-4 text-lg border-4 border-[#8b5a2b] resize-none outline-none focus:border-[#f5c542]"
              />
              <input
                type="text"
                value={editingQuestion !== null ? questions[editingQuestion]?.answer || '' : newQAnswer}
                onChange={e => {
                  if (editingQuestion !== null) {
                    const newQs = [...questions];
                    newQs[editingQuestion] = { ...newQs[editingQuestion], answer: e.target.value };
                    setQuestions(newQs);
                  } else {
                    setNewQAnswer(e.target.value);
                  }
                }}
                placeholder="Jawaban (opsional, untuk pegangan guru)"
                className="w-full mt-2 bg-[#1a1210] text-[#ffe9a8] rounded-xl p-3 text-lg border-2 border-[#5c3a1e] outline-none focus:border-[#f5c542]"
              />
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {editingQuestion !== null ? (
                <button onClick={() => { setEditingQuestion(null); setNewQText(''); setNewQAnswer(''); if (settings.sound) audio.playPop(); }}
                  className="theater-btn px-6 py-3 bg-gray-600 text-white text-lg">Batal Edit</button>
              ) : (
                <button onClick={() => {
                  const text = newQText.trim();
                  if (!text) { showToast('Tulis soal terlebih dahulu'); return; }
                  const answer = newQAnswer.trim();
                  setQuestions(q => [...q, { id: Date.now().toString(), text, answer, order: q.length }]);
                  setNewQText('');
                  setNewQAnswer('');
                  if (settings.sound) audio.playPop();
                }} className="theater-btn px-6 py-3 bg-[#2ecc71] text-white text-lg">+ Tambah Soal</button>
              )}
              <button onClick={() => setShowBulkInput(true)}
                className="theater-btn px-6 py-3 bg-[#3498db] text-white text-lg">📋 Tempel Banyak</button>
              <button onClick={() => {
                const data = JSON.stringify(questions, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'bank-soal.json'; a.click();
                URL.revokeObjectURL(url);
                showToast('Bank soal diunduh!');
              }} className="theater-btn px-6 py-3 bg-[#9b59b6] text-white text-lg">⬇ Ekspor</button>
              <button onClick={() => {
                const input = document.createElement('input');
                input.type = 'file'; input.accept = '.json,.txt';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const content = ev.target?.result as string;
                      let imported: Question[];
                      if (file.name.endsWith('.json')) {
                        imported = JSON.parse(content);
                      } else {
                        imported = content.split('\n').filter(l => l.trim()).map((line, i) => {
                          const parts = line.split('|');
                          return { id: Date.now().toString() + i, text: parts[0].trim(), answer: (parts[1] || '').trim(), order: i };
                        });
                      }
                      setQuestions(qs => [...qs, ...imported.map((item, i) => ({ ...item, id: item.id || Date.now().toString() + i, order: qs.length + i }))]);
                      showToast(`${imported.length} soal diimpor!`);
                    } catch { showToast('Format file tidak valid'); }
                  };
                  reader.readAsText(file);
                };
                input.click();
              }} className="theater-btn px-6 py-3 bg-[#e67e22] text-white text-lg">⬆ Impor</button>
            </div>
          </>
        ) : (
          <div className="mb-4">
            <p className="text-[#ffe9a8] mb-2">Tempel soal (satu per baris). Format opsional: soal | jawaban</p>
            <textarea value={bulkInput} onChange={e => setBulkInput(e.target.value)}
              placeholder="Soal 1&#10;Soal 2 | Jawaban 2&#10;Soal 3 | Jawaban 3"
              className="w-full h-40 bg-[#2b3a2a] text-[#f5f5e8] rounded-xl p-4 text-lg border-4 border-[#8b5a2b] resize-none outline-none" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => {
                const lines = bulkInput.split('\n').filter(l => l.trim());
                const newQs = lines.map((line, i) => {
                  const parts = line.split('|');
                  return { id: Date.now().toString() + i, text: parts[0].trim(), answer: (parts[1] || '').trim(), order: questions.length + i };
                });
                setQuestions(q => [...q, ...newQs]);
                setBulkInput('');
                setShowBulkInput(false);
                showToast(`${newQs.length} soal ditambahkan!`);
                if (settings.sound) audio.playPop();
              }} className="theater-btn px-6 py-3 bg-[#2ecc71] text-white text-lg">✓ Tambahkan</button>
              <button onClick={() => { setShowBulkInput(false); setBulkInput(''); }}
                className="theater-btn px-6 py-3 bg-gray-600 text-white text-lg">Batal</button>
            </div>
          </div>
        )}

        {/* Question list */}
        <div className="flex-1 overflow-auto mb-4">
          {questions.length === 0 ? (
            <p className="text-center text-gray-400 text-xl py-8">Belum ada soal. Minimal 1 soal untuk mulai.</p>
          ) : (
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={q.id} className="flex items-center gap-2 bg-[#2a1810] rounded-xl p-3 border border-[#5c3a1e]">
                  <span className="text-[#f5c542] font-bold text-lg w-8">{i + 1}.</span>
                  <span className="flex-1 text-white text-lg truncate">{q.text}</span>
                  {q.answer && <span className="text-[#ffe9a8] text-sm">💡</span>}
                  <button onClick={() => { setEditingQuestion(i); if (settings.sound) audio.playPop(); }}
                    className="theater-btn w-10 h-10 bg-[#3498db] text-white text-sm">✎</button>
                  <button onClick={() => { setQuestions(qs => qs.filter((_, j) => j !== i)); if (settings.sound) audio.playPop(); }}
                    className="theater-btn w-10 h-10 bg-[#e74c3c] text-white text-sm">🗑</button>
                  <button onClick={() => {
                    if (i === 0) return;
                    const newQ = [...questions];
                    [newQ[i], newQ[i - 1]] = [newQ[i - 1], newQ[i]];
                    setQuestions(newQ);
                  }} className="theater-btn w-10 h-10 bg-[#5c3a1e] text-white text-sm" disabled={i === 0}>↑</button>
                  <button onClick={() => {
                    if (i === questions.length - 1) return;
                    const newQ = [...questions];
                    [newQ[i], newQ[i + 1]] = [newQ[i + 1], newQ[i]];
                    setQuestions(newQ);
                  }} className="theater-btn w-10 h-10 bg-[#5c3a1e] text-white text-sm" disabled={i === questions.length - 1}>↓</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="bg-[#2a1810] rounded-xl p-4 mb-4 border border-[#5c3a1e]">
          <h3 className="text-[#f5c542] font-bold text-lg mb-2">⚙️ Pengaturan Opsional</h3>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input type="checkbox" checked={settings.shuffleQuestions}
                onChange={e => setSettings(s => ({ ...s, shuffleQuestions: e.target.checked }))}
                className="w-5 h-5" />
              Acak urutan soal
            </label>
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input type="checkbox" checked={settings.timerEnabled}
                onChange={e => setSettings(s => ({ ...s, timerEnabled: e.target.checked }))}
                className="w-5 h-5" />
              Timer per soal
            </label>
            {settings.timerEnabled && (
              <select value={settings.timerSeconds} onChange={e => setSettings(s => ({ ...s, timerSeconds: parseInt(e.target.value) }))}
                className="bg-[#1a1210] text-white rounded-lg px-3 py-1 border border-[#5c3a1e]">
                <option value={15}>15 detik</option>
                <option value={30}>30 detik</option>
                <option value={60}>60 detik</option>
              </select>
            )}
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input type="checkbox" checked={settings.autoLifeLoss}
                onChange={e => setSettings(s => ({ ...s, autoLifeLoss: e.target.checked }))}
                className="w-5 h-5" />
              Nyawa berkurang saat salah
            </label>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button onClick={() => { setScreen('teams-setup'); if (settings.sound) audio.playPop(); }}
            className="theater-btn px-8 py-3 text-xl bg-[#3d0608] text-white">← Kembali</button>
          <button onClick={() => {
            if (questions.length === 0) { showToast('Minimal 1 soal!'); return; }
            if (settings.shuffleQuestions) {
              setQuestions(q => [...q].sort(() => Math.random() - 0.5));
            }
            setScreen('ready');
            if (settings.sound) audio.playPop();
          }} disabled={questions.length === 0}
            className={`theater-btn px-8 py-3 text-xl ${questions.length > 0 ? 'bg-[#f5c542] text-[#1a1210]' : 'bg-gray-600 text-gray-400'}`}>
            Lanjut →
          </button>
        </div>
      </div>
    </div>
  );

  // --- SCREEN 4: READY / COUNTDOWN ---
  const renderReady = () => (
    <div className="w-full h-full flex flex-col items-center justify-center curtain-bg relative">
      <h2 className="font-display text-4xl font-bold text-[#f5c542] mb-6">SIAP BERMAIN!</h2>
      <div className="bg-[#2a1810] rounded-2xl p-6 mb-6 border-2 border-[#5c3a1e] max-w-lg">
        <p className="text-white text-xl mb-2"><strong>Tim:</strong> {teams.map(t => t.name).join(', ')}</p>
        <p className="text-white text-xl mb-2"><strong>Soal:</strong> {questions.length} pertanyaan</p>
        <p className="text-white text-xl">
          <strong>Setting:</strong>
          {settings.timerEnabled && ` Timer ${settings.timerSeconds}s`}
          {settings.shuffleQuestions && ' | Acak'}
          {settings.autoLifeLoss && ' | Nyawa otomatis'}
        </p>
      </div>
      <button onClick={() => {
        setScreen('countdown');
        startCountdown();
        if (settings.sound) audio.playPop();
      }} className="theater-btn px-16 py-6 text-4xl font-bold bg-[#f5c542] text-[#1a1210] marquee-btn rounded-2xl">
        🎬 MULAI!
      </button>
      <button onClick={() => { setScreen('questions'); if (settings.sound) audio.playPop(); }}
        className="theater-btn px-8 py-3 text-xl bg-[#3d0608] text-white mt-4">← Kembali</button>
    </div>
  );

  const startCountdown = () => {
    let num = 5;
    setCountdownNum(num);
    if (settings.sound) audio.playTick();
    const interval = setInterval(() => {
      num--;
      if (num > 0) {
        setCountdownNum(num);
        if (settings.sound) audio.playTick();
      } else {
        clearInterval(interval);
        setCountdownNum(null);
        if (settings.sound) audio.playGo();
        setCurtainOpen(true);
        setTimeout(() => {
          setScreen('game');
          setCurtainOpen(false);
          setCurrentQ(0);
          setTeams(ts => ts.map(t => ({ ...t, score: 0, lives: 3, eliminated: false })));
          setHistory([]);
          setShowAnswer(false);
        }, 1500);
      }
    }, 1000);
  };

  const renderCountdown = () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1a1210] relative">
      {/* Curtains */}
      <div className={`absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#3d0608] via-[#7a0c10] to-[#d42a2f] ${curtainOpen ? 'curtain-left-open' : ''}`} />
      <div className={`absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#3d0608] via-[#7a0c10] to-[#d42a2f] ${curtainOpen ? 'curtain-right-open' : ''}`} />

      {countdownNum !== null ? (
        <div key={countdownNum} className="countdown-number font-display text-[200px] font-bold text-[#f5c542]" style={{ textShadow: '0 0 40px rgba(245,197,66,0.5)' }}>
          {countdownNum}
        </div>
      ) : curtainOpen ? (
        <div className="countdown-number font-display text-[120px] font-bold gold-shimmer">GO!</div>
      ) : null}
    </div>
  );

  // --- SCREEN 5: GAME ARENA ---
  const renderGame = () => {
    const currentQuestion = questions[currentQ];
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

    return (
      <div className={`w-full h-full flex flex-col relative overflow-hidden ${shakeScreen ? 'screen-shake' : ''}`}>
        {/* Background layers */}
        <div className="absolute inset-0 bg-[#1a1210]" />
        {/* Curtains on sides */}
        <div className="absolute top-0 left-0 w-16 md:w-24 h-full bg-gradient-to-r from-[#7a0c10] via-[#d42a2f] to-transparent opacity-60" />
        <div className="absolute top-0 right-0 w-16 md:w-24 h-full bg-gradient-to-l from-[#7a0c10] via-[#d42a2f] to-transparent opacity-60" />
        {/* Stage floor */}
        <div className="absolute bottom-0 left-0 right-0 h-[45%] stage-floor" />
        {/* String lights */}
        <div className="absolute top-0 left-0 right-0 h-6 flex justify-around items-center z-10">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full" style={{
              backgroundColor: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db'][i % 4],
              animation: `twinkle ${1 + (i % 3) * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.08}s`,
              boxShadow: `0 0 6px ${['#f5c542', '#d42a2f', '#2ecc71', '#3498db'][i % 4]}`
            }} />
          ))}
        </div>

        {/* Lightning effect */}
        {showLightning !== null && (
          <div className="absolute inset-0 z-50 pointer-events-none">
            <div className="absolute inset-0 bg-red-600/30" style={{ animation: 'spotlight-flicker 0.3s ease-out 3' }} />
            <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-full" viewBox="0 0 80 600">
              <path d="M40 0 L35 150 L50 155 L30 350 L45 355 L25 600" stroke="#ff2b2f" strokeWidth="4" fill="none"
                style={{ filter: 'drop-shadow(0 0 10px #ff2b2f) drop-shadow(0 0 20px #ff2b2f)' }} />
            </svg>
          </div>
        )}

        {/* Top bar */}
        <div className="relative z-20 flex items-center justify-between px-3 py-2 bg-[#1a1210]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl md:text-2xl text-[#f5c542]">🎭 Quiz Theater</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); handleUndo(); }}
              className="theater-btn w-12 h-12 bg-[#3498db] text-white text-xl" title="Undo (U)">↩</button>
            <button onClick={(e) => { e.stopPropagation(); toggleSound(); }}
              className="theater-btn w-12 h-12 bg-[#5c3a1e] text-white text-xl" title="Mute (M)">
              {settings.sound ? '🔊' : '🔇'}
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="theater-btn w-12 h-12 bg-[#5c3a1e] text-white text-xl" title="Fullscreen (F)">⛶</button>
            <button onClick={(e) => { e.stopPropagation(); setShowHelp(true); }}
              className="theater-btn w-12 h-12 bg-[#5c3a1e] text-white text-xl" title="Bantuan">?</button>
            <button onClick={(e) => { e.stopPropagation(); setShowEndConfirm(true); }}
              className="theater-btn px-4 h-12 bg-[#e74c3c] text-white text-lg font-bold">🏁 AKHIRI</button>
          </div>
        </div>

        {/* Question area */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-2 px-4">
          {/* Spotlight */}
          <div className="spotlight-cone w-[80%] h-32 absolute top-8" />

          {/* Question counter */}
          <div className="text-[#ffe9a8] text-lg font-bold mb-1">
            Soal {currentQ + 1}/{questions.length}
            {settings.timerEnabled && (
              <span className={`ml-4 ${timerValue <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                ⏱ {Math.floor(timerValue / 60)}:{(timerValue % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>

          {/* Chalkboard */}
          <div className="chalkboard w-full max-w-4xl p-6 md:p-8 relative">
            <div className={`text-center ${currentQ > 0 ? 'spotlight-flicker' : ''}`}>
              <p className="text-[#f5f5e8] font-bold leading-relaxed"
                style={{ fontSize: currentQuestion?.text?.length > 120 ? 'clamp(20px, 2.5vw, 36px)' : 'clamp(28px, 3.5vw, 48px)' }}>
                {currentQuestion?.text || 'Tidak ada soal'}
              </p>
              {showAnswer && currentQuestion?.answer && (
                <p className="text-[#ffe9a8] text-2xl mt-4 font-bold border-t-2 border-dashed border-[#ffe9a8]/30 pt-3">
                  💡 {currentQuestion.answer}
                </p>
              )}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-3">
            <button onClick={(e) => { e.stopPropagation(); goPrevQuestion(); }}
              disabled={currentQ === 0}
              className="theater-btn px-4 h-12 bg-[#5c3a1e] text-white text-lg disabled:opacity-30">← Sebelumnya</button>
            <button onClick={(e) => { e.stopPropagation(); setShowAllQuestions(true); }}
              className="theater-btn px-4 h-12 bg-[#9b59b6] text-white text-lg">📋 Semua Soal</button>
            <button onClick={(e) => { e.stopPropagation(); setShowAnswer(!showAnswer); }}
              className={`theater-btn px-4 h-12 text-white text-lg ${showAnswer ? 'bg-[#e67e22]' : 'bg-[#5c3a1e]'}`}>
              {showAnswer ? '🙈 Sembunyikan' : '💡 Jawaban'}
            </button>
            <button onClick={(e) => { e.stopPropagation(); goNextQuestion(); }}
              disabled={currentQ === questions.length - 1}
              className="theater-btn px-4 h-12 bg-[#5c3a1e] text-white text-lg disabled:opacity-30">Berikutnya →</button>
          </div>
        </div>

        {/* Teams area */}
        <div className={`relative z-20 px-2 pb-2 ${teams.length > 5 ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap justify-center gap-3'}`}>
          {teams.map((team, idx) => (
            <div key={team.id}
              onClick={(e) => { e.stopPropagation(); setActiveTeam(activeTeam === team.id ? null : team.id); }}
              className={`flex flex-col items-center p-2 rounded-xl transition-all cursor-pointer min-w-[100px] max-w-[180px]
                ${activeTeam === team.id ? 'team-highlight' : ''}
                ${team.eliminated ? 'opacity-60' : ''}`}
              style={{ backgroundColor: `${team.color}22`, border: `3px solid ${team.color}` }}>
              {/* Character */}
              <div className={`text-3xl md:text-4xl transition-all ${team.eliminated ? 'opacity-0 scale-50' : ''}`}>
                {team.avatar}
              </div>
              {/* Name */}
              <div className="text-xs md:text-sm font-bold text-white truncate max-w-full text-center px-1"
                style={{ color: team.color }}>{team.name}</div>
              {/* Score */}
              <div className={`text-xl md:text-2xl font-bold text-white ${scoreAnim === team.id ? 'score-pop' : ''}`}>
                {team.score}
              </div>
              {/* Lives */}
              <div className="flex gap-0.5 mb-1">
                {[0, 1, 2].map(l => (
                  <button key={l}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (l < team.lives) loseLife(idx);
                      else restoreLife(idx);
                    }}
                    className={`text-lg md:text-xl transition-all ${heartAnim?.teamId === team.id && heartAnim?.idx === l ? 'heart-bounce' : ''} ${
                      l < team.lives ? 'text-red-500' : 'text-gray-600'
                    } hover:scale-125`}>
                    {l < team.lives ? '♥' : '♡'}
                  </button>
                ))}
              </div>
              {/* Correct/Wrong buttons */}
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); markCorrect(idx); }}
                  className="theater-btn w-12 h-10 md:w-14 md:h-12 bg-[#2ecc71] text-white text-xl md:text-2xl font-bold hover:bg-[#27ae60]">✓</button>
                <button onClick={(e) => { e.stopPropagation(); markWrong(idx); }}
                  className="theater-btn w-12 h-10 md:w-14 md:h-12 bg-[#e74c3c] text-white text-xl md:text-2xl font-bold hover:bg-[#c0392b]">✗</button>
              </div>
              {/* Eliminated smoke */}
              {team.eliminated && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-4xl smoke-puff">💨</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Help overlay */}
        {showHelp && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowHelp(false); }}>
            <div className="bg-[#2a1810] rounded-2xl p-6 max-w-2xl max-h-[80vh] overflow-auto border-4 border-[#f5c542]" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-3xl text-[#f5c542] mb-4">📖 Cara Main</h3>
              <div className="text-white space-y-3 text-lg">
                <p>• Tampilkan soal di papan tulis, murid menjawab lisan</p>
                <p>• Tekan <strong className="text-green-400">✓</strong> pada tim yang benar (+10 poin + confetti)</p>
                <p>• Tekan <strong className="text-red-400">✗</strong> pada tim yang salah (efek petir)</p>
                <p>• Tekan <strong className="text-red-400">♥</strong> untuk kurangi nyawa, <strong className="text-red-400">♡</strong> untuk pulihkan</p>
                <p>• Nyawa habis → karakter hilang, tapi skor tetap dihitung</p>
                <p>• Tombol <strong>↩ Undo</strong> untuk batalkan aksi terakhir</p>
                <h4 className="text-[#f5c542] font-bold mt-4">⌨️ Shortcut Keyboard:</h4>
                <p>• <code className="bg-[#1a1210] px-2 py-1 rounded">1-9,0</code> = Tim benar | <code className="bg-[#1a1210] px-2 py-1 rounded">Shift+angka</code> = Tim salah</p>
                <p>• <code className="bg-[#1a1210] px-2 py-1 rounded">←/→</code> = Soal sebelumnya/berikutnya</p>
                <p>• <code className="bg-[#1a1210] px-2 py-1 rounded">U</code> = Undo | <code className="bg-[#1a1210] px-2 py-1 rounded">M</code> = Mute | <code className="bg-[#1a1210] px-2 py-1 rounded">F</code> = Fullscreen</p>
              </div>
              <button onClick={() => setShowHelp(false)} className="theater-btn mt-4 px-6 py-3 bg-[#f5c542] text-[#1a1210] text-lg">Tutup (Esc)</button>
            </div>
          </div>
        )}

        {/* All questions overlay */}
        {showAllQuestions && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowAllQuestions(false); }}>
            <div className="bg-[#2a1810] rounded-2xl p-6 max-w-3xl max-h-[80vh] overflow-auto border-4 border-[#9b59b6]" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-2xl text-[#f5c542] mb-4">📋 Semua Soal</h3>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <button key={q.id} onClick={() => { setCurrentQ(i); setShowAllQuestions(false); setShowAnswer(false); }}
                    className={`w-full text-left p-3 rounded-xl transition-all ${i === currentQ ? 'bg-[#f5c542] text-[#1a1210]' : 'bg-[#1a1210] text-white hover:bg-[#3d0608]'}`}>
                    <span className="font-bold mr-2">{i + 1}.</span> {q.text}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAllQuestions(false)} className="theater-btn mt-4 px-6 py-3 bg-[#9b59b6] text-white text-lg">Tutup</button>
            </div>
          </div>
        )}

        {/* End game confirm */}
        {showEndConfirm && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setShowEndConfirm(false); }}>
            <div className="bg-[#2a1810] rounded-2xl p-8 border-4 border-[#e74c3c] text-center" onClick={e => e.stopPropagation()}>
              <p className="text-white text-2xl mb-6">Akhiri game dan lihat pemenang?</p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => { setShowEndConfirm(false); setScreen('winner'); setRevealIndex(-1); if (settings.sound) audio.playDrumRoll(); }}
                  className="theater-btn px-8 py-4 bg-[#e74c3c] text-white text-xl">🏁 Ya, Akhiri</button>
                <button onClick={() => setShowEndConfirm(false)}
                  className="theater-btn px-8 py-4 bg-[#5c3a1e] text-white text-xl">Lanjutkan</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- SCREEN 6: WINNER BOARD ---
  // Winner reveal effect (at component level)
  useEffect(() => {
    if (screen !== 'winner') return;
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    if (revealIndex < ranked.length - 1) {
      const timeout = setTimeout(() => {
        setRevealIndex(r => r + 1);
        if (settings.sound) {
          if (revealIndex === ranked.length - 2) audio.playFanfare();
          else audio.playDrumRoll();
        }
      }, revealIndex < 0 ? 500 : 1500);
      return () => clearTimeout(timeout);
    }
  }, [revealIndex, screen, teams, settings.sound]);

  // Continuous confetti for winner
  useEffect(() => {
    if (screen !== 'winner') return;
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    if (revealIndex < ranked.length - 1) return; // Only after all revealed
    const interval = setInterval(() => {
      confetti({ particleCount: 30, spread: 60, origin: { x: Math.random(), y: Math.random() * 0.3 }, colors: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db', '#9b59b6'] });
    }, 800);
    return () => clearInterval(interval);
  }, [screen, revealIndex, teams]);

  const renderWinner = () => {
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    const top3 = ranked.slice(0, 3);
    const rest = ranked.slice(3);

    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at center, #2a1810 0%, #1a1210 100%)' }}
        onClick={(e) => fireConfettiAt(e.clientX, e.clientY)}>
        {/* Confetti continuous for winner */}
        {revealIndex >= 0 && revealIndex === ranked.length - 1 && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="absolute" style={{ left: `${20 + i * 15}%`, top: '10%' }}>
                <div className="w-3 h-3 rounded-full animate-bounce" style={{
                  backgroundColor: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db', '#9b59b6'][i],
                  animationDelay: `${i * 0.2}s`, animationDuration: '2s'
                }} />
              </div>
            ))}
          </div>
        )}

        <h2 className="font-display text-3xl md:text-5xl font-bold gold-shimmer mb-6">🏆 PAPAN JUARA QUIZ THEATER 🏆</h2>

        {/* Podium */}
        <div className="flex items-end justify-center gap-4 mb-6 h-64">
          {/* 2nd place */}
          {top3[1] && revealIndex >= ranked.length - 3 && (
            <div className="podium-rise flex flex-col items-center">
              <div className="text-4xl mb-2">{top3[1].avatar}</div>
              <div className="text-lg font-bold" style={{ color: top3[1].color }}>{top3[1].name}</div>
              <div className="bg-gradient-to-t from-gray-400 to-gray-300 w-28 h-28 rounded-t-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl">🥈</div>
                  <div className="text-2xl font-bold text-[#1a1210]">{top3[1].score}</div>
                </div>
              </div>
            </div>
          )}

          {/* 1st place */}
          {top3[0] && revealIndex >= ranked.length - 1 && (
            <div className="podium-rise flex flex-col items-center">
              <div className="text-5xl mb-2 cursor-pointer hover:scale-125 transition-transform" onClick={(e) => { e.stopPropagation(); if (settings.sound) audio.playCorrect(); }}>
                {top3[0].avatar}
              </div>
              <div className="text-xl font-bold" style={{ color: top3[0].color }}>{top3[0].name}</div>
              <div className="bg-gradient-to-t from-[#d4a017] to-[#f5c542] w-32 h-40 rounded-t-xl flex items-center justify-center relative">
                <div className="absolute -top-6 text-4xl">🏆✨</div>
                <div className="text-center">
                  <div className="text-3xl">🥇</div>
                  <div className="text-3xl font-bold text-[#1a1210]">{top3[0].score}</div>
                </div>
              </div>
            </div>
          )}

          {/* 3rd place */}
          {top3[2] && revealIndex >= ranked.length - 2 && (
            <div className="podium-rise flex flex-col items-center">
              <div className="text-4xl mb-2">{top3[2].avatar}</div>
              <div className="text-lg font-bold" style={{ color: top3[2].color }}>{top3[2].name}</div>
              <div className="bg-gradient-to-t from-[#cd7f32] to-[#e8a850] w-28 h-20 rounded-t-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl">🥉</div>
                  <div className="text-2xl font-bold text-[#1a1210]">{top3[2].score}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rest of rankings */}
        {rest.length > 0 && revealIndex >= 0 && (
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {rest.map((team, i) => (
              <div key={team.id} className="bg-[#2a1810] rounded-xl px-4 py-2 border-2 flex items-center gap-2"
                style={{ borderColor: team.color }}>
                <span className="text-lg">{team.avatar}</span>
                <span className="font-bold" style={{ color: team.color }}>{i + 4}. {team.name}</span>
                <span className="text-white font-bold">{team.score}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {revealIndex >= ranked.length - 1 && (
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            <button onClick={(e) => { e.stopPropagation(); fireConfetti('both'); if (settings.sound) audio.playFanfare(); }}
              className="theater-btn px-6 py-3 bg-[#f5c542] text-[#1a1210] text-lg">🎉 Rayakan Lagi</button>
            <button onClick={(e) => { e.stopPropagation(); setShowStats(true); }}
              className="theater-btn px-6 py-3 bg-[#9b59b6] text-white text-lg">📊 Statistik</button>
            <button onClick={(e) => {
              e.stopPropagation();
              const text = `Hasil Quiz Theater - ${new Date().toLocaleDateString('id-ID')}\n\n` +
                ranked.map((t, i) => `${i + 1}. ${t.name} — ${t.score} poin`).join('\n');
              const blob = new Blob([text], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'hasil-quiz.txt'; a.click();
              URL.revokeObjectURL(url);
              showToast('Hasil diunduh!');
            }} className="theater-btn px-6 py-3 bg-[#3498db] text-white text-lg">⬇ Unduh</button>
            <button onClick={(e) => {
              e.stopPropagation();
              setTeams(ts => ts.map(t => ({ ...t, score: 0, lives: 3, eliminated: false })));
              setHistory([]);
              setCurrentQ(0);
              setScreen('countdown');
              startCountdown();
            }} className="theater-btn px-6 py-3 bg-[#2ecc71] text-white text-lg">🔄 Main Lagi</button>
            <button onClick={(e) => { e.stopPropagation(); startNewGame(); }}
              className="theater-btn px-6 py-3 bg-[#e74c3c] text-white text-lg">✨ Game Baru</button>
          </div>
        )}

        {/* Stats overlay */}
        {showStats && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowStats(false); }}>
            <div className="bg-[#2a1810] rounded-2xl p-6 max-w-2xl max-h-[80vh] overflow-auto border-4 border-[#9b59b6]" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-2xl text-[#f5c542] mb-4">📊 Statistik</h3>
              <div className="space-y-3">
                {ranked.map(team => {
                  const correct = history.filter(h => h.teamId === team.id && h.type === 'correct').length;
                  const wrong = history.filter(h => h.teamId === team.id && h.type === 'wrong').length;
                  return (
                    <div key={team.id} className="bg-[#1a1210] rounded-xl p-3 border-2" style={{ borderColor: team.color }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{team.avatar}</span>
                        <span className="font-bold text-lg" style={{ color: team.color }}>{team.name}</span>
                      </div>
                      <div className="text-white text-sm">
                        Skor: <strong>{team.score}</strong> | Benar: <strong className="text-green-400">{correct}</strong> | Salah: <strong className="text-red-400">{wrong}</strong> | Nyawa: <strong>{team.lives}/3</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setShowStats(false)} className="theater-btn mt-4 px-6 py-3 bg-[#9b59b6] text-white text-lg">Tutup</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ===== RESUME MODAL =====
  const renderResume = () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1a1210]">
      <div className="bg-[#2a1810] rounded-2xl p-8 border-4 border-[#f5c542] text-center max-w-md">
        <h3 className="font-display text-3xl text-[#f5c542] mb-4">🎭 Game Tersimpan!</h3>
        <p className="text-white text-xl mb-6">Lanjutkan game terakhir?</p>
        <div className="flex gap-4 justify-center">
          <button onClick={resumeGame} className="theater-btn px-6 py-4 bg-[#2ecc71] text-white text-xl">▶ Lanjutkan</button>
          <button onClick={startNewGame} className="theater-btn px-6 py-4 bg-[#e74c3c] text-white text-xl">✨ Mulai Baru</button>
        </div>
      </div>
    </div>
  );

  // ===== MAIN RENDER =====
  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Global controls always visible */}
      {screen !== 'countdown' && screen !== 'resume' && (
        <div className="absolute top-2 right-2 z-[200] flex gap-1">
          <button onClick={() => { toggleSound(); if (settings.sound) audio.playPop(); }}
            className="w-10 h-10 rounded-full bg-[#333]/80 text-white flex items-center justify-center text-lg hover:bg-[#555]">
            {settings.sound ? '🔊' : '🔇'}
          </button>
          <button onClick={toggleFullscreen}
            className="w-10 h-10 rounded-full bg-[#333]/80 text-white flex items-center justify-center text-lg hover:bg-[#555]">
            ⛶
          </button>
        </div>
      )}

      {/* Screen rendering */}
      {showResume && renderResume()}
      {!showResume && screen === 'teams-count' && renderTeamsCount()}
      {!showResume && screen === 'teams-setup' && renderTeamsSetup()}
      {!showResume && screen === 'questions' && renderQuestions()}
      {!showResume && screen === 'ready' && renderReady()}
      {!showResume && screen === 'countdown' && renderCountdown()}
      {!showResume && screen === 'game' && renderGame()}
      {!showResume && screen === 'winner' && renderWinner()}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
