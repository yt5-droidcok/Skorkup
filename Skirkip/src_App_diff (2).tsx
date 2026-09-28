--- src/App.tsx (原始)
import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Screen, Team, Question, HistoryEntry, Settings, Badge, PowerupType, CharacterMood, RoundTheme,
  TEAM_COLORS, AVATARS, DEFAULT_SETTINGS, POWERUPS, BADGES, MOOD_EMOJIS,
  ROUND_THEMES, CHAMPION_TITLES, MC_MESSAGES,
} from './types';
import * as audio from './audio';

// ===== STORAGE =====
const STORAGE_KEY = 'quiz-theater-v2';
const BADGES_KEY = 'quiz-theater-badges';
function saveState(s: any) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }
function loadState(): any { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function clearState() { try { localStorage.removeItem(STORAGE_KEY); } catch {} }
function loadBadges(): Badge[] { try { const r = localStorage.getItem(BADGES_KEY); return r ? JSON.parse(r) : []; } catch { return []; } }
function saveBadges(b: Badge[]) { try { localStorage.setItem(BADGES_KEY, JSON.stringify(b)); } catch {} }

// ===== CONFETTI =====
function fireConfetti(side: 'left' | 'right' | 'both') {
  const d = { spread: 70, ticks: 80, gravity: 0.8, decay: 0.94, startVelocity: 30, colors: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db', '#9b59b6'] };
  if (side === 'left' || side === 'both') confetti({ ...d, particleCount: 60, angle: 60, origin: { x: 0, y: 0.7 } });
  if (side === 'right' || side === 'both') confetti({ ...d, particleCount: 60, angle: 120, origin: { x: 1, y: 0.7 } });
}
function fireConfettiAt(x: number, y: number) {
  confetti({ particleCount: 30, spread: 50, origin: { x: x / window.innerWidth, y: y / window.innerHeight }, colors: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db'] });
}
function fireBigConfetti() {
  for (let i = 0; i < 5; i++) setTimeout(() => fireConfettiAt(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.5), i * 200);
}

// ===== TOAST =====
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
  return <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] toast-enter"><div className="bg-[#333] text-white px-6 py-3 rounded-xl shadow-2xl text-lg font-bold">{message}</div></div>;
}

// ===== MC VIRTUAL COMPONENT =====
function MCCharacter({ message, visible }: { message: string | null; visible: boolean }) {
  if (!visible || !message) return null;
  return (
    <div className="mc-container">
      <div className="mc-avatar">🎩</div>
      <div key={message} className="mc-bubble-box mc-bubble">
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

// ===== AMBIENT PARTICLES =====
function AmbientParticles({ round }: { round: RoundTheme }) {
  const colors = { 1: ['#f5c542', '#f39c12'], 2: ['#9b59b6', '#3498db'], 3: ['#f5c542', '#fff'] };
  const particles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 8 + Math.random() * 12,
    delay: Math.random() * 10,
    color: colors[round][i % 2],
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full particle-float" style={{
          left: `${p.left}%`, width: p.size, height: p.size,
          backgroundColor: p.color, opacity: 0.4,
          animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
          boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
        }} />
      ))}
    </div>
  );
}

// ===== MAIN APP =====
export default function App() {
  const [screen, setScreen] = useState<Screen>('teams-count');
  const [teams, setTeams] = useState<Team[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [currentRound, setCurrentRound] = useState<RoundTheme>(1);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [activeTeam, setActiveTeam] = useState<number | null>(null);
  const [teamCount, setTeamCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [showLightning, setShowLightning] = useState<number | null>(null);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const [curtainState, setCurtainState] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed');
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
  const [newQType, setNewQType] = useState<'text' | 'image' | 'audio'>('text');
  const [newQImage, setNewQImage] = useState('');
  const [comboDisplay, setComboDisplay] = useState<{teamId: number, count: number} | null>(null);
  const [mcMessage, setMcMessage] = useState<string | null>(null);
  const [showPowerupSelect, setShowPowerupSelect] = useState<number | null>(null);
  const [showSabotageSelect, setShowSabotageSelect] = useState<number | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [collectedBadges, setCollectedBadges] = useState<Badge[]>(loadBadges());
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState<Badge[]>([]);
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [showProgram, setShowProgram] = useState(false);
  const [showIntermission, setShowIntermission] = useState(false);
  const [standingOvation, setStandingOvation] = useState(false);
  const [shieldFlash, setShieldFlash] = useState<number | null>(null);
  const [hintRevealed, setHintRevealed] = useState(false);

  const timerRef = useRef<any>(null);
  const debounceRef = useRef(false);
  const mcTimeoutRef = useRef<any>(null);

  // Resume check
  useEffect(() => {
    const saved = loadState();
    if (saved && saved.screen && !['teams-count', 'teams-setup', 'questions', 'ready'].includes(saved.screen)) setShowResume(true);
  }, []);

  // Autosave
  useEffect(() => {
    if (screen === 'teams-count' && !showResume) return;
    saveState({ screen, teams, questions, currentQ, currentRound, settings, history, showAnswer, teamCount });
  }, [screen, teams, questions, currentQ, currentRound, settings, history, showAnswer, teamCount]);

  // Timer
  useEffect(() => {
    if (timerRunning && settings.timerEnabled) {
      timerRef.current = setInterval(() => {
        setTimerValue(prev => {
          if (prev <= 1) { setTimerRunning(false); if (settings.sound) audio.playTimerAlarm(); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [timerRunning, settings.timerEnabled, settings.sound]);

  useEffect(() => {
    if (settings.timerEnabled && screen === 'game') { setTimerValue(settings.timerSeconds); setTimerRunning(true); }
    else setTimerRunning(false);
  }, [currentQ, screen, settings.timerEnabled, settings.timerSeconds]);

  // MC Message helper
  const showMC = useCallback((category: keyof typeof MC_MESSAGES) => {
    if (!settings.mcEnabled) return;
    const msgs = MC_MESSAGES[category];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    setMcMessage(msg);
    if (mcTimeoutRef.current) clearTimeout(mcTimeoutRef.current);
    mcTimeoutRef.current = setTimeout(() => setMcMessage(null), 4000);
  }, [settings.mcEnabled]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showHelp || showAllQuestions || showStats) { if (e.key === 'Escape') { setShowHelp(false); setShowAllQuestions(false); setShowStats(false); } return; }
      if (screen === 'game') {
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNextQuestion(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); goPrevQuestion(); }
        if (e.key === 'u' || e.key === 'U') handleUndo();
        if (e.key === 'm' || e.key === 'M') toggleSound();
        if (e.key === 'f' || e.key === 'F') toggleFullscreen();
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) { if (e.shiftKey) markWrong(num - 1); else markCorrect(num - 1); }
        if (e.key === '0' && teams.length === 10) { if (e.shiftKey) markWrong(9); else markCorrect(9); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, teams, currentQ, history, settings, showHelp, showAllQuestions, showStats]);

  // Music
  useEffect(() => {
    if (settings.music && screen === 'game') audio.startMusic(currentRound);
    else audio.stopMusic();
  }, [settings.music, screen, currentRound]);

  // Winner reveal
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
    } else {
      // Award badges
      awardBadges();
    }
  }, [revealIndex, screen, teams, settings.sound]);

  // Continuous confetti for winner
  useEffect(() => {
    if (screen !== 'winner') return;
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    if (revealIndex < ranked.length - 1) return;
    const interval = setInterval(() => {
      confetti({ particleCount: 20, spread: 60, origin: { x: Math.random(), y: Math.random() * 0.3 }, colors: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db', '#9b59b6'] });
    }, 1000);
    return () => clearInterval(interval);
  }, [screen, revealIndex, teams]);

  // Award badges
  const awardBadges = () => {
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    const newBadges: Badge[] = [];
    // Debut
    if (!collectedBadges.find(b => b.id === 'debut')) newBadges.push({ ...BADGES[0] });
    // Champion
    if (ranked[0] && ranked[0].score > 0) newBadges.push({ ...BADGES[4], earnedBy: ranked[0].id });
    if (ranked[1]) newBadges.push({ ...BADGES[5], earnedBy: ranked[1].id });
    if (ranked[2]) newBadges.push({ ...BADGES[6], earnedBy: ranked[2].id });
    // Streak master
    teams.forEach(t => { if (t.maxCombo >= 3) newBadges.push({ ...BADGES[1], earnedBy: t.id }); });
    // Perfect
    teams.forEach(t => { if (t.totalCorrect > 0 && t.totalWrong === 0) newBadges.push({ ...BADGES[2], earnedBy: t.id }); });
    // Survivor
    teams.forEach(t => { if (t.lives > 0) newBadges.push({ ...BADGES[3], earnedBy: t.id }); });

    const unique = newBadges.filter(b => !collectedBadges.find(cb => cb.id === b.id && cb.earnedBy === b.earnedBy));
    if (unique.length > 0) {
      setCollectedBadges(prev => [...prev, ...unique]);
      saveBadges([...collectedBadges, ...unique]);
      setNewlyEarnedBadges(unique);
    }
  };

  // ===== GAME ACTIONS =====
  const showToast = (msg: string) => setToast(msg);
  const toggleSound = () => setSettings(s => ({ ...s, sound: !s.sound }));
  const toggleFullscreen = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); };

  const handleUndo = () => {
    if (history.length === 0) { showToast('Tidak ada aksi untuk dibatalkan'); return; }
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setTeams(ts => ts.map(t => {
      if (t.id !== last.teamId) return t;
      let n = { ...t };
      if (last.type === 'correct') { n.score -= (last.scoreDelta || 10); n.totalCorrect--; }
      if (last.type === 'wrong') n.totalWrong--;
      if (last.type === 'lifeLost') { n.lives = Math.min(3, n.lives + 1); if (n.lives > 0) n.eliminated = false; }
      if (last.type === 'lifeRestored') { n.lives = Math.max(0, n.lives - 1); if (n.lives === 0) n.eliminated = true; }
      return n;
    }));
    showToast('Aksi dibatalkan');
    if (settings.sound) audio.playPop();
  };

  const setMood = (teamId: number, mood: CharacterMood) => {
    setTeams(ts => ts.map(t => t.id === teamId ? { ...t, mood } : t));
    setTimeout(() => setTeams(ts => ts.map(t => t.id === teamId ? { ...t, mood: 'normal' } : t)), 2000);
  };

  const markCorrect = (teamIdx: number) => {
    if (debounceRef.current) return;
    debounceRef.current = true;
    setTimeout(() => debounceRef.current = false, 150);
    if (teamIdx >= teams.length) return;
    const team = teams[teamIdx];
    let points = 10;
    if (team.doubleNext) { points = 20; setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, doubleNext: false } : t)); }
    if (settings.sound) audio.playCorrect();
    fireConfetti('both');
    setScoreAnim(team.id);
    setTimeout(() => setScoreAnim(null), 400);
    setMood(team.id, 'happy');
    if (settings.sound) audio.playAnimalSound(team.avatar);
    // Combo
    const newCombo = team.combo + 1;
    const newStreak = team.correctStreak + 1;
    setTeams(ts => ts.map((t, i) => {
      if (i === teamIdx) return { ...t, score: t.score + points, combo: newCombo, correctStreak: newStreak, maxCombo: Math.max(t.maxCombo, newCombo), totalCorrect: t.totalCorrect + 1 };
      return { ...t, combo: 0, correctStreak: 0 };
    }));
    setComboDisplay({ teamId: team.id, count: newCombo });
    setTimeout(() => setComboDisplay(null), 1500);
    if (newCombo === 3) { if (settings.sound) audio.playCombo(); showMC('combo'); }
    if (newCombo === 5) { if (settings.sound) audio.playMegaCombo(); fireBigConfetti(); showMC('combo'); }
    setHistory(h => [...h, { type: 'correct', teamId: team.id, timestamp: Date.now(), scoreDelta: points }]);
    showMC('correct');
    setHintRevealed(false);
  };

  const markWrong = (teamIdx: number) => {
    if (debounceRef.current) return;
    debounceRef.current = true;
    setTimeout(() => debounceRef.current = false, 150);
    if (teamIdx >= teams.length) return;
    const team = teams[teamIdx];
    // Shield check
    if (team.shieldActive) {
      setShieldFlash(team.id);
      setTimeout(() => setShieldFlash(null), 800);
      setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, shieldActive: false } : t));
      if (settings.sound) audio.playShield();
      showToast(`🛡️ Perisai ${team.name} melindungi!`);
      setHistory(h => [...h, { type: 'powerup', teamId: team.id, timestamp: Date.now(), detail: 'shield' }]);
      return;
    }
    if (settings.sound) audio.playWrong();
    setShowLightning(team.id);
    setShakeScreen(true);
    setTimeout(() => { setShowLightning(null); setShakeScreen(false); }, 800);
    setMood(team.id, 'sad');
    setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, combo: 0, correctStreak: 0, totalWrong: t.totalWrong + 1 } : t));
    setHistory(h => [...h, { type: 'wrong', teamId: team.id, timestamp: Date.now() }]);
    showMC('wrong');
    if (settings.autoLifeLoss) loseLife(teamIdx);
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
      if (newLives <= 0) { setTimeout(() => { if (settings.sound) audio.playElimination(); }, 300); return { ...t, lives: 0, eliminated: true }; }
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
    setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, lives: t.lives + 1, eliminated: false } : t));
    setHistory(h => [...h, { type: 'lifeRestored', teamId: team.id, timestamp: Date.now(), livesDelta: 1 }]);
  };

  const goNextQuestion = () => {
    if (currentQ < questions.length - 1) {
      const next = currentQ + 1;
      // Check round transition
      if (settings.roundsEnabled) {
        const nextQ = questions[next];
        if (nextQ.round !== currentRound) {
          setCurrentRound(nextQ.round);
          setShowRoundTransition(true);
          if (settings.sound) { audio.playRoundJingle(nextQ.round); audio.playClapboard(); }
          showMC('roundStart');
          setTimeout(() => {
            setShowRoundTransition(false);
            if (nextQ.round === 3) showMC('finalRound');
          }, 2500);
        }
      }
      setCurrentQ(next);
      setShowAnswer(false);
      setHintRevealed(false);
      if (settings.sound) audio.playWhoosh();
      if (settings.narratorEnabled) audio.playNarrator(questions[next].text);
    }
  };

  const goPrevQuestion = () => {
    if (currentQ > 0) {
      const prev = currentQ - 1;
      if (settings.roundsEnabled) {
        const prevQ = questions[prev];
        if (prevQ.round !== currentRound) setCurrentRound(prevQ.round);
      }
      setCurrentQ(prev);
      setShowAnswer(false);
      setHintRevealed(false);
      if (settings.sound) audio.playWhoosh();
    }
  };

  // Power-up usage
  const usePowerup = (teamIdx: number, type: PowerupType) => {
    const team = teams[teamIdx];
    const idx = team.powerups.indexOf(type);
    if (idx === -1) return;
    const newPowerups = [...team.powerups];
    newPowerups.splice(idx, 1);
    if (settings.sound) audio.playPowerup();
    showMC('powerup');
    switch (type) {
      case 'shield':
        setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, powerups: newPowerups, shieldActive: true } : t));
        showToast(`🛡️ ${team.name} mengaktifkan Perisai!`);
        break;
      case 'sabotage':
        setShowSabotageSelect(teamIdx);
        setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, powerups: newPowerups } : t));
        return;
      case 'hint':
        setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, powerups: newPowerups } : t));
        setHintRevealed(true);
        setShowAnswer(true);
        showToast(`🔮 Bocoran: ${questions[currentQ].answer ? questions[currentQ].answer[0] + '...' : 'Tidak ada jawaban'}`);
        break;
      case 'double':
        setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, powerups: newPowerups, doubleNext: true } : t));
        showToast(`💎 ${team.name} mengaktifkan Poin Ganda!`);
        break;
    }
    setHistory(h => [...h, { type: 'powerup', teamId: team.id, timestamp: Date.now(), detail: type }]);
    setShowPowerupSelect(null);
  };

  const executeSabotage = (targetIdx: number) => {
    if (showSabotageSelect === null) return;
    const attacker = teams[showSabotageSelect];
    setTeams(ts => ts.map((t, i) => {
      if (i === targetIdx) return { ...t, score: Math.max(0, t.score - 10) };
      return t;
    }));
    if (settings.sound) audio.playSabotage();
    showToast(`✖️ ${attacker.name} menyabotase! -10 poin!`);
    setShowSabotageSelect(null);
  };

  // Resume / New game
  const resumeGame = () => {
    const saved = loadState();
    if (saved) {
      setScreen(saved.screen || 'game');
      setTeams(saved.teams || []);
      setQuestions(saved.questions || []);
      setCurrentQ(saved.currentQuestionIndex || 0);
      setCurrentRound(saved.currentRound || 1);
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
    setTeams([]); setQuestions([]); setCurrentQ(0); setCurrentRound(1);
    setSettings({ ...DEFAULT_SETTINGS }); setHistory([]); setShowAnswer(false);
    setTeamCount(0); setShowResume(false); setHintRevealed(false);
  };

  // ===== SCREEN: TEAMS COUNT =====
  const renderTeamsCount = () => (
    <div className="w-full h-full flex flex-col items-center justify-center curtain-bg relative overflow-hidden">
      <AmbientParticles round={1} />
      <div className="absolute top-0 left-0 right-0 h-8 flex justify-around items-center z-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db'][i % 4], animation: `twinkle ${1 + (i % 3) * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.1}s`, boxShadow: `0 0 8px ${['#f5c542', '#d42a2f', '#2ecc71', '#3498db'][i % 4]}` }} />
        ))}
      </div>
      <h1 className="font-display text-5xl md:text-7xl font-bold mb-2 gold-shimmer relative z-10">🎭 QUIZ THEATER 🎭</h1>
      <p className="text-xl md:text-2xl text-[#ffe9a8] mb-8 font-semibold relative z-10">Cerdas Cermat Panggung Kelas</p>
      <p className="text-2xl md:text-3xl text-white mb-6 font-bold relative z-10">BERAPA TIM YANG AKAN BERMAIN?</p>
      <div className="flex flex-wrap justify-center gap-4 mb-8 max-w-3xl relative z-10">
        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <button key={n} onClick={() => { setTeamCount(n); if (settings.sound) audio.playPop(); }}
            className={`theater-btn w-20 h-20 text-3xl font-bold rounded-2xl transition-all ${teamCount === n ? 'bg-[#f5c542] text-[#1a1210] border-[#d4a017] scale-110 shadow-[0_0_20px_rgba(245,197,66,0.5)]' : 'bg-[#3d0608] text-white hover:bg-[#5a0a0e]'}`}>{n}</button>
        ))}
      </div>
      <button onClick={() => { if (teamCount > 0) { setScreen('teams-setup'); if (settings.sound) audio.playPop(); } }}
        disabled={teamCount === 0}
        className={`theater-btn px-12 py-4 text-2xl font-bold rounded-2xl relative z-10 ${teamCount > 0 ? 'bg-[#f5c542] text-[#1a1210] marquee-btn gentle-pulse' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>LANJUT →</button>
      {collectedBadges.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-[#2a1810]/80 rounded-xl p-3 border border-[#f5c542] z-10">
          <p className="text-[#f5c542] text-sm font-bold mb-1">🏆 Lencana Koleksi:</p>
          <div className="flex gap-1 flex-wrap max-w-xs">
            {collectedBadges.slice(-8).map((b, i) => <span key={i} className="text-xl" title={b.name}>{b.emoji}</span>)}
          </div>
        </div>
      )}
    </div>
  );

  // ===== SCREEN: TEAMS SETUP =====
  const renderTeamsSetup = () => (
    <div className="w-full h-full flex flex-col items-center p-4 md:p-6 curtain-bg relative overflow-auto">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-[#f5c542] mb-4">SUSUN TIMMU</h2>
      <div className="flex flex-wrap justify-center gap-4 mb-6 max-w-6xl">
        {Array.from({ length: teamCount }).map((_, idx) => {
          const team = teams[idx] || { id: idx, name: `Tim ${idx + 1}`, color: TEAM_COLORS[idx % TEAM_COLORS.length], avatar: AVATARS[idx % AVATARS.length], score: 0, lives: 3, eliminated: false, answering: false, combo: 0, maxCombo: 0, mood: 'normal' as CharacterMood, powerups: settings.powerupsEnabled ? ['shield', 'double'] as PowerupType[] : [], activePowerup: null, shieldActive: false, doubleNext: false, correctStreak: 0, totalCorrect: 0, totalWrong: 0 };
          return (
            <div key={idx} className="bg-[#2a1810] rounded-2xl p-4 w-48 md:w-56 border-4 flex flex-col items-center" style={{ borderColor: team.color }}>
              <div className="text-5xl mb-2">{team.avatar}</div>
              <div className="flex gap-2 mb-2">
                <button onClick={() => { const nt = [...teams]; if (!nt[idx]) nt[idx] = { ...team }; const ci = AVATARS.indexOf(nt[idx].avatar); nt[idx].avatar = AVATARS[(ci - 1 + AVATARS.length) % AVATARS.length]; setTeams(nt); if (settings.sound) audio.playPop(); }} className="theater-btn w-10 h-10 bg-[#3d0608] text-white text-lg">◀</button>
                <button onClick={() => { const nt = [...teams]; if (!nt[idx]) nt[idx] = { ...team }; const ci = AVATARS.indexOf(nt[idx].avatar); nt[idx].avatar = AVATARS[(ci + 1) % AVATARS.length]; setTeams(nt); if (settings.sound) audio.playPop(); }} className="theater-btn w-10 h-10 bg-[#3d0608] text-white text-lg">▶</button>
              </div>
              <input type="text" value={team.name} placeholder={`Tim ${idx + 1}`} onChange={e => { const nt = [...teams]; if (!nt[idx]) nt[idx] = { ...team }; nt[idx].name = e.target.value || `Tim ${idx + 1}`; setTeams(nt); }}
                className="w-full text-center bg-[#1a1210] text-white rounded-lg px-3 py-2 text-lg font-bold border-2 border-[#5c3a1e] focus:border-[#f5c542] outline-none" />
              <div className="flex flex-wrap gap-1 mt-2 justify-center">
                {TEAM_COLORS.map(color => (
                  <button key={color} onClick={() => { const nt = [...teams]; if (!nt[idx]) nt[idx] = { ...team }; nt[idx].color = color; setTeams(nt); if (settings.sound) audio.playPop(); }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${team.color === color ? 'border-white scale-125' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                ))}
              </div>
              <div className="flex gap-1 mt-2">{[0, 1, 2].map(l => <span key={l} className="text-red-500 text-lg">♥</span>)}</div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4">
        <button onClick={() => { setScreen('teams-count'); if (settings.sound) audio.playPop(); }} className="theater-btn px-8 py-3 text-xl bg-[#3d0608] text-white">← Kembali</button>
        <button onClick={() => {
          const finalTeams = Array.from({ length: teamCount }).map((_, idx) => {
            const existing = teams[idx];
            if (existing) return existing;
            return { id: idx, name: `Tim ${idx + 1}`, color: TEAM_COLORS[idx % TEAM_COLORS.length], avatar: AVATARS[idx % AVATARS.length], score: 0, lives: 3, eliminated: false, answering: false, combo: 0, maxCombo: 0, mood: 'normal' as CharacterMood, powerups: settings.powerupsEnabled ? ['shield', 'double'] as PowerupType[] : [], activePowerup: null, shieldActive: false, doubleNext: false, correctStreak: 0, totalCorrect: 0, totalWrong: 0 };
          });
          setTeams(finalTeams);
          setScreen('program');
          if (settings.sound) audio.playPop();
        }} className="theater-btn px-8 py-3 text-xl bg-[#f5c542] text-[#1a1210]">Lanjut →</button>
      </div>
    </div>
  );

  // ===== SCREEN: PROGRAM BROCHURE =====
  const renderProgram = () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1210] p-6 relative overflow-auto">
      <AmbientParticles round={1} />
      <div className="program-brochure max-w-2xl w-full relative z-10">
        <div className="text-center mb-4">
          <p className="text-[#f5c542] font-display text-3xl font-bold">🎭 QUIZ THEATER PRESENTS 🎭</p>
          <p className="text-[#ffe9a8] text-lg mt-2">"Pertarungan Pengetahuan"</p>
          <p className="text-white text-sm mt-1">Dibintangi:</p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {teams.map(t => (
              <span key={t.id} className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: t.color + '33', color: t.color, border: `2px solid ${t.color}` }}>
                {t.avatar} {t.name}
              </span>
            ))}
          </div>
          <p className="text-white text-sm mt-4">Sutradara: Guru tercinta 👩‍🏫</p>
        </div>
        <div className="border-t-2 border-dashed border-[#f5c542]/30 my-4 pt-4">
          <p className="text-[#ffe9a8] text-center font-bold">ACARA MALAM INI:</p>
          {settings.roundsEnabled ? (
            <div className="mt-2 space-y-1">
              {([1, 2, 3] as RoundTheme[]).map(r => (
                <div key={r} className="flex items-center gap-2 text-white text-sm">
                  <span className="font-bold" style={{ color: ROUND_THEMES[r].color }}>Babak {r}:</span>
                  <span>{ROUND_THEMES[r].name} — {ROUND_THEMES[r].subtitle}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-white text-sm text-center mt-2">Pertunjukan Tunggal</p>}
        </div>
        <div className="flex justify-center gap-3 mt-4">
          <button onClick={() => { setScreen('teams-setup'); if (settings.sound) audio.playPop(); }} className="theater-btn px-6 py-3 bg-[#3d0608] text-white">← Kembali</button>
          <button onClick={() => { setScreen('questions'); if (settings.sound) audio.playPop(); }} className="theater-btn px-6 py-3 bg-[#f5c542] text-[#1a1210]">Lanjut →</button>
        </div>
      </div>
    </div>
  );

  // ===== SCREEN: QUESTIONS =====
  const renderQuestions = () => (
    <div className="w-full h-full flex flex-col p-4 md:p-6 bg-[#1a1210] overflow-auto">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-[#f5c542] mb-4 text-center">TULIS SOALNYA</h2>
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        {!showBulkInput ? (
          <>
            <div className="mb-4">
              <div className="flex gap-2 mb-2">
                {(['text', 'image', 'audio'] as const).map(t => (
                  <button key={t} onClick={() => setNewQType(t)}
                    className={`theater-btn px-4 h-10 text-sm ${newQType === t ? 'bg-[#f5c542] text-[#1a1210]' : 'bg-[#3d0608] text-white'}`}>
                    {t === 'text' ? '📝 Teks' : t === 'image' ? '🖼️ Gambar' : '🎵 Suara'}
                  </button>
                ))}
                <select value={questions.length > 0 ? (questions[questions.length - 1]?.round || 1) : 1}
                  onChange={e => {/* round will be set on add */}}
                  className="bg-[#1a1210] text-white rounded-lg px-3 py-1 border border-[#5c3a1e] text-sm">
                  <option value="1">Babak 1</option><option value="2">Babak 2</option><option value="3">Babak 3</option>
                </select>
              </div>
              <textarea value={editingQuestion !== null ? questions[editingQuestion]?.text || '' : newQText}
                onChange={e => { if (editingQuestion !== null) { const nq = [...questions]; nq[editingQuestion] = { ...nq[editingQuestion], text: e.target.value }; setQuestions(nq); } else setNewQText(e.target.value); }}
                placeholder={newQType === 'text' ? 'Tulis pertanyaan...' : newQType === 'image' ? 'Tulis pertanyaan + emoji/gambar di bawah' : 'Deskripsi suara yang akan diputar'}
                className="w-full h-24 bg-[#2b3a2a] text-[#f5f5e8] rounded-xl p-4 text-lg border-4 border-[#8b5a2b] resize-none outline-none focus:border-[#f5c542]" />
              {newQType === 'image' && (
                <input type="text" value={editingQuestion !== null ? questions[editingQuestion]?.imageData || '' : newQImage}
                  onChange={e => { if (editingQuestion !== null) { const nq = [...questions]; nq[editingQuestion] = { ...nq[editingQuestion], imageData: e.target.value }; setQuestions(nq); } else setNewQImage(e.target.value); }}
                  placeholder="Emoji atau URL gambar (misal: 🌍 atau https://...)"
                  className="w-full mt-2 bg-[#1a1210] text-white rounded-xl p-3 text-lg border-2 border-[#5c3a1e] outline-none focus:border-[#f5c542]" />
              )}
              <input type="text" value={editingQuestion !== null ? questions[editingQuestion]?.answer || '' : newQAnswer}
                onChange={e => { if (editingQuestion !== null) { const nq = [...questions]; nq[editingQuestion] = { ...nq[editingQuestion], answer: e.target.value }; setQuestions(nq); } else setNewQAnswer(e.target.value); }}
                placeholder="Jawaban (opsional, untuk pegangan guru)"
                className="w-full mt-2 bg-[#1a1210] text-[#ffe9a8] rounded-xl p-3 text-lg border-2 border-[#5c3a1e] outline-none focus:border-[#f5c542]" />
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {editingQuestion !== null ? (
                <button onClick={() => { setEditingQuestion(null); setNewQText(''); setNewQAnswer(''); if (settings.sound) audio.playPop(); }} className="theater-btn px-6 py-3 bg-gray-600 text-white text-lg">Batal Edit</button>
              ) : (
                <button onClick={() => {
                  const text = newQText.trim();
                  if (!text) { showToast('Tulis soal terlebih dahulu'); return; }
                  const round = Math.min(3, Math.max(1, Math.ceil((questions.length + 1) / Math.ceil(questions.length / 3 || 1)))) as RoundTheme;
                  setQuestions(q => [...q, { id: Date.now().toString(), text, answer: newQAnswer.trim(), order: q.length, type: newQType, imageData: newQImage, round, difficulty: round === 1 ? 'easy' : round === 2 ? 'medium' : 'hard' }]);
                  setNewQText(''); setNewQAnswer(''); setNewQImage('');
                  if (settings.sound) audio.playPop();
                }} className="theater-btn px-6 py-3 bg-[#2ecc71] text-white text-lg">+ Tambah Soal</button>
              )}
              <button onClick={() => setShowBulkInput(true)} className="theater-btn px-6 py-3 bg-[#3498db] text-white text-lg">📋 Tempel Banyak</button>
              <button onClick={() => {
                const data = JSON.stringify(questions, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'bank-soal.json'; a.click();
                URL.revokeObjectURL(url); showToast('Bank soal diunduh!');
              }} className="theater-btn px-6 py-3 bg-[#9b59b6] text-white text-lg">⬇ Ekspor</button>
              <button onClick={() => {
                const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,.txt';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const content = ev.target?.result as string;
                      let imported: Question[];
                      if (file.name.endsWith('.json')) imported = JSON.parse(content);
                      else imported = content.split('\n').filter(l => l.trim()).map((line, i) => { const parts = line.split('|'); return { id: Date.now().toString() + i, text: parts[0].trim(), answer: (parts[1] || '').trim(), order: i, type: 'text' as const, round: 1 as RoundTheme, difficulty: 'easy' as const }; });
                      setQuestions(qs => [...qs, ...imported.map((item, i) => ({ ...item, id: item.id || Date.now().toString() + i, order: qs.length + i, type: item.type || 'text', round: item.round || 1, difficulty: item.difficulty || 'easy' }))]);
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
            <p className="text-[#ffe9a8] mb-2">Tempel soal (satu per baris). Format: soal | jawaban</p>
            <textarea value={bulkInput} onChange={e => setBulkInput(e.target.value)} placeholder="Soal 1 | Jawaban 1&#10;Soal 2 | Jawaban 2"
              className="w-full h-40 bg-[#2b3a2a] text-[#f5f5e8] rounded-xl p-4 text-lg border-4 border-[#8b5a2b] resize-none outline-none" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => {
                const lines = bulkInput.split('\n').filter(l => l.trim());
                const newQs = lines.map((line, i) => { const parts = line.split('|'); return { id: Date.now().toString() + i, text: parts[0].trim(), answer: (parts[1] || '').trim(), order: questions.length + i, type: 'text' as const, round: Math.min(3, Math.ceil((questions.length + i + 1) / Math.ceil((questions.length + lines.length) / 3))) as RoundTheme, difficulty: 'easy' as const }; });
                setQuestions(q => [...q, ...newQs]); setBulkInput(''); setShowBulkInput(false);
                showToast(`${newQs.length} soal ditambahkan!`); if (settings.sound) audio.playPop();
              }} className="theater-btn px-6 py-3 bg-[#2ecc71] text-white text-lg">✓ Tambahkan</button>
              <button onClick={() => { setShowBulkInput(false); setBulkInput(''); }} className="theater-btn px-6 py-3 bg-gray-600 text-white text-lg">Batal</button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-auto mb-4">
          {questions.length === 0 ? <p className="text-center text-gray-400 text-xl py-8">Belum ada soal. Minimal 1 soal.</p> : (
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={q.id} className="flex items-center gap-2 bg-[#2a1810] rounded-xl p-3 border border-[#5c3a1e]">
                  <span className="text-[#f5c542] font-bold text-lg w-8">{i + 1}.</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: ROUND_THEMES[q.round || 1].color + '33', color: ROUND_THEMES[q.round || 1].color }}>B{q.round || 1}</span>
                  {q.type === 'image' && <span title="Soal Gambar">🖼️</span>}
                  {q.type === 'audio' && <span title="Soal Suara">🎵</span>}
                  <span className="flex-1 text-white text-lg truncate">{q.text}</span>
                  {q.answer && <span className="text-[#ffe9a8] text-sm">💡</span>}
                  <button onClick={() => { setEditingQuestion(i); setNewQText(q.text); setNewQAnswer(q.answer); if (settings.sound) audio.playPop(); }} className="theater-btn w-10 h-10 bg-[#3498db] text-white text-sm">✎</button>
                  <button onClick={() => { setQuestions(qs => qs.filter((_, j) => j !== i)); if (settings.sound) audio.playPop(); }} className="theater-btn w-10 h-10 bg-[#e74c3c] text-white text-sm">🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-[#2a1810] rounded-xl p-4 mb-4 border border-[#5c3a1e]">
          <h3 className="text-[#f5c542] font-bold text-lg mb-2">⚙️ Pengaturan</h3>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" checked={settings.shuffleQuestions} onChange={e => setSettings(s => ({ ...s, shuffleQuestions: e.target.checked }))} className="w-5 h-5" />Acak urutan</label>
            <label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" checked={settings.timerEnabled} onChange={e => setSettings(s => ({ ...s, timerEnabled: e.target.checked }))} className="w-5 h-5" />Timer</label>
            {settings.timerEnabled && <select value={settings.timerSeconds} onChange={e => setSettings(s => ({ ...s, timerSeconds: parseInt(e.target.value) }))} className="bg-[#1a1210] text-white rounded-lg px-3 py-1 border border-[#5c3a1e]"><option value={15}>15d</option><option value={30}>30d</option><option value={60}>60d</option></select>}
            <label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" checked={settings.autoLifeLoss} onChange={e => setSettings(s => ({ ...s, autoLifeLoss: e.target.checked }))} className="w-5 h-5" />Nyawa otomatis</label>
            <label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" checked={settings.roundsEnabled} onChange={e => setSettings(s => ({ ...s, roundsEnabled: e.target.checked }))} className="w-5 h-5" />3 Babak</label>
            <label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" checked={settings.powerupsEnabled} onChange={e => setSettings(s => ({ ...s, powerupsEnabled: e.target.checked }))} className="w-5 h-5" />Power-Up</label>
            <label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" checked={settings.narratorEnabled} onChange={e => setSettings(s => ({ ...s, narratorEnabled: e.target.checked }))} className="w-5 h-5" />Narator</label>
            <label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" checked={settings.mcEnabled} onChange={e => setSettings(s => ({ ...s, mcEnabled: e.target.checked }))} className="w-5 h-5" />MC Virtual</label>
          </div>
        </div>
        <div className="flex gap-4 justify-center">
          <button onClick={() => { setScreen('program'); if (settings.sound) audio.playPop(); }} className="theater-btn px-8 py-3 text-xl bg-[#3d0608] text-white">← Kembali</button>
          <button onClick={() => {
            if (questions.length === 0) { showToast('Minimal 1 soal!'); return; }
            if (settings.shuffleQuestions) setQuestions(q => [...q].sort(() => Math.random() - 0.5));
            setScreen('ready'); if (settings.sound) audio.playPop();
          }} disabled={questions.length === 0} className={`theater-btn px-8 py-3 text-xl ${questions.length > 0 ? 'bg-[#f5c542] text-[#1a1210]' : 'bg-gray-600 text-gray-400'}`}>Lanjut →</button>
        </div>
      </div>
    </div>
  );

  // ===== SCREEN: READY =====
  const renderReady = () => (
    <div className="w-full h-full flex flex-col items-center justify-center curtain-bg relative">
      <AmbientParticles round={1} />
      <h2 className="font-display text-4xl font-bold text-[#f5c542] mb-6 relative z-10">SIAP BERMAIN!</h2>
      <div className="bg-[#2a1810] rounded-2xl p-6 mb-6 border-2 border-[#5c3a1e] max-w-lg relative z-10">
        <p className="text-white text-xl mb-2"><strong>Tim:</strong> {teams.map(t => t.name).join(', ')}</p>
        <p className="text-white text-xl mb-2"><strong>Soal:</strong> {questions.length}</p>
        <p className="text-white text-xl"><strong>Mode:</strong>{settings.roundsEnabled && ' 3 Babak'}{settings.timerEnabled && ` Timer ${settings.timerSeconds}s`}{settings.powerupsEnabled && ' | Power-Up'}{settings.narratorEnabled && ' | Narator'}{settings.mcEnabled && ' | MC'}</p>
      </div>
      <button onClick={() => { setScreen('countdown'); startCountdown(); if (settings.sound) audio.playPop(); showMC('gameStart'); }}
        className="theater-btn px-16 py-6 text-4xl font-bold bg-[#f5c542] text-[#1a1210] marquee-btn rounded-2xl relative z-10">🎬 MULAI!</button>
      <button onClick={() => { setScreen('questions'); if (settings.sound) audio.playPop(); }} className="theater-btn px-8 py-3 text-xl bg-[#3d0608] text-white mt-4 relative z-10">← Kembali</button>
    </div>
  );

  const startCountdown = () => {
    let num = 5; setCountdownNum(num);
    if (settings.sound) audio.playTick();
    const interval = setInterval(() => {
      num--;
      if (num > 0) { setCountdownNum(num); if (settings.sound) audio.playTick(); }
      else {
        clearInterval(interval); setCountdownNum(null);
        if (settings.sound) audio.playGo();
        setCurtainState('opening');
        setTimeout(() => {
          setScreen('game'); setCurtainState('open');
          setCurrentQ(0); setCurrentRound(1);
          setTeams(ts => ts.map(t => ({ ...t, score: 0, lives: 3, eliminated: false, combo: 0, maxCombo: 0, mood: 'normal', powerups: settings.powerupsEnabled ? ['shield', 'double'] as PowerupType[] : [], shieldActive: false, doubleNext: false, correctStreak: 0, totalCorrect: 0, totalWrong: 0 })));
          setHistory([]); setShowAnswer(false); setHintRevealed(false);
          if (settings.narratorEnabled && questions[0]) audio.playNarrator(questions[0].text);
        }, 1500);
      }
    }, 1000);
  };

  const renderCountdown = () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1a1210] relative">
      <div className={`absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#3d0608] via-[#7a0c10] to-[#d42a2f] ${curtainState === 'opening' ? 'curtain-left-open' : ''}`} />
      <div className={`absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#3d0608] via-[#7a0c10] to-[#d42a2f] ${curtainState === 'opening' ? 'curtain-right-open' : ''}`} />
      {countdownNum !== null ? <div key={countdownNum} className="countdown-number font-display text-[200px] font-bold text-[#f5c542]" style={{ textShadow: '0 0 40px rgba(245,197,66,0.5)' }}>{countdownNum}</div>
        : curtainState === 'opening' ? <div className="countdown-number font-display text-[120px] font-bold gold-shimmer">GO!</div> : null}
    </div>
  );

  // ===== SCREEN: GAME ARENA =====
  const renderGame = () => {
    const currentQuestion = questions[currentQ];
    const roundTheme = ROUND_THEMES[currentRound];

    return (
      <div className={`w-full h-full flex flex-col relative overflow-hidden ${shakeScreen ? 'screen-shake' : ''} round-bg-${currentRound}`}>
        <AmbientParticles round={currentRound} />
        {/* Curtains on sides */}
        <div className="absolute top-0 left-0 w-12 md:w-20 h-full bg-gradient-to-r from-[#7a0c10] via-[#d42a2f] to-transparent opacity-50 z-[1]" />
        <div className="absolute top-0 right-0 w-12 md:w-20 h-full bg-gradient-to-l from-[#7a0c10] via-[#d42a2f] to-transparent opacity-50 z-[1]" />
        {/* Stage floor */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] stage-floor z-[1]" />
        {/* Closing curtains */}
        {curtainState === 'closing' && (
          <>
            <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#3d0608] via-[#7a0c10] to-[#d42a2f] curtain-left-close z-[100]" />
            <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#3d0608] via-[#7a0c10] to-[#d42a2f] curtain-right-close z-[100]" />
          </>
        )}
        {/* String lights */}
        <div className="absolute top-0 left-0 right-0 h-6 flex justify-around items-center z-10">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db'][i % 4], animation: `twinkle ${1 + (i % 3) * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.08}s`, boxShadow: `0 0 6px ${['#f5c542', '#d42a2f', '#2ecc71', '#3498db'][i % 4]}` }} />
          ))}
        </div>

        {/* Lightning */}
        {showLightning !== null && (
          <div className="absolute inset-0 z-50 pointer-events-none">
            <div className="absolute inset-0 bg-red-600/30" style={{ animation: 'spotlight-flicker 0.3s ease-out 3' }} />
            <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-full" viewBox="0 0 80 600">
              <path d="M40 0 L35 150 L50 155 L30 350 L45 355 L25 600" stroke="#ff2b2f" strokeWidth="4" fill="none" style={{ filter: 'drop-shadow(0 0 10px #ff2b2f)' }} />
            </svg>
          </div>
        )}

        {/* Shield flash */}
        {shieldFlash !== null && (
          <div className="absolute inset-0 z-50 pointer-events-none bg-blue-400/20" style={{ animation: 'spotlight-flicker 0.4s ease-out 2' }} />
        )}

        {/* Round transition */}
        {showRoundTransition && (
          <div className="absolute inset-0 z-[200] bg-black/80 flex items-center justify-center">
            <div className="round-transition text-center">
              <div className="text-8xl mb-4 clapboard-snap">🎬</div>
              <h2 className="font-display text-5xl font-bold" style={{ color: roundTheme.color }}>{roundTheme.name}</h2>
              <p className="text-2xl text-white mt-2">{roundTheme.subtitle}</p>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="relative z-20 flex items-center justify-between px-3 py-2 bg-[#1a1210]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg md:text-xl font-bold" style={{ color: roundTheme.color }}>🎭 {roundTheme.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); handleUndo(); }} className="theater-btn w-12 h-12 bg-[#3498db] text-white text-xl" title="Undo">↩</button>
            <button onClick={(e) => { e.stopPropagation(); toggleSound(); }} className="theater-btn w-12 h-12 bg-[#5c3a1e] text-white text-xl">{settings.sound ? '🔊' : '🔇'}</button>
            <button onClick={(e) => { e.stopPropagation(); setShowIntermission(true); }} className="theater-btn w-12 h-12 bg-[#5c3a1e] text-white text-xl" title="Intermission">🍿</button>
            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="theater-btn w-12 h-12 bg-[#5c3a1e] text-white text-xl">⛶</button>
            <button onClick={(e) => { e.stopPropagation(); setShowHelp(true); }} className="theater-btn w-12 h-12 bg-[#5c3a1e] text-white text-xl">?</button>
            <button onClick={(e) => { e.stopPropagation(); setShowEndConfirm(true); }} className="theater-btn px-4 h-12 bg-[#e74c3c] text-white text-lg font-bold">🏁 AKHIRI</button>
          </div>
        </div>

        {/* Question area */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-2 px-4">
          <div className="spotlight-cone w-[80%] h-32 absolute top-8" />
          <div className="text-[#ffe9a8] text-lg font-bold mb-1 flex items-center gap-3">
            <span>Soal {currentQ + 1}/{questions.length}</span>
            {settings.timerEnabled && <span className={`${timerValue <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>⏱ {Math.floor(timerValue / 60)}:{(timerValue % 60).toString().padStart(2, '0')}</span>}
          </div>
          <div className="chalkboard w-full max-w-4xl p-6 md:p-8 relative">
            <div className={`text-center ${currentQ > 0 ? 'spotlight-flicker' : ''}`}>
              {currentQuestion?.type === 'image' && currentQuestion.imageData && (
                <div className="text-6xl md:text-8xl mb-4">{currentQuestion.imageData}</div>
              )}
              {currentQuestion?.type === 'audio' && (
                <div className="text-4xl mb-2">🎵 🔊</div>
              )}
              <p className="text-[#f5f5e8] font-bold leading-relaxed" style={{ fontSize: (currentQuestion?.text?.length || 0) > 120 ? 'clamp(20px, 2.5vw, 36px)' : 'clamp(28px, 3.5vw, 48px)' }}>
                {currentQuestion?.text || 'Tidak ada soal'}
              </p>
              {showAnswer && currentQuestion?.answer && (
                <p className="text-[#ffe9a8] text-2xl mt-4 font-bold border-t-2 border-dashed border-[#ffe9a8]/30 pt-3">
                  💡 {hintRevealed ? currentQuestion.answer[0] + '...' : currentQuestion.answer}
                </p>
              )}
            </div>
          </div>
          {/* Narrator button */}
          {settings.narratorEnabled && currentQuestion && (
            <button onClick={(e) => { e.stopPropagation(); audio.playNarrator(currentQuestion.text); }}
              className="theater-btn px-4 h-10 bg-[#9b59b6] text-white text-sm mt-2">🔊 Bacakan Soal</button>
          )}
          {/* Navigation */}
          <div className="flex gap-2 mt-2 flex-wrap justify-center">
            <button onClick={(e) => { e.stopPropagation(); goPrevQuestion(); }} disabled={currentQ === 0} className="theater-btn px-4 h-12 bg-[#5c3a1e] text-white text-lg disabled:opacity-30">← Prev</button>
            <button onClick={(e) => { e.stopPropagation(); setShowAllQuestions(true); }} className="theater-btn px-4 h-12 bg-[#9b59b6] text-white text-lg">📋 Semua</button>
            <button onClick={(e) => { e.stopPropagation(); setShowAnswer(!showAnswer); }} className={`theater-btn px-4 h-12 text-white text-lg ${showAnswer ? 'bg-[#e67e22]' : 'bg-[#5c3a1e]'}`}>{showAnswer ? '🙈 Sembunyi' : '💡 Jawaban'}</button>
            <button onClick={(e) => { e.stopPropagation(); goNextQuestion(); }} disabled={currentQ === questions.length - 1} className="theater-btn px-4 h-12 bg-[#5c3a1e] text-white text-lg disabled:opacity-30">Next →</button>
          </div>
        </div>

        {/* Teams area */}
        <div className={`relative z-20 px-2 pb-2 ${teams.length > 5 ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap justify-center gap-2'}`}>
          {teams.map((team, idx) => {
            const moodEmoji = MOOD_EMOJIS[team.avatar]?.[team.mood] || team.avatar;
            return (
              <div key={team.id} onClick={(e) => { e.stopPropagation(); setActiveTeam(activeTeam === team.id ? null : team.id); }}
                className={`flex flex-col items-center p-2 rounded-xl transition-all cursor-pointer min-w-[100px] max-w-[180px] relative
                  ${activeTeam === team.id ? 'team-highlight' : ''} ${team.eliminated ? 'opacity-60' : ''}
                  ${team.shieldActive ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent' : ''}
                  ${team.doubleNext ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}
                style={{ backgroundColor: `${team.color}22`, border: `3px solid ${team.color}` }}>
                {/* Combo indicator */}
                {comboDisplay?.teamId === team.id && comboDisplay.count >= 3 && (
                  <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-2xl font-bold ${comboDisplay.count >= 5 ? 'mega-combo text-red-400' : 'combo-flash text-yellow-300'}`}>
                    {comboDisplay.count >= 5 ? '🔥 MEGA!' : '✨ COMBO!'} x{comboDisplay.count}
                  </div>
                )}
                {/* Character */}
                <div className={`text-3xl md:text-4xl transition-all ${team.eliminated ? 'opacity-0 scale-50' : ''} ${team.mood !== 'normal' ? 'mood-bounce' : ''}`}>
                  {moodEmoji}
                </div>
                {/* Name */}
                <div className="text-xs md:text-sm font-bold truncate max-w-full text-center px-1" style={{ color: team.color }}>{team.name}</div>
                {/* Score */}
                <div className={`text-xl md:text-2xl font-bold text-white ${scoreAnim === team.id ? 'score-pop' : ''}`}>{team.score}</div>
                {/* Lives */}
                <div className="flex gap-0.5 mb-1">
                  {[0, 1, 2].map(l => (
                    <button key={l} onClick={(e) => { e.stopPropagation(); if (l < team.lives) loseLife(idx); else restoreLife(idx); }}
                      className={`text-lg md:text-xl transition-all ${heartAnim?.teamId === team.id && heartAnim?.idx === l ? 'heart-bounce' : ''} ${l < team.lives ? 'text-red-500' : 'text-gray-600'} hover:scale-125`}>
                      {l < team.lives ? '♥' : '♡'}
                    </button>
                  ))}
                </div>
                {/* Power-ups */}
                {settings.powerupsEnabled && team.powerups.length > 0 && !team.eliminated && (
                  <div className="flex gap-1 mb-1">
                    {team.powerups.map((p, pi) => (
                      <button key={pi} onClick={(e) => { e.stopPropagation(); setShowPowerupSelect(idx); }}
                        className="w-7 h-7 rounded-full text-sm flex items-center justify-center" title={POWERUPS[p].name}
                        style={{ backgroundColor: POWERUPS[p].color + '44', border: `2px solid ${POWERUPS[p].color}` }}>
                        {POWERUPS[p].emoji}
                      </button>
                    ))}
                  </div>
                )}
                {/* Correct/Wrong buttons */}
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); markCorrect(idx); }} className="theater-btn w-12 h-10 md:w-14 md:h-12 bg-[#2ecc71] text-white text-xl md:text-2xl font-bold">✓</button>
                  <button onClick={(e) => { e.stopPropagation(); markWrong(idx); }} className="theater-btn w-12 h-10 md:w-14 md:h-12 bg-[#e74c3c] text-white text-xl md:text-2xl font-bold">✗</button>
                </div>
                {team.eliminated && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="text-4xl smoke-puff">💨</div></div>}
              </div>
            );
          })}
        </div>

        {/* MC Character */}
        <MCCharacter message={mcMessage} visible={settings.mcEnabled} />

        {/* Power-up selection modal */}
        {showPowerupSelect !== null && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setShowPowerupSelect(null); }}>
            <div className="bg-[#2a1810] rounded-2xl p-6 border-4 border-[#f5c542] max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-2xl text-[#f5c542] mb-4 text-center">🃏 Pilih Power-Up</h3>
              <p className="text-white text-center mb-4">Tim: {teams[showPowerupSelect]?.name}</p>
              <div className="grid grid-cols-2 gap-3">
                {teams[showPowerupSelect]?.powerups.map((p, i) => (
                  <button key={i} onClick={() => usePowerup(showPowerupSelect, p)}
                    className="powerup-card text-center p-3" style={{ borderColor: POWERUPS[p].color, color: POWERUPS[p].color }}>
                    <div className="text-3xl mb-1">{POWERUPS[p].emoji}</div>
                    <div className="font-bold text-sm">{POWERUPS[p].name}</div>
                    <div className="text-xs text-white/70">{POWERUPS[p].description}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowPowerupSelect(null)} className="theater-btn mt-4 w-full py-3 bg-gray-600 text-white">Batal</button>
            </div>
          </div>
        )}

        {/* Sabotage target selection */}
        {showSabotageSelect !== null && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setShowSabotageSelect(null); }}>
            <div className="bg-[#2a1810] rounded-2xl p-6 border-4 border-[#e74c3c] max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-2xl text-[#e74c3c] mb-4 text-center">✖️ Pilih Target Sabotase</h3>
              <div className="space-y-2">
                {teams.filter((_, i) => i !== showSabotageSelect).map(t => (
                  <button key={t.id} onClick={() => executeSabotage(t.id)}
                    className="w-full p-3 rounded-xl flex items-center gap-3 hover:bg-[#3d0608] transition-all" style={{ border: `2px solid ${t.color}` }}>
                    <span className="text-2xl">{t.avatar}</span>
                    <span className="font-bold" style={{ color: t.color }}>{t.name}</span>
                    <span className="ml-auto text-white">Skor: {t.score}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowSabotageSelect(null)} className="theater-btn mt-4 w-full py-3 bg-gray-600 text-white">Batal</button>
            </div>
          </div>
        )}

        {/* Help overlay */}
        {showHelp && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowHelp(false); }}>
            <div className="bg-[#2a1810] rounded-2xl p-6 max-w-2xl max-h-[80vh] overflow-auto border-4 border-[#f5c542]" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-3xl text-[#f5c542] mb-4">📖 Cara Main</h3>
              <div className="text-white space-y-2 text-base">
                <p>• Tekan <strong className="text-green-400">✓</strong> pada tim yang benar (+10 poin + confetti)</p>
                <p>• Tekan <strong className="text-red-400">✗</strong> pada tim yang salah (efek petir)</p>
                <p>• Tekan <strong className="text-red-400">♥</strong> untuk kurangi nyawa, <strong>♡</strong> untuk pulihkan</p>
                <p>• <strong>🃏 Power-Up:</strong> Klik ikon power-up di bawah tim untuk pakai</p>
                <p>• <strong>✨ Combo:</strong> 3x benar berturut-turut = COMBO! 5x = MEGA COMBO!</p>
                <p>• <strong>🎩 MC Virtual</strong> memberi komentar otomatis</p>
                <p>• <strong>🔊 Narator</strong> membacakan soal untuk murid</p>
                <h4 className="text-[#f5c542] font-bold mt-3">⌨️ Shortcut:</h4>
                <p>• <code className="bg-[#1a1210] px-2 rounded">1-9</code> = Benar | <code className="bg-[#1a1210] px-2 rounded">Shift+angka</code> = Salah</p>
                <p>• <code className="bg-[#1a1210] px-2 rounded">←/→</code> = Soal | <code className="bg-[#1a1210] px-2 rounded">U</code> = Undo | <code className="bg-[#1a1210] px-2 rounded">M</code> = Mute</p>
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
                  <button key={q.id} onClick={() => { setCurrentQ(i); setShowAllQuestions(false); setShowAnswer(false); if (settings.roundsEnabled) setCurrentRound(q.round); }}
                    className={`w-full text-left p-3 rounded-xl transition-all ${i === currentQ ? 'bg-[#f5c542] text-[#1a1210]' : 'bg-[#1a1210] text-white hover:bg-[#3d0608]'}`}>
                    <span className="font-bold mr-2">{i + 1}.</span>
                    <span className="text-xs px-1 rounded mr-1" style={{ backgroundColor: ROUND_THEMES[q.round || 1].color + '33', color: ROUND_THEMES[q.round || 1].color }}>B{q.round}</span>
                    {q.text}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAllQuestions(false)} className="theater-btn mt-4 px-6 py-3 bg-[#9b59b6] text-white text-lg">Tutup</button>
            </div>
          </div>
        )}

        {/* Intermission */}
        {showIntermission && (
          <div className="absolute inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setShowIntermission(false); }}>
            <div className="text-center" onClick={e => e.stopPropagation()}>
              <div className="text-8xl mb-4">🍿</div>
              <h2 className="font-display text-5xl text-[#f5c542] mb-4">INTERMISI</h2>
              <p className="text-white text-2xl mb-6">Istirahat sejenak...</p>
              <div className="bg-[#2a1810] rounded-xl p-4 max-w-md mx-auto border border-[#5c3a1e]">
                <p className="text-[#ffe9a8] text-lg">💡 <strong>Tips Sehat:</strong> Minum air putih, regangkan badan, dan tarik napas dalam!</p>
              </div>
              <div className="mt-4 text-white/60 text-sm">Skor sementara:</div>
              <div className="flex gap-3 justify-center mt-2 flex-wrap">
                {[...teams].sort((a, b) => b.score - a.score).map(t => (
                  <span key={t.id} className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: t.color + '33', color: t.color, border: `2px solid ${t.color}` }}>
                    {t.avatar} {t.name}: {t.score}
                  </span>
                ))}
              </div>
              <button onClick={() => setShowIntermission(false)} className="theater-btn mt-6 px-8 py-4 bg-[#f5c542] text-[#1a1210] text-xl">▶ Lanjutkan Pertunjukan</button>
            </div>
          </div>
        )}

        {/* End confirm */}
        {showEndConfirm && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setShowEndConfirm(false); }}>
            <div className="bg-[#2a1810] rounded-2xl p-8 border-4 border-[#e74c3c] text-center" onClick={e => e.stopPropagation()}>
              <p className="text-white text-2xl mb-6">Akhiri game dan lihat pemenang?</p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => {
                  setShowEndConfirm(false);
                  setCurtainState('closing');
                  if (settings.sound) audio.playDrumRoll();
                  setTimeout(() => { setScreen('winner'); setRevealIndex(-1); setCurtainState('closed'); }, 1500);
                }} className="theater-btn px-8 py-4 bg-[#e74c3c] text-white text-xl">🏁 Ya, Akhiri</button>
                <button onClick={() => setShowEndConfirm(false)} className="theater-btn px-8 py-4 bg-[#5c3a1e] text-white text-xl">Lanjutkan</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ===== SCREEN: WINNER =====
  const renderWinner = () => {
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    const top3 = ranked.slice(0, 3);
    const rest = ranked.slice(3);

    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden round-bg-3"
        onClick={(e) => fireConfettiAt(e.clientX, e.clientY)}>
        <AmbientParticles round={3} />
        <h2 className="font-display text-3xl md:text-5xl font-bold gold-shimmer mb-4 relative z-10">🏆 PAPAN JUARA 🏆</h2>
        {/* Podium */}
        <div className="flex items-end justify-center gap-4 mb-4 h-64 relative z-10">
          {top3[1] && revealIndex >= ranked.length - 3 && (
            <div className="podium-rise flex flex-col items-center">
              <div className={`text-4xl mb-2 ${revealIndex === ranked.length - 1 ? 'standing-ovation' : ''}`}>{MOOD_EMOJIS[top3[1].avatar]?.happy || top3[1].avatar}</div>
              <div className="text-sm font-bold" style={{ color: top3[1].color }}>{top3[1].name}</div>
              <div className="text-xs text-[#ffe9a8]">{CHAMPION_TITLES[1]}</div>
              <div className="bg-gradient-to-t from-gray-400 to-gray-300 w-28 h-28 rounded-t-xl flex items-center justify-center">
                <div className="text-center"><div className="text-3xl">🥈</div><div className="text-2xl font-bold text-[#1a1210]">{top3[1].score}</div></div>
              </div>
            </div>
          )}
          {top3[0] && revealIndex >= ranked.length - 1 && (
            <div className="podium-rise flex flex-col items-center">
              <div className="text-5xl mb-2 cursor-pointer hover:scale-125 transition-transform standing-ovation" onClick={(e) => { e.stopPropagation(); if (settings.sound) audio.playCorrect(); fireBigConfetti(); }}>
                {MOOD_EMOJIS[top3[0].avatar]?.excited || top3[0].avatar}
              </div>
              <div className="text-lg font-bold" style={{ color: top3[0].color }}>{top3[0].name}</div>
              <div className="text-sm text-[#ffe9a8] font-bold">{CHAMPION_TITLES[0]}</div>
              <div className="bg-gradient-to-t from-[#d4a017] to-[#f5c542] w-32 h-40 rounded-t-xl flex items-center justify-center relative">
                <div className="absolute -top-6 text-4xl">🏆✨</div>
                <div className="text-center"><div className="text-3xl">🥇</div><div className="text-3xl font-bold text-[#1a1210]">{top3[0].score}</div></div>
              </div>
            </div>
          )}
          {top3[2] && revealIndex >= ranked.length - 2 && (
            <div className="podium-rise flex flex-col items-center">
              <div className={`text-4xl mb-2 ${revealIndex === ranked.length - 1 ? 'standing-ovation' : ''}`}>{MOOD_EMOJIS[top3[2].avatar]?.happy || top3[2].avatar}</div>
              <div className="text-sm font-bold" style={{ color: top3[2].color }}>{top3[2].name}</div>
              <div className="text-xs text-[#ffe9a8]">{CHAMPION_TITLES[2]}</div>
              <div className="bg-gradient-to-t from-[#cd7f32] to-[#e8a850] w-28 h-20 rounded-t-xl flex items-center justify-center">
                <div className="text-center"><div className="text-3xl">🥉</div><div className="text-2xl font-bold text-[#1a1210]">{top3[2].score}</div></div>
              </div>
            </div>
          )}
        </div>
        {rest.length > 0 && revealIndex >= 0 && (
          <div className="flex flex-wrap justify-center gap-3 mb-4 relative z-10">
            {rest.map((team, i) => (
              <div key={team.id} className="bg-[#2a1810] rounded-xl px-4 py-2 border-2 flex items-center gap-2" style={{ borderColor: team.color }}>
                <span className="text-lg">{team.avatar}</span>
                <span className="font-bold" style={{ color: team.color }}>{i + 4}. {team.name}</span>
                <span className="text-white font-bold">{team.score}</span>
              </div>
            ))}
          </div>
        )}
        {/* Newly earned badges */}
        {newlyEarnedBadges.length > 0 && revealIndex >= ranked.length - 1 && (
          <div className="bg-[#2a1810] rounded-xl p-3 mb-3 border border-[#f5c542] relative z-10">
            <p className="text-[#f5c542] font-bold text-center mb-2">🏅 Lencana Baru Diraih!</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {newlyEarnedBadges.map((b, i) => (
                <div key={i} className="badge-earn text-center" style={{ animationDelay: `${i * 0.2}s` }}>
                  <div className="text-3xl">{b.emoji}</div>
                  <div className="text-xs text-white">{b.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {revealIndex >= ranked.length - 1 && (
          <div className="flex flex-wrap gap-2 justify-center relative z-10">
            <button onClick={(e) => { e.stopPropagation(); fireBigConfetti(); if (settings.sound) audio.playFanfare(); }} className="theater-btn px-4 py-3 bg-[#f5c542] text-[#1a1210] text-base">🎉 Rayakan</button>
            <button onClick={(e) => { e.stopPropagation(); setShowStats(true); }} className="theater-btn px-4 py-3 bg-[#9b59b6] text-white text-base">📊 Statistik</button>
            <button onClick={(e) => { e.stopPropagation(); setShowCertificate(true); }} className="theater-btn px-4 py-3 bg-[#e67e22] text-white text-base">📜 Sertifikat</button>
            <button onClick={(e) => {
              e.stopPropagation();
              const text = `Hasil Quiz Theater - ${new Date().toLocaleDateString('id-ID')}\n\n` + ranked.map((t, i) => `${i + 1}. ${t.name} — ${t.score} poin ${i === 0 ? CHAMPION_TITLES[0] : i === 1 ? CHAMPION_TITLES[1] : i === 2 ? CHAMPION_TITLES[2] : ''}`).join('\n');
              const blob = new Blob([text], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'hasil-quiz.txt'; a.click();
              URL.revokeObjectURL(url); showToast('Hasil diunduh!');
            }} className="theater-btn px-4 py-3 bg-[#3498db] text-white text-base">⬇ Unduh</button>
            <button onClick={(e) => {
              e.stopPropagation();
              setTeams(ts => ts.map(t => ({ ...t, score: 0, lives: 3, eliminated: false, combo: 0, maxCombo: 0, mood: 'normal', powerups: settings.powerupsEnabled ? ['shield', 'double'] as PowerupType[] : [], shieldActive: false, doubleNext: false, correctStreak: 0, totalCorrect: 0, totalWrong: 0 })));
              setHistory([]); setCurrentQ(0); setCurrentRound(1); setScreen('countdown'); setNewlyEarnedBadges([]);
              startCountdown();
            }} className="theater-btn px-4 py-3 bg-[#2ecc71] text-white text-base">🔄 Main Lagi</button>
            <button onClick={(e) => { e.stopPropagation(); startNewGame(); }} className="theater-btn px-4 py-3 bg-[#e74c3c] text-white text-base">✨ Game Baru</button>
          </div>
        )}
        {/* Stats */}
        {showStats && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowStats(false); }}>
            <div className="bg-[#2a1810] rounded-2xl p-6 max-w-2xl max-h-[80vh] overflow-auto border-4 border-[#9b59b6]" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-2xl text-[#f5c542] mb-4">📊 Statistik</h3>
              <div className="space-y-3">
                {ranked.map(team => (
                  <div key={team.id} className="bg-[#1a1210] rounded-xl p-3 border-2" style={{ borderColor: team.color }}>
                    <div className="flex items-center gap-2 mb-1"><span className="text-2xl">{team.avatar}</span><span className="font-bold text-lg" style={{ color: team.color }}>{team.name}</span></div>
                    <div className="text-white text-sm">Skor: <strong>{team.score}</strong> | Benar: <strong className="text-green-400">{team.totalCorrect}</strong> | Salah: <strong className="text-red-400">{team.totalWrong}</strong> | Max Combo: <strong className="text-yellow-400">{team.maxCombo}</strong> | Nyawa: <strong>{team.lives}/3</strong></div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowStats(false)} className="theater-btn mt-4 px-6 py-3 bg-[#9b59b6] text-white text-lg">Tutup</button>
            </div>
          </div>
        )}
        {/* Certificate */}
        {showCertificate && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowCertificate(false); }}>
            <div className="certificate max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <div className="text-center relative z-10">
                <p className="text-4xl mb-2">🎭 🏆 🎭</p>
                <h3 className="font-display text-3xl text-[#8b5a2b] mb-2">SERTIFIKAT APRESIASI</h3>
                <p className="text-sm text-gray-600 mb-4">Quiz Theater — {new Date().toLocaleDateString('id-ID')}</p>
                <div className="space-y-2 mb-4">
                  {ranked.slice(0, 3).map((t, i) => (
                    <div key={t.id} className="flex items-center justify-center gap-2">
                      <span className="text-2xl">{t.avatar}</span>
                      <span className="font-bold text-lg" style={{ color: t.color }}>{t.name}</span>
                      <span className="text-xl">{['🥇', '🥈', '🥉'][i]}</span>
                      <span className="text-sm text-gray-600">{CHAMPION_TITLES[i]}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600 italic">"Diberikan atas keberanian, kecerdasan, dan sportivitas di panggung Quiz Theater"</p>
                <p className="text-sm mt-4 text-gray-500">— Guru Pembina —</p>
              </div>
              <button onClick={() => setShowCertificate(false)} className="theater-btn mt-4 px-6 py-3 bg-[#8b5a2b] text-white text-lg w-full">Tutup</button>
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
      {screen !== 'countdown' && screen !== 'resume' && (
        <div className="absolute top-2 right-2 z-[200] flex gap-1">
          <button onClick={() => { toggleSound(); if (settings.sound) audio.playPop(); }} className="w-10 h-10 rounded-full bg-[#333]/80 text-white flex items-center justify-center text-lg hover:bg-[#555]">{settings.sound ? '🔊' : '🔇'}</button>
          <button onClick={toggleFullscreen} className="w-10 h-10 rounded-full bg-[#333]/80 text-white flex items-center justify-center text-lg hover:bg-[#555]">⛶</button>
        </div>
      )}
      {showResume && renderResume()}
      {!showResume && screen === 'teams-count' && renderTeamsCount()}
      {!showResume && screen === 'teams-setup' && renderTeamsSetup()}
      {!showResume && screen === 'program' && renderProgram()}
      {!showResume && screen === 'questions' && renderQuestions()}
      {!showResume && screen === 'ready' && renderReady()}
      {!showResume && screen === 'countdown' && renderCountdown()}
      {!showResume && screen === 'game' && renderGame()}
      {!showResume && screen === 'winner' && renderWinner()}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}


+++ src/App.tsx (修改后)
import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Screen, Team, Question, HistoryEntry, Settings, Badge, PowerupType, CharacterMood, RoundTheme,
  TEAM_COLORS, AVATARS, DEFAULT_SETTINGS, POWERUPS, BADGES, MOOD_EMOJIS,
  ROUND_THEMES, CHAMPION_TITLES,
} from './types';

// ===== STORAGE =====
const STORAGE_KEY = 'quiz-theater-v2';
const BADGES_KEY = 'quiz-theater-badges';
function saveState(s: any) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }
function loadState(): any { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function clearState() { try { localStorage.removeItem(STORAGE_KEY); } catch {} }
function loadBadges(): Badge[] { try { const r = localStorage.getItem(BADGES_KEY); return r ? JSON.parse(r) : []; } catch { return []; } }
function saveBadges(b: Badge[]) { try { localStorage.setItem(BADGES_KEY, JSON.stringify(b)); } catch {} }

// ===== CONFETTI =====
function fireConfetti(side: 'left' | 'right' | 'both') {
  const d = { spread: 70, ticks: 80, gravity: 0.8, decay: 0.94, startVelocity: 30, colors: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db', '#9b59b6'] };
  if (side === 'left' || side === 'both') confetti({ ...d, particleCount: 60, angle: 60, origin: { x: 0, y: 0.7 } });
  if (side === 'right' || side === 'both') confetti({ ...d, particleCount: 60, angle: 120, origin: { x: 1, y: 0.7 } });
}
function fireConfettiAt(x: number, y: number) {
  confetti({ particleCount: 30, spread: 50, origin: { x: x / window.innerWidth, y: y / window.innerHeight }, colors: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db'] });
}
function fireBigConfetti() {
  for (let i = 0; i < 5; i++) setTimeout(() => fireConfettiAt(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.5), i * 200);
}

// ===== TOAST =====
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
  return <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] toast-enter"><div className="bg-[#333] text-white px-6 py-3 rounded-xl shadow-2xl text-lg font-bold">{message}</div></div>;
}

// ===== AMBIENT PARTICLES =====
function AmbientParticles({ round }: { round: RoundTheme }) {
  const colors = { 1: ['#f5c542', '#f39c12'], 2: ['#9b59b6', '#3498db'], 3: ['#f5c542', '#fff'] };
  const particles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 8 + Math.random() * 12,
    delay: Math.random() * 10,
    color: colors[round][i % 2],
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full particle-float" style={{
          left: `${p.left}%`, width: p.size, height: p.size,
          backgroundColor: p.color, opacity: 0.4,
          animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
          boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
        }} />
      ))}
    </div>
  );
}

// ===== MAIN APP =====
export default function App() {
  const [screen, setScreen] = useState<Screen>('teams-count');
  const [teams, setTeams] = useState<Team[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [currentRound, setCurrentRound] = useState<RoundTheme>(1);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [activeTeam, setActiveTeam] = useState<number | null>(null);
  const [teamCount, setTeamCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const [curtainState, setCurtainState] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed');
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
  const [newQType, setNewQType] = useState<'text' | 'image' | 'audio'>('text');
  const [newQImage, setNewQImage] = useState('');
  const [comboDisplay, setComboDisplay] = useState<{teamId: number, count: number} | null>(null);
  const [showPowerupSelect, setShowPowerupSelect] = useState<number | null>(null);
  const [showSabotageSelect, setShowSabotageSelect] = useState<number | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [collectedBadges, setCollectedBadges] = useState<Badge[]>(loadBadges());
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState<Badge[]>([]);
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [showIntermission, setShowIntermission] = useState(false);
  const [shieldFlash, setShieldFlash] = useState<number | null>(null);
  const [hintRevealed, setHintRevealed] = useState(false);

  const timerRef = useRef<any>(null);
  const debounceRef = useRef(false);

  // Resume check
  useEffect(() => {
    const saved = loadState();
    if (saved && saved.screen && !['teams-count', 'teams-setup', 'questions', 'ready'].includes(saved.screen)) setShowResume(true);
  }, []);

  // Autosave
  useEffect(() => {
    if (screen === 'teams-count' && !showResume) return;
    saveState({ screen, teams, questions, currentQ, currentRound, settings, history, showAnswer, teamCount });
  }, [screen, teams, questions, currentQ, currentRound, settings, history, showAnswer, teamCount]);

  // Timer
  useEffect(() => {
    if (timerRunning && settings.timerEnabled) {
      timerRef.current = setInterval(() => {
        setTimerValue(prev => {
          if (prev <= 1) { setTimerRunning(false); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [timerRunning, settings.timerEnabled]);

  useEffect(() => {
    if (settings.timerEnabled && screen === 'game') { setTimerValue(settings.timerSeconds); setTimerRunning(true); }
    else setTimerRunning(false);
  }, [currentQ, screen, settings.timerEnabled, settings.timerSeconds]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showHelp || showAllQuestions || showStats) { if (e.key === 'Escape') { setShowHelp(false); setShowAllQuestions(false); setShowStats(false); } return; }
      if (screen === 'game') {
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNextQuestion(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); goPrevQuestion(); }
        if (e.key === 'u' || e.key === 'U') handleUndo();
        if (e.key === 'f' || e.key === 'F') toggleFullscreen();
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) { if (e.shiftKey) markWrong(num - 1); else markCorrect(num - 1); }
        if (e.key === '0' && teams.length === 10) { if (e.shiftKey) markWrong(9); else markCorrect(9); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, teams, currentQ, history, settings, showHelp, showAllQuestions, showStats]);

  // Winner reveal
  useEffect(() => {
    if (screen !== 'winner') return;
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    if (revealIndex < ranked.length - 1) {
      const timeout = setTimeout(() => {
        setRevealIndex(r => r + 1);
      }, revealIndex < 0 ? 500 : 1500);
      return () => clearTimeout(timeout);
    } else {
      awardBadges();
    }
  }, [revealIndex, screen, teams]);

  // Continuous confetti for winner
  useEffect(() => {
    if (screen !== 'winner') return;
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    if (revealIndex < ranked.length - 1) return;
    const interval = setInterval(() => {
      confetti({ particleCount: 20, spread: 60, origin: { x: Math.random(), y: Math.random() * 0.3 }, colors: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db', '#9b59b6'] });
    }, 1000);
    return () => clearInterval(interval);
  }, [screen, revealIndex, teams]);

  // Award badges
  const awardBadges = () => {
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    const newBadges: Badge[] = [];
    if (!collectedBadges.find(b => b.id === 'debut')) newBadges.push({ ...BADGES[0] });
    if (ranked[0] && ranked[0].score > 0) newBadges.push({ ...BADGES[4], earnedBy: ranked[0].id });
    if (ranked[1]) newBadges.push({ ...BADGES[5], earnedBy: ranked[1].id });
    if (ranked[2]) newBadges.push({ ...BADGES[6], earnedBy: ranked[2].id });
    teams.forEach(t => { if (t.maxCombo >= 3) newBadges.push({ ...BADGES[1], earnedBy: t.id }); });
    teams.forEach(t => { if (t.totalCorrect > 0 && t.totalWrong === 0) newBadges.push({ ...BADGES[2], earnedBy: t.id }); });
    teams.forEach(t => { if (t.lives > 0) newBadges.push({ ...BADGES[3], earnedBy: t.id }); });

    const unique = newBadges.filter(b => !collectedBadges.find(cb => cb.id === b.id && cb.earnedBy === b.earnedBy));
    if (unique.length > 0) {
      setCollectedBadges(prev => [...prev, ...unique]);
      saveBadges([...collectedBadges, ...unique]);
      setNewlyEarnedBadges(unique);
    }
  };

  // ===== GAME ACTIONS =====
  const showToast = (msg: string) => setToast(msg);
  const toggleFullscreen = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); };

  const handleUndo = () => {
    if (history.length === 0) { showToast('Tidak ada aksi untuk dibatalkan'); return; }
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setTeams(ts => ts.map(t => {
      if (t.id !== last.teamId) return t;
      let n = { ...t };
      if (last.type === 'correct') { n.score -= (last.scoreDelta || 10); n.totalCorrect--; }
      if (last.type === 'wrong') n.totalWrong--;
      if (last.type === 'lifeLost') { n.lives = Math.min(3, n.lives + 1); if (n.lives > 0) n.eliminated = false; }
      if (last.type === 'lifeRestored') { n.lives = Math.max(0, n.lives - 1); if (n.lives === 0) n.eliminated = true; }
      return n;
    }));
    showToast('Aksi dibatalkan');
  };

  const setMood = (teamId: number, mood: CharacterMood) => {
    setTeams(ts => ts.map(t => t.id === teamId ? { ...t, mood } : t));
    setTimeout(() => setTeams(ts => ts.map(t => t.id === teamId ? { ...t, mood: 'normal' } : t)), 2000);
  };

  const markCorrect = (teamIdx: number) => {
    if (debounceRef.current) return;
    debounceRef.current = true;
    setTimeout(() => debounceRef.current = false, 150);
    if (teamIdx >= teams.length) return;
    const team = teams[teamIdx];
    let points = 10;
    if (team.doubleNext) { points = 20; setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, doubleNext: false } : t)); }
    fireConfetti('both');
    setScoreAnim(team.id);
    setTimeout(() => setScoreAnim(null), 400);
    setMood(team.id, 'happy');
    // Combo
    const newCombo = team.combo + 1;
    const newStreak = team.correctStreak + 1;
    setTeams(ts => ts.map((t, i) => {
      if (i === teamIdx) return { ...t, score: t.score + points, combo: newCombo, correctStreak: newStreak, maxCombo: Math.max(t.maxCombo, newCombo), totalCorrect: t.totalCorrect + 1 };
      return { ...t, combo: 0, correctStreak: 0 };
    }));
    setComboDisplay({ teamId: team.id, count: newCombo });
    setTimeout(() => setComboDisplay(null), 1500);
    if (newCombo === 5) fireBigConfetti();
    setHistory(h => [...h, { type: 'correct', teamId: team.id, timestamp: Date.now(), scoreDelta: points }]);
    setHintRevealed(false);
  };

  const markWrong = (teamIdx: number) => {
    if (debounceRef.current) return;
    debounceRef.current = true;
    setTimeout(() => debounceRef.current = false, 150);
    if (teamIdx >= teams.length) return;
    const team = teams[teamIdx];
    // Shield check
    if (team.shieldActive) {
      setShieldFlash(team.id);
      setTimeout(() => setShieldFlash(null), 800);
      setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, shieldActive: false } : t));
      showToast(`🛡️ Perisai ${team.name} melindungi!`);
      setHistory(h => [...h, { type: 'powerup', teamId: team.id, timestamp: Date.now(), detail: 'shield' }]);
      return;
    }
    setShakeScreen(true);
    setTimeout(() => setShakeScreen(false), 400);
    setMood(team.id, 'sad');
    setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, combo: 0, correctStreak: 0, totalWrong: t.totalWrong + 1 } : t));
    setHistory(h => [...h, { type: 'wrong', teamId: team.id, timestamp: Date.now() }]);
    if (settings.autoLifeLoss) loseLife(teamIdx);
  };

  const loseLife = (teamIdx: number) => {
    const team = teams[teamIdx];
    if (team.lives <= 0) return;
    setHeartAnim({ teamId: team.id, idx: team.lives - 1 });
    setTimeout(() => setHeartAnim(null), 400);
    setTeams(ts => ts.map((t, i) => {
      if (i !== teamIdx) return t;
      const newLives = t.lives - 1;
      if (newLives <= 0) return { ...t, lives: 0, eliminated: true };
      return { ...t, lives: newLives };
    }));
    setHistory(h => [...h, { type: 'lifeLost', teamId: team.id, timestamp: Date.now(), livesDelta: -1 }]);
  };

  const restoreLife = (teamIdx: number) => {
    const team = teams[teamIdx];
    if (team.lives >= 3) return;
    setHeartAnim({ teamId: team.id, idx: team.lives });
    setTimeout(() => setHeartAnim(null), 400);
    setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, lives: t.lives + 1, eliminated: false } : t));
    setHistory(h => [...h, { type: 'lifeRestored', teamId: team.id, timestamp: Date.now(), livesDelta: 1 }]);
  };

  const goNextQuestion = () => {
    if (currentQ < questions.length - 1) {
      const next = currentQ + 1;
      if (settings.roundsEnabled) {
        const nextQ = questions[next];
        if (nextQ.round !== currentRound) {
          setCurrentRound(nextQ.round);
          setShowRoundTransition(true);
          setTimeout(() => setShowRoundTransition(false), 2500);
        }
      }
      setCurrentQ(next);
      setShowAnswer(false);
      setHintRevealed(false);
    }
  };

  const goPrevQuestion = () => {
    if (currentQ > 0) {
      const prev = currentQ - 1;
      if (settings.roundsEnabled) {
        const prevQ = questions[prev];
        if (prevQ.round !== currentRound) setCurrentRound(prevQ.round);
      }
      setCurrentQ(prev);
      setShowAnswer(false);
      setHintRevealed(false);
    }
  };

  // Power-up usage
  const usePowerup = (teamIdx: number, type: PowerupType) => {
    const team = teams[teamIdx];
    const idx = team.powerups.indexOf(type);
    if (idx === -1) return;
    const newPowerups = [...team.powerups];
    newPowerups.splice(idx, 1);
    switch (type) {
      case 'shield':
        setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, powerups: newPowerups, shieldActive: true } : t));
        showToast(`🛡️ ${team.name} mengaktifkan Perisai!`);
        break;
      case 'sabotage':
        setShowSabotageSelect(teamIdx);
        setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, powerups: newPowerups } : t));
        return;
      case 'hint':
        setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, powerups: newPowerups } : t));
        setHintRevealed(true);
        setShowAnswer(true);
        showToast(`🔮 Bocoran: ${questions[currentQ].answer ? questions[currentQ].answer[0] + '...' : 'Tidak ada jawaban'}`);
        break;
      case 'double':
        setTeams(ts => ts.map((t, i) => i === teamIdx ? { ...t, powerups: newPowerups, doubleNext: true } : t));
        showToast(`💎 ${team.name} mengaktifkan Poin Ganda!`);
        break;
    }
    setHistory(h => [...h, { type: 'powerup', teamId: team.id, timestamp: Date.now(), detail: type }]);
    setShowPowerupSelect(null);
  };

  const executeSabotage = (targetIdx: number) => {
    if (showSabotageSelect === null) return;
    const attacker = teams[showSabotageSelect];
    setTeams(ts => ts.map((t, i) => {
      if (i === targetIdx) return { ...t, score: Math.max(0, t.score - 10) };
      return t;
    }));
    showToast(`✖️ ${attacker.name} menyabotase! -10 poin!`);
    setShowSabotageSelect(null);
  };

  // Resume / New game
  const resumeGame = () => {
    const saved = loadState();
    if (saved) {
      setScreen(saved.screen || 'game');
      setTeams(saved.teams || []);
      setQuestions(saved.questions || []);
      setCurrentQ(saved.currentQuestionIndex || 0);
      setCurrentRound(saved.currentRound || 1);
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
    setTeams([]); setQuestions([]); setCurrentQ(0); setCurrentRound(1);
    setSettings({ ...DEFAULT_SETTINGS }); setHistory([]); setShowAnswer(false);
    setTeamCount(0); setShowResume(false); setHintRevealed(false);
  };

  // ===== SCREEN: TEAMS COUNT =====
  const renderTeamsCount = () => (
    <div className="w-full h-full flex flex-col items-center justify-center curtain-bg relative overflow-hidden">
      <AmbientParticles round={1} />
      <div className="absolute top-0 left-0 right-0 h-8 flex justify-around items-center z-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db'][i % 4], animation: `twinkle ${1 + (i % 3) * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.1}s`, boxShadow: `0 0 8px ${['#f5c542', '#d42a2f', '#2ecc71', '#3498db'][i % 4]}` }} />
        ))}
      </div>
      <h1 className="font-display text-5xl md:text-7xl font-bold mb-2 gold-shimmer relative z-10">🎭 QUIZ THEATER 🎭</h1>
      <p className="text-xl md:text-2xl text-[#ffe9a8] mb-8 font-semibold relative z-10">Cerdas Cermat Panggung Kelas</p>
      <p className="text-2xl md:text-3xl text-white mb-6 font-bold relative z-10">BERAPA TIM YANG AKAN BERMAIN?</p>
      <div className="flex flex-wrap justify-center gap-4 mb-8 max-w-3xl relative z-10">
        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <button key={n} onClick={() => setTeamCount(n)}
            className={`theater-btn w-20 h-20 text-3xl font-bold rounded-2xl transition-all ${teamCount === n ? 'bg-[#f5c542] text-[#1a1210] border-[#d4a017] scale-110 shadow-[0_0_20px_rgba(245,197,66,0.5)]' : 'bg-[#3d0608] text-white hover:bg-[#5a0a0e]'}`}>{n}</button>
        ))}
      </div>
      <button onClick={() => { if (teamCount > 0) setScreen('teams-setup'); }}
        disabled={teamCount === 0}
        className={`theater-btn px-12 py-4 text-2xl font-bold rounded-2xl relative z-10 ${teamCount > 0 ? 'bg-[#f5c542] text-[#1a1210] marquee-btn gentle-pulse' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>LANJUT →</button>
      {collectedBadges.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-[#2a1810]/80 rounded-xl p-3 border border-[#f5c542] z-10">
          <p className="text-[#f5c542] text-sm font-bold mb-1">🏆 Lencana Koleksi:</p>
          <div className="flex gap-1 flex-wrap max-w-xs">
            {collectedBadges.slice(-8).map((b, i) => <span key={i} className="text-xl" title={b.name}>{b.emoji}</span>)}
          </div>
        </div>
      )}
    </div>
  );

  // ===== SCREEN: TEAMS SETUP =====
  const renderTeamsSetup = () => (
    <div className="w-full h-full flex flex-col items-center p-4 md:p-6 curtain-bg relative overflow-auto">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-[#f5c542] mb-4">SUSUN TIMMU</h2>
      <div className="flex flex-wrap justify-center gap-4 mb-6 max-w-6xl">
        {Array.from({ length: teamCount }).map((_, idx) => {
          const defaultColor = TEAM_COLORS[idx % TEAM_COLORS.length];
          const team = teams[idx] || { id: idx, name: `Tim ${idx + 1}`, color: defaultColor, avatar: AVATARS[idx % AVATARS.length], score: 0, lives: 3, eliminated: false, answering: false, combo: 0, maxCombo: 0, mood: 'normal' as CharacterMood, powerups: settings.powerupsEnabled ? ['shield', 'double'] as PowerupType[] : [], activePowerup: null, shieldActive: false, doubleNext: false, correctStreak: 0, totalCorrect: 0, totalWrong: 0 };
          return (
            <div key={idx} className="bg-[#2a1810] rounded-2xl p-4 w-48 border-4 flex flex-col items-center" style={{ borderColor: team.color }}>
              <div className="text-5xl mb-2">{team.avatar}</div>
              <div className="flex gap-2 mb-2">
                <button onClick={() => { const nt = [...teams]; if (!nt[idx]) nt[idx] = { ...team }; const ci = AVATARS.indexOf(nt[idx].avatar); nt[idx].avatar = AVATARS[(ci - 1 + AVATARS.length) % AVATARS.length]; setTeams(nt); }} className="theater-btn w-10 h-10 bg-[#3d0608] text-white text-lg">◀</button>
                <button onClick={() => { const nt = [...teams]; if (!nt[idx]) nt[idx] = { ...team }; const ci = AVATARS.indexOf(nt[idx].avatar); nt[idx].avatar = AVATARS[(ci + 1) % AVATARS.length]; setTeams(nt); }} className="theater-btn w-10 h-10 bg-[#3d0608] text-white text-lg">▶</button>
              </div>
              <input type="text" value={team.name} placeholder={`Tim ${idx + 1}`} onChange={e => { const nt = [...teams]; if (!nt[idx]) nt[idx] = { ...team }; nt[idx].name = e.target.value || `Tim ${idx + 1}`; setTeams(nt); }}
                className="w-full text-center bg-[#1a1210] text-white rounded-lg px-3 py-2 text-lg font-bold border-2 border-[#5c3a1e] focus:border-[#f5c542] outline-none" />
              <div className="flex gap-1 mt-2">{[0, 1, 2].map(l => <span key={l} className="text-red-500 text-lg">♥</span>)}</div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4">
        <button onClick={() => setScreen('teams-count')} className="theater-btn px-8 py-3 text-xl bg-[#3d0608] text-white">← Kembali</button>
        <button onClick={() => {
          const finalTeams = Array.from({ length: teamCount }).map((_, idx) => {
            const existing = teams[idx];
            if (existing) return existing;
            return { id: idx, name: `Tim ${idx + 1}`, color: TEAM_COLORS[idx % TEAM_COLORS.length], avatar: AVATARS[idx % AVATARS.length], score: 0, lives: 3, eliminated: false, answering: false, combo: 0, maxCombo: 0, mood: 'normal' as CharacterMood, powerups: settings.powerupsEnabled ? ['shield', 'double'] as PowerupType[] : [], activePowerup: null, shieldActive: false, doubleNext: false, correctStreak: 0, totalCorrect: 0, totalWrong: 0 };
          });
          setTeams(finalTeams);
          setScreen('program');
        }} className="theater-btn px-8 py-3 text-xl bg-[#f5c542] text-[#1a1210]">Lanjut →</button>
      </div>
    </div>
  );

  // ===== SCREEN: PROGRAM BROCHURE =====
  const renderProgram = () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1210] p-6 relative overflow-auto">
      <AmbientParticles round={1} />
      <div className="program-brochure max-w-2xl w-full relative z-10">
        <div className="text-center mb-4">
          <p className="text-[#f5c542] font-display text-3xl font-bold">🎭 QUIZ THEATER PRESENTS 🎭</p>
          <p className="text-[#ffe9a8] text-lg mt-2">"Pertarungan Pengetahuan"</p>
          <p className="text-white text-sm mt-1">Dibintangi:</p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {teams.map(t => (
              <span key={t.id} className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: t.color + '33', color: t.color, border: `2px solid ${t.color}` }}>
                {t.avatar} {t.name}
              </span>
            ))}
          </div>
          <p className="text-white text-sm mt-4">Sutradara: Guru tercinta 👩‍🏫</p>
        </div>
        <div className="border-t-2 border-dashed border-[#f5c542]/30 my-4 pt-4">
          <p className="text-[#ffe9a8] text-center font-bold">ACARA MALAM INI:</p>
          {settings.roundsEnabled ? (
            <div className="mt-2 space-y-1">
              {([1, 2, 3] as RoundTheme[]).map(r => (
                <div key={r} className="flex items-center gap-2 text-white text-sm">
                  <span className="font-bold" style={{ color: ROUND_THEMES[r].color }}>Babak {r}:</span>
                  <span>{ROUND_THEMES[r].name} — {ROUND_THEMES[r].subtitle}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-white text-sm text-center mt-2">Pertunjukan Tunggal</p>}
        </div>
        <div className="flex justify-center gap-3 mt-4">
          <button onClick={() => setScreen('teams-setup')} className="theater-btn px-6 py-3 bg-[#3d0608] text-white">← Kembali</button>
          <button onClick={() => setScreen('questions')} className="theater-btn px-6 py-3 bg-[#f5c542] text-[#1a1210]">Lanjut →</button>
        </div>
      </div>
    </div>
  );

  // ===== SCREEN: QUESTIONS =====
  const renderQuestions = () => (
    <div className="w-full h-full flex flex-col p-4 md:p-6 bg-[#1a1210] overflow-auto">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-[#f5c542] mb-4 text-center">TULIS SOALNYA</h2>
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        {!showBulkInput ? (
          <>
            <div className="mb-4">
              <div className="flex gap-2 mb-2">
                {(['text', 'image'] as const).map(t => (
                  <button key={t} onClick={() => setNewQType(t)}
                    className={`theater-btn px-4 h-10 text-sm ${newQType === t ? 'bg-[#f5c542] text-[#1a1210]' : 'bg-[#3d0608] text-white'}`}>
                    {t === 'text' ? '📝 Teks' : '🖼️ Gambar'}
                  </button>
                ))}
              </div>
              <textarea value={editingQuestion !== null ? questions[editingQuestion]?.text || '' : newQText}
                onChange={e => { if (editingQuestion !== null) { const nq = [...questions]; nq[editingQuestion] = { ...nq[editingQuestion], text: e.target.value }; setQuestions(nq); } else setNewQText(e.target.value); }}
                placeholder={newQType === 'text' ? 'Tulis pertanyaan...' : 'Tulis pertanyaan untuk soal gambar'}
                className="w-full h-24 bg-[#2b3a2a] text-[#f5f5e8] rounded-xl p-4 text-lg border-4 border-[#8b5a2b] resize-none outline-none focus:border-[#f5c542]" />
              {newQType === 'image' && (
                <input type="text" value={editingQuestion !== null ? questions[editingQuestion]?.imageData || '' : newQImage}
                  onChange={e => { if (editingQuestion !== null) { const nq = [...questions]; nq[editingQuestion] = { ...nq[editingQuestion], imageData: e.target.value }; setQuestions(nq); } else setNewQImage(e.target.value); }}
                  placeholder="Emoji gambar (misal: 🌍 🐘 🏠)"
                  className="w-full mt-2 bg-[#1a1210] text-white rounded-xl p-3 text-lg border-2 border-[#5c3a1e] outline-none focus:border-[#f5c542]" />
              )}
              <input type="text" value={editingQuestion !== null ? questions[editingQuestion]?.answer || '' : newQAnswer}
                onChange={e => { if (editingQuestion !== null) { const nq = [...questions]; nq[editingQuestion] = { ...nq[editingQuestion], answer: e.target.value }; setQuestions(nq); } else setNewQAnswer(e.target.value); }}
                placeholder="Jawaban (opsional, untuk pegangan guru)"
                className="w-full mt-2 bg-[#1a1210] text-[#ffe9a8] rounded-xl p-3 text-lg border-2 border-[#5c3a1e] outline-none focus:border-[#f5c542]" />
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {editingQuestion !== null ? (
                <button onClick={() => { setEditingQuestion(null); setNewQText(''); setNewQAnswer(''); }} className="theater-btn px-6 py-3 bg-gray-600 text-white text-lg">Batal Edit</button>
              ) : (
                <button onClick={() => {
                  const text = newQText.trim();
                  if (!text) { showToast('Tulis soal terlebih dahulu'); return; }
                  const round = Math.min(3, Math.max(1, Math.ceil((questions.length + 1) / Math.ceil(questions.length / 3 || 1)))) as RoundTheme;
                  setQuestions(q => [...q, { id: Date.now().toString(), text, answer: newQAnswer.trim(), order: q.length, type: newQType, imageData: newQImage, round, difficulty: round === 1 ? 'easy' : round === 2 ? 'medium' : 'hard' }]);
                  setNewQText(''); setNewQAnswer(''); setNewQImage('');
                }} className="theater-btn px-6 py-3 bg-[#2ecc71] text-white text-lg">+ Tambah Soal</button>
              )}
              <button onClick={() => setShowBulkInput(true)} className="theater-btn px-6 py-3 bg-[#3498db] text-white text-lg">📋 Tempel Banyak</button>
              <button onClick={() => {
                const data = JSON.stringify(questions, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'bank-soal.json'; a.click();
                URL.revokeObjectURL(url); showToast('Bank soal diunduh!');
              }} className="theater-btn px-6 py-3 bg-[#9b59b6] text-white text-lg">⬇ Ekspor</button>
              <button onClick={() => {
                const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,.txt';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const content = ev.target?.result as string;
                      let imported: Question[];
                      if (file.name.endsWith('.json')) imported = JSON.parse(content);
                      else imported = content.split('\n').filter(l => l.trim()).map((line, i) => { const parts = line.split('|'); return { id: Date.now().toString() + i, text: parts[0].trim(), answer: (parts[1] || '').trim(), order: i, type: 'text' as const, round: 1 as RoundTheme, difficulty: 'easy' as const }; });
                      setQuestions(qs => [...qs, ...imported.map((item, i) => ({ ...item, id: item.id || Date.now().toString() + i, order: qs.length + i, type: item.type || 'text', round: item.round || 1, difficulty: item.difficulty || 'easy' }))]);
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
            <p className="text-[#ffe9a8] mb-2">Tempel soal (satu per baris). Format: soal | jawaban</p>
            <textarea value={bulkInput} onChange={e => setBulkInput(e.target.value)} placeholder="Soal 1 | Jawaban 1&#10;Soal 2 | Jawaban 2"
              className="w-full h-40 bg-[#2b3a2a] text-[#f5f5e8] rounded-xl p-4 text-lg border-4 border-[#8b5a2b] resize-none outline-none" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => {
                const lines = bulkInput.split('\n').filter(l => l.trim());
                const newQs = lines.map((line, i) => { const parts = line.split('|'); return { id: Date.now().toString() + i, text: parts[0].trim(), answer: (parts[1] || '').trim(), order: questions.length + i, type: 'text' as const, round: Math.min(3, Math.ceil((questions.length + i + 1) / Math.ceil((questions.length + lines.length) / 3))) as RoundTheme, difficulty: 'easy' as const }; });
                setQuestions(q => [...q, ...newQs]); setBulkInput(''); setShowBulkInput(false);
                showToast(`${newQs.length} soal ditambahkan!`);
              }} className="theater-btn px-6 py-3 bg-[#2ecc71] text-white text-lg">✓ Tambahkan</button>
              <button onClick={() => { setShowBulkInput(false); setBulkInput(''); }} className="theater-btn px-6 py-3 bg-gray-600 text-white text-lg">Batal</button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-auto mb-4">
          {questions.length === 0 ? <p className="text-center text-gray-400 text-xl py-8">Belum ada soal. Minimal 1 soal.</p> : (
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={q.id} className="flex items-center gap-2 bg-[#2a1810] rounded-xl p-3 border border-[#5c3a1e]">
                  <span className="text-[#f5c542] font-bold text-lg w-8">{i + 1}.</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: ROUND_THEMES[q.round || 1].color + '33', color: ROUND_THEMES[q.round || 1].color }}>B{q.round || 1}</span>
                  {q.type === 'image' && <span title="Soal Gambar">🖼️</span>}
                  <span className="flex-1 text-white text-lg truncate">{q.text}</span>
                  {q.answer && <span className="text-[#ffe9a8] text-sm">💡</span>}
                  <button onClick={() => { setEditingQuestion(i); setNewQText(q.text); setNewQAnswer(q.answer); }} className="theater-btn w-10 h-10 bg-[#3498db] text-white text-sm">✎</button>
                  <button onClick={() => setQuestions(qs => qs.filter((_, j) => j !== i))} className="theater-btn w-10 h-10 bg-[#e74c3c] text-white text-sm">🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-[#2a1810] rounded-xl p-4 mb-4 border border-[#5c3a1e]">
          <h3 className="text-[#f5c542] font-bold text-lg mb-2">⚙️ Pengaturan</h3>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" checked={settings.shuffleQuestions} onChange={e => setSettings(s => ({ ...s, shuffleQuestions: e.target.checked }))} className="w-5 h-5" />Acak urutan</label>
            <label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" checked={settings.timerEnabled} onChange={e => setSettings(s => ({ ...s, timerEnabled: e.target.checked }))} className="w-5 h-5" />Timer</label>
            {settings.timerEnabled && <select value={settings.timerSeconds} onChange={e => setSettings(s => ({ ...s, timerSeconds: parseInt(e.target.value) }))} className="bg-[#1a1210] text-white rounded-lg px-3 py-1 border border-[#5c3a1e]"><option value={15}>15d</option><option value={30}>30d</option><option value={60}>60d</option></select>}
            <label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" checked={settings.autoLifeLoss} onChange={e => setSettings(s => ({ ...s, autoLifeLoss: e.target.checked }))} className="w-5 h-5" />Nyawa otomatis</label>
            <label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" checked={settings.roundsEnabled} onChange={e => setSettings(s => ({ ...s, roundsEnabled: e.target.checked }))} className="w-5 h-5" />3 Babak</label>
            <label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" checked={settings.powerupsEnabled} onChange={e => setSettings(s => ({ ...s, powerupsEnabled: e.target.checked }))} className="w-5 h-5" />Power-Up</label>
          </div>
        </div>
        <div className="flex gap-4 justify-center">
          <button onClick={() => setScreen('program')} className="theater-btn px-8 py-3 text-xl bg-[#3d0608] text-white">← Kembali</button>
          <button onClick={() => {
            if (questions.length === 0) { showToast('Minimal 1 soal!'); return; }
            if (settings.shuffleQuestions) setQuestions(q => [...q].sort(() => Math.random() - 0.5));
            setScreen('ready');
          }} disabled={questions.length === 0} className={`theater-btn px-8 py-3 text-xl ${questions.length > 0 ? 'bg-[#f5c542] text-[#1a1210]' : 'bg-gray-600 text-gray-400'}`}>Lanjut →</button>
        </div>
      </div>
    </div>
  );

  // ===== SCREEN: READY =====
  const renderReady = () => (
    <div className="w-full h-full flex flex-col items-center justify-center curtain-bg relative">
      <AmbientParticles round={1} />
      <h2 className="font-display text-4xl font-bold text-[#f5c542] mb-6 relative z-10">SIAP BERMAIN!</h2>
      <div className="bg-[#2a1810] rounded-2xl p-6 mb-6 border-2 border-[#5c3a1e] max-w-lg relative z-10">
        <p className="text-white text-xl mb-2"><strong>Tim:</strong> {teams.map(t => t.name).join(', ')}</p>
        <p className="text-white text-xl mb-2"><strong>Soal:</strong> {questions.length}</p>
        <p className="text-white text-xl"><strong>Mode:</strong>{settings.roundsEnabled && ' 3 Babak'}{settings.timerEnabled && ` Timer ${settings.timerSeconds}s`}{settings.powerupsEnabled && ' | Power-Up'}</p>
      </div>
      <button onClick={() => { setScreen('countdown'); startCountdown(); }}
        className="theater-btn px-16 py-6 text-4xl font-bold bg-[#f5c542] text-[#1a1210] marquee-btn rounded-2xl relative z-10">🎬 MULAI!</button>
      <button onClick={() => setScreen('questions')} className="theater-btn px-8 py-3 text-xl bg-[#3d0608] text-white mt-4 relative z-10">← Kembali</button>
    </div>
  );

  const startCountdown = () => {
    let num = 5; setCountdownNum(num);
    const interval = setInterval(() => {
      num--;
      if (num > 0) setCountdownNum(num);
      else {
        clearInterval(interval); setCountdownNum(null);
        setCurtainState('opening');
        setTimeout(() => {
          setScreen('game'); setCurtainState('open');
          setCurrentQ(0); setCurrentRound(1);
          setTeams(ts => ts.map(t => ({ ...t, score: 0, lives: 3, eliminated: false, combo: 0, maxCombo: 0, mood: 'normal', powerups: settings.powerupsEnabled ? ['shield', 'double'] as PowerupType[] : [], shieldActive: false, doubleNext: false, correctStreak: 0, totalCorrect: 0, totalWrong: 0 })));
          setHistory([]); setShowAnswer(false); setHintRevealed(false);
        }, 1500);
      }
    }, 1000);
  };

  const renderCountdown = () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1a1210] relative">
      <div className={`absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#3d0608] via-[#7a0c10] to-[#d42a2f] ${curtainState === 'opening' ? 'curtain-left-open' : ''}`} />
      <div className={`absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#3d0608] via-[#7a0c10] to-[#d42a2f] ${curtainState === 'opening' ? 'curtain-right-open' : ''}`} />
      {countdownNum !== null ? <div key={countdownNum} className="countdown-number font-display text-[200px] font-bold text-[#f5c542]" style={{ textShadow: '0 0 40px rgba(245,197,66,0.5)' }}>{countdownNum}</div>
        : curtainState === 'opening' ? <div className="countdown-number font-display text-[120px] font-bold gold-shimmer">GO!</div> : null}
    </div>
  );

  // ===== SCREEN: GAME ARENA =====
  const renderGame = () => {
    const currentQuestion = questions[currentQ];
    const roundTheme = ROUND_THEMES[currentRound];

    return (
      <div className={`w-full h-full flex flex-col relative overflow-hidden ${shakeScreen ? 'screen-shake' : ''} round-bg-${currentRound}`}>
        <AmbientParticles round={currentRound} />
        {/* Curtains on sides */}
        <div className="absolute top-0 left-0 w-12 md:w-20 h-full bg-gradient-to-r from-[#7a0c10] via-[#d42a2f] to-transparent opacity-50 z-[1]" />
        <div className="absolute top-0 right-0 w-12 md:w-20 h-full bg-gradient-to-l from-[#7a0c10] via-[#d42a2f] to-transparent opacity-50 z-[1]" />
        {/* Stage floor */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] stage-floor z-[1]" />
        {/* Closing curtains */}
        {curtainState === 'closing' && (
          <>
            <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#3d0608] via-[#7a0c10] to-[#d42a2f] curtain-left-close z-[100]" />
            <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#3d0608] via-[#7a0c10] to-[#d42a2f] curtain-right-close z-[100]" />
          </>
        )}
        {/* String lights */}
        <div className="absolute top-0 left-0 right-0 h-6 flex justify-around items-center z-10">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#f5c542', '#d42a2f', '#2ecc71', '#3498db'][i % 4], animation: `twinkle ${1 + (i % 3) * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.08}s`, boxShadow: `0 0 6px ${['#f5c542', '#d42a2f', '#2ecc71', '#3498db'][i % 4]}` }} />
          ))}
        </div>

        {/* Shield flash */}
        {shieldFlash !== null && (
          <div className="absolute inset-0 z-50 pointer-events-none bg-blue-400/20" style={{ animation: 'spotlight-flicker 0.4s ease-out 2' }} />
        )}

        {/* Round transition */}
        {showRoundTransition && (
          <div className="absolute inset-0 z-[200] bg-black/80 flex items-center justify-center">
            <div className="round-transition text-center">
              <div className="text-8xl mb-4 clapboard-snap">🎬</div>
              <h2 className="font-display text-5xl font-bold" style={{ color: roundTheme.color }}>{roundTheme.name}</h2>
              <p className="text-2xl text-white mt-2">{roundTheme.subtitle}</p>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="relative z-20 flex items-center justify-between px-3 py-2 bg-[#1a1210]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg md:text-xl font-bold" style={{ color: roundTheme.color }}>🎭 {roundTheme.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); handleUndo(); }} className="theater-btn w-12 h-12 bg-[#3498db] text-white text-xl" title="Undo">↩</button>
            <button onClick={(e) => { e.stopPropagation(); setShowIntermission(true); }} className="theater-btn w-12 h-12 bg-[#5c3a1e] text-white text-xl" title="Intermission">🍿</button>
            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="theater-btn w-12 h-12 bg-[#5c3a1e] text-white text-xl">⛶</button>
            <button onClick={(e) => { e.stopPropagation(); setShowHelp(true); }} className="theater-btn w-12 h-12 bg-[#5c3a1e] text-white text-xl">?</button>
            <button onClick={(e) => { e.stopPropagation(); setShowEndConfirm(true); }} className="theater-btn px-4 h-12 bg-[#e74c3c] text-white text-lg font-bold">🏁 AKHIRI</button>
          </div>
        </div>

        {/* Question area */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-2 px-4">
          <div className="spotlight-cone w-[80%] h-32 absolute top-8" />
          <div className="text-[#ffe9a8] text-lg font-bold mb-1 flex items-center gap-3">
            <span>Soal {currentQ + 1}/{questions.length}</span>
            {settings.timerEnabled && <span className={`${timerValue <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>⏱ {Math.floor(timerValue / 60)}:{(timerValue % 60).toString().padStart(2, '0')}</span>}
          </div>
          <div className="chalkboard w-full max-w-4xl p-6 md:p-8 relative">
            <div className="text-center">
              {currentQuestion?.type === 'image' && currentQuestion.imageData && (
                <div className="text-6xl md:text-8xl mb-4">{currentQuestion.imageData}</div>
              )}
              <p className="text-[#f5f5e8] font-bold leading-relaxed" style={{ fontSize: (currentQuestion?.text?.length || 0) > 120 ? 'clamp(20px, 2.5vw, 36px)' : 'clamp(28px, 3.5vw, 48px)' }}>
                {currentQuestion?.text || 'Tidak ada soal'}
              </p>
              {showAnswer && currentQuestion?.answer && (
                <p className="text-[#ffe9a8] text-2xl mt-4 font-bold border-t-2 border-dashed border-[#ffe9a8]/30 pt-3">
                  💡 {hintRevealed ? currentQuestion.answer[0] + '...' : currentQuestion.answer}
                </p>
              )}
            </div>
          </div>
          {/* Navigation */}
          <div className="flex gap-2 mt-2 flex-wrap justify-center">
            <button onClick={(e) => { e.stopPropagation(); goPrevQuestion(); }} disabled={currentQ === 0} className="theater-btn px-4 h-12 bg-[#5c3a1e] text-white text-lg disabled:opacity-30">← Prev</button>
            <button onClick={(e) => { e.stopPropagation(); setShowAllQuestions(true); }} className="theater-btn px-4 h-12 bg-[#9b59b6] text-white text-lg">📋 Semua</button>
            <button onClick={(e) => { e.stopPropagation(); setShowAnswer(!showAnswer); }} className={`theater-btn px-4 h-12 text-white text-lg ${showAnswer ? 'bg-[#e67e22]' : 'bg-[#5c3a1e]'}`}>{showAnswer ? '🙈 Sembunyi' : '💡 Jawaban'}</button>
            <button onClick={(e) => { e.stopPropagation(); goNextQuestion(); }} disabled={currentQ === questions.length - 1} className="theater-btn px-4 h-12 bg-[#5c3a1e] text-white text-lg disabled:opacity-30">Next →</button>
          </div>
        </div>

        {/* Teams area - FIXED LAYOUT */}
        <div className={`relative z-20 px-2 pb-2 ${teams.length <= 5 ? 'flex flex-wrap justify-center gap-2' : 'grid gap-2'} ${teams.length > 5 ? (teams.length <= 6 ? 'grid-cols-3' : teams.length <= 8 ? 'grid-cols-4' : 'grid-cols-5') : ''}`}>
          {teams.map((team, idx) => {
            const moodEmoji = MOOD_EMOJIS[team.avatar]?.[team.mood] || team.avatar;
            return (
              <div key={team.id} onClick={(e) => { e.stopPropagation(); setActiveTeam(activeTeam === team.id ? null : team.id); }}
                className={`flex flex-col items-center p-2 rounded-xl transition-all cursor-pointer ${teams.length > 5 ? 'min-w-0' : 'min-w-[100px] max-w-[180px]'} relative
                  ${activeTeam === team.id ? 'team-highlight' : ''} ${team.eliminated ? 'opacity-60' : ''}
                  ${team.shieldActive ? 'ring-2 ring-blue-400' : ''} ${team.doubleNext ? 'ring-2 ring-yellow-400' : ''}`}
                style={{ backgroundColor: `${team.color}22`, border: `3px solid ${team.color}` }}>
                {/* Combo indicator */}
                {comboDisplay?.teamId === team.id && comboDisplay.count >= 3 && (
                  <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-xl font-bold ${comboDisplay.count >= 5 ? 'mega-combo text-red-400' : 'combo-flash text-yellow-300'}`}>
                    {comboDisplay.count >= 5 ? '🔥 MEGA!' : '✨ COMBO!'} x{comboDisplay.count}
                  </div>
                )}
                {/* Character */}
                <div className={`${teams.length > 5 ? 'text-2xl' : 'text-3xl md:text-4xl'} transition-all ${team.eliminated ? 'opacity-0 scale-50' : ''} ${team.mood !== 'normal' ? 'mood-bounce' : ''}`}>
                  {moodEmoji}
                </div>
                {/* Name */}
                <div className={`${teams.length > 5 ? 'text-xs' : 'text-xs md:text-sm'} font-bold truncate max-w-full text-center px-1`} style={{ color: team.color }}>{team.name}</div>
                {/* Score */}
                <div className={`${teams.length > 5 ? 'text-lg' : 'text-xl md:text-2xl'} font-bold text-white ${scoreAnim === team.id ? 'score-pop' : ''}`}>{team.score}</div>
                {/* Lives */}
                <div className="flex gap-0.5 mb-1">
                  {[0, 1, 2].map(l => (
                    <button key={l} onClick={(e) => { e.stopPropagation(); if (l < team.lives) loseLife(idx); else restoreLife(idx); }}
                      className={`${teams.length > 5 ? 'text-sm' : 'text-lg md:text-xl'} transition-all ${heartAnim?.teamId === team.id && heartAnim?.idx === l ? 'heart-bounce' : ''} ${l < team.lives ? 'text-red-500' : 'text-gray-600'} hover:scale-125`}>
                      {l < team.lives ? '♥' : '♡'}
                    </button>
                  ))}
                </div>
                {/* Power-ups */}
                {settings.powerupsEnabled && team.powerups.length > 0 && !team.eliminated && (
                  <div className="flex gap-1 mb-1">
                    {team.powerups.map((p, pi) => (
                      <button key={pi} onClick={(e) => { e.stopPropagation(); setShowPowerupSelect(idx); }}
                        className="w-6 h-6 rounded-full text-xs flex items-center justify-center" title={POWERUPS[p].name}
                        style={{ backgroundColor: POWERUPS[p].color + '44', border: `2px solid ${POWERUPS[p].color}` }}>
                        {POWERUPS[p].emoji}
                      </button>
                    ))}
                  </div>
                )}
                {/* Correct/Wrong buttons */}
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); markCorrect(idx); }} className={`theater-btn ${teams.length > 5 ? 'w-10 h-8' : 'w-12 h-10 md:w-14 md:h-12'} bg-[#2ecc71] text-white ${teams.length > 5 ? 'text-lg' : 'text-xl md:text-2xl'} font-bold`}>✓</button>
                  <button onClick={(e) => { e.stopPropagation(); markWrong(idx); }} className={`theater-btn ${teams.length > 5 ? 'w-10 h-8' : 'w-12 h-10 md:w-14 md:h-12'} bg-[#e74c3c] text-white ${teams.length > 5 ? 'text-lg' : 'text-xl md:text-2xl'} font-bold`}>✗</button>
                </div>
                {team.eliminated && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="text-4xl smoke-puff">💨</div></div>}
              </div>
            );
          })}
        </div>

        {/* Intermission */}
        {showIntermission && (
          <div className="absolute inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setShowIntermission(false); }}>
            <div className="text-center" onClick={e => e.stopPropagation()}>
              <div className="text-8xl mb-4">🍿</div>
              <h2 className="font-display text-5xl text-[#f5c542] mb-4">INTERMISI</h2>
              <p className="text-white text-2xl mb-6">Istirahat sejenak...</p>
              <div className="bg-[#2a1810] rounded-xl p-4 max-w-md mx-auto border border-[#5c3a1e]">
                <p className="text-[#ffe9a8] text-lg">💡 <strong>Tips Sehat:</strong> Minum air putih, regangkan badan, dan tarik napas dalam!</p>
              </div>
              <div className="mt-4 text-white/60 text-sm">Skor sementara:</div>
              <div className="flex gap-3 justify-center mt-2 flex-wrap">
                {[...teams].sort((a, b) => b.score - a.score).map(t => (
                  <span key={t.id} className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: t.color + '33', color: t.color, border: `2px solid ${t.color}` }}>
                    {t.avatar} {t.name}: {t.score}
                  </span>
                ))}
              </div>
              <button onClick={() => setShowIntermission(false)} className="theater-btn mt-6 px-8 py-4 bg-[#f5c542] text-[#1a1210] text-xl">▶ Lanjutkan Pertunjukan</button>
            </div>
          </div>
        )}

        {/* Power-up selection */}
        {showPowerupSelect !== null && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setShowPowerupSelect(null); }}>
            <div className="bg-[#2a1810] rounded-2xl p-6 border-4 border-[#f5c542] max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-2xl text-[#f5c542] mb-4 text-center">🃏 Pilih Power-Up</h3>
              <p className="text-white text-center mb-4">Tim: {teams[showPowerupSelect]?.name}</p>
              <div className="grid grid-cols-2 gap-3">
                {teams[showPowerupSelect]?.powerups.map((p, i) => (
                  <button key={i} onClick={() => usePowerup(showPowerupSelect, p)}
                    className="powerup-card text-center p-3" style={{ borderColor: POWERUPS[p].color, color: POWERUPS[p].color }}>
                    <div className="text-3xl mb-1">{POWERUPS[p].emoji}</div>
                    <div className="font-bold text-sm">{POWERUPS[p].name}</div>
                    <div className="text-xs text-white/70">{POWERUPS[p].description}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowPowerupSelect(null)} className="theater-btn mt-4 w-full py-3 bg-gray-600 text-white">Batal</button>
            </div>
          </div>
        )}

        {/* Sabotage target */}
        {showSabotageSelect !== null && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setShowSabotageSelect(null); }}>
            <div className="bg-[#2a1810] rounded-2xl p-6 border-4 border-[#e74c3c] max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-2xl text-[#e74c3c] mb-4 text-center">✖️ Pilih Target Sabotase</h3>
              <div className="space-y-2">
                {teams.filter((_, i) => i !== showSabotageSelect).map(t => (
                  <button key={t.id} onClick={() => executeSabotage(t.id)}
                    className="w-full p-3 rounded-xl flex items-center gap-3 hover:bg-[#3d0608] transition-all" style={{ border: `2px solid ${t.color}` }}>
                    <span className="text-2xl">{t.avatar}</span>
                    <span className="font-bold" style={{ color: t.color }}>{t.name}</span>
                    <span className="ml-auto text-white">Skor: {t.score}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowSabotageSelect(null)} className="theater-btn mt-4 w-full py-3 bg-gray-600 text-white">Batal</button>
            </div>
          </div>
        )}

        {/* Help */}
        {showHelp && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowHelp(false); }}>
            <div className="bg-[#2a1810] rounded-2xl p-6 max-w-2xl max-h-[80vh] overflow-auto border-4 border-[#f5c542]" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-3xl text-[#f5c542] mb-4">📖 Cara Main</h3>
              <div className="text-white space-y-2 text-base">
                <p>• Tekan <strong className="text-green-400">✓</strong> pada tim yang benar (+10 poin + confetti)</p>
                <p>• Tekan <strong className="text-red-400">✗</strong> pada tim yang salah (layar bergetar)</p>
                <p>• Tekan <strong className="text-red-400">♥</strong> untuk kurangi nyawa, <strong>♡</strong> untuk pulihkan</p>
                <p>• <strong>🃏 Power-Up:</strong> Klik ikon power-up di bawah tim untuk pakai</p>
                <p>• <strong>✨ Combo:</strong> 3x benar berturut-turut = COMBO! 5x = MEGA COMBO!</p>
                <h4 className="text-[#f5c542] font-bold mt-3">⌨️ Shortcut:</h4>
                <p>• <code className="bg-[#1a1210] px-2 rounded">1-9</code> = Benar | <code className="bg-[#1a1210] px-2 rounded">Shift+angka</code> = Salah</p>
                <p>• <code className="bg-[#1a1210] px-2 rounded">←/→</code> = Soal | <code className="bg-[#1a1210] px-2 rounded">U</code> = Undo</p>
              </div>
              <button onClick={() => setShowHelp(false)} className="theater-btn mt-4 px-6 py-3 bg-[#f5c542] text-[#1a1210] text-lg">Tutup (Esc)</button>
            </div>
          </div>
        )}

        {/* All questions */}
        {showAllQuestions && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowAllQuestions(false); }}>
            <div className="bg-[#2a1810] rounded-2xl p-6 max-w-3xl max-h-[80vh] overflow-auto border-4 border-[#9b59b6]" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-2xl text-[#f5c542] mb-4">📋 Semua Soal</h3>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <button key={q.id} onClick={() => { setCurrentQ(i); setShowAllQuestions(false); setShowAnswer(false); if (settings.roundsEnabled) setCurrentRound(q.round); }}
                    className={`w-full text-left p-3 rounded-xl transition-all ${i === currentQ ? 'bg-[#f5c542] text-[#1a1210]' : 'bg-[#1a1210] text-white hover:bg-[#3d0608]'}`}>
                    <span className="font-bold mr-2">{i + 1}.</span>
                    <span className="text-xs px-1 rounded mr-1" style={{ backgroundColor: ROUND_THEMES[q.round || 1].color + '33', color: ROUND_THEMES[q.round || 1].color }}>B{q.round}</span>
                    {q.text}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAllQuestions(false)} className="theater-btn mt-4 px-6 py-3 bg-[#9b59b6] text-white text-lg">Tutup</button>
            </div>
          </div>
        )}

        {/* End confirm */}
        {showEndConfirm && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setShowEndConfirm(false); }}>
            <div className="bg-[#2a1810] rounded-2xl p-8 border-4 border-[#e74c3c] text-center" onClick={e => e.stopPropagation()}>
              <p className="text-white text-2xl mb-6">Akhiri game dan lihat pemenang?</p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => {
                  setShowEndConfirm(false);
                  setCurtainState('closing');
                  setTimeout(() => { setScreen('winner'); setRevealIndex(-1); setCurtainState('closed'); }, 1500);
                }} className="theater-btn px-8 py-4 bg-[#e74c3c] text-white text-xl">🏁 Ya, Akhiri</button>
                <button onClick={() => setShowEndConfirm(false)} className="theater-btn px-8 py-4 bg-[#5c3a1e] text-white text-xl">Lanjutkan</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ===== SCREEN: WINNER =====
  const renderWinner = () => {
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    const top3 = ranked.slice(0, 3);
    const rest = ranked.slice(3);

    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden round-bg-3"
        onClick={(e) => fireConfettiAt(e.clientX, e.clientY)}>
        <AmbientParticles round={3} />
        <h2 className="font-display text-3xl md:text-5xl font-bold gold-shimmer mb-4 relative z-10">🏆 PAPAN JUARA 🏆</h2>
        <div className="flex items-end justify-center gap-4 mb-4 h-64 relative z-10">
          {top3[1] && revealIndex >= ranked.length - 3 && (
            <div className="podium-rise flex flex-col items-center">
              <div className={`text-4xl mb-2 ${revealIndex === ranked.length - 1 ? 'standing-ovation' : ''}`}>{MOOD_EMOJIS[top3[1].avatar]?.happy || top3[1].avatar}</div>
              <div className="text-sm font-bold" style={{ color: top3[1].color }}>{top3[1].name}</div>
              <div className="text-xs text-[#ffe9a8]">{CHAMPION_TITLES[1]}</div>
              <div className="bg-gradient-to-t from-gray-400 to-gray-300 w-28 h-28 rounded-t-xl flex items-center justify-center">
                <div className="text-center"><div className="text-3xl">🥈</div><div className="text-2xl font-bold text-[#1a1210]">{top3[1].score}</div></div>
              </div>
            </div>
          )}
          {top3[0] && revealIndex >= ranked.length - 1 && (
            <div className="podium-rise flex flex-col items-center">
              <div className="text-5xl mb-2 cursor-pointer hover:scale-125 transition-transform standing-ovation" onClick={(e) => { e.stopPropagation(); fireBigConfetti(); }}>
                {MOOD_EMOJIS[top3[0].avatar]?.excited || top3[0].avatar}
              </div>
              <div className="text-lg font-bold" style={{ color: top3[0].color }}>{top3[0].name}</div>
              <div className="text-sm text-[#ffe9a8] font-bold">{CHAMPION_TITLES[0]}</div>
              <div className="bg-gradient-to-t from-[#d4a017] to-[#f5c542] w-32 h-40 rounded-t-xl flex items-center justify-center relative">
                <div className="absolute -top-6 text-4xl">🏆✨</div>
                <div className="text-center"><div className="text-3xl">🥇</div><div className="text-3xl font-bold text-[#1a1210]">{top3[0].score}</div></div>
              </div>
            </div>
          )}
          {top3[2] && revealIndex >= ranked.length - 2 && (
            <div className="podium-rise flex flex-col items-center">
              <div className={`text-4xl mb-2 ${revealIndex === ranked.length - 1 ? 'standing-ovation' : ''}`}>{MOOD_EMOJIS[top3[2].avatar]?.happy || top3[2].avatar}</div>
              <div className="text-sm font-bold" style={{ color: top3[2].color }}>{top3[2].name}</div>
              <div className="text-xs text-[#ffe9a8]">{CHAMPION_TITLES[2]}</div>
              <div className="bg-gradient-to-t from-[#cd7f32] to-[#e8a850] w-28 h-20 rounded-t-xl flex items-center justify-center">
                <div className="text-center"><div className="text-3xl">🥉</div><div className="text-2xl font-bold text-[#1a1210]">{top3[2].score}</div></div>
              </div>
            </div>
          )}
        </div>
        {rest.length > 0 && revealIndex >= 0 && (
          <div className="flex flex-wrap justify-center gap-3 mb-4 relative z-10">
            {rest.map((team, i) => (
              <div key={team.id} className="bg-[#2a1810] rounded-xl px-4 py-2 border-2 flex items-center gap-2" style={{ borderColor: team.color }}>
                <span className="text-lg">{team.avatar}</span>
                <span className="font-bold" style={{ color: team.color }}>{i + 4}. {team.name}</span>
                <span className="text-white font-bold">{team.score}</span>
              </div>
            ))}
          </div>
        )}
        {newlyEarnedBadges.length > 0 && revealIndex >= ranked.length - 1 && (
          <div className="bg-[#2a1810] rounded-xl p-3 mb-3 border border-[#f5c542] relative z-10">
            <p className="text-[#f5c542] font-bold text-center mb-2">🏅 Lencana Baru Diraih!</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {newlyEarnedBadges.map((b, i) => (
                <div key={i} className="badge-earn text-center" style={{ animationDelay: `${i * 0.2}s` }}>
                  <div className="text-3xl">{b.emoji}</div>
                  <div className="text-xs text-white">{b.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {revealIndex >= ranked.length - 1 && (
          <div className="flex flex-wrap gap-2 justify-center relative z-10">
            <button onClick={(e) => { e.stopPropagation(); fireBigConfetti(); }} className="theater-btn px-4 py-3 bg-[#f5c542] text-[#1a1210] text-base">🎉 Rayakan</button>
            <button onClick={(e) => { e.stopPropagation(); setShowStats(true); }} className="theater-btn px-4 py-3 bg-[#9b59b6] text-white text-base">📊 Statistik</button>
            <button onClick={(e) => { e.stopPropagation(); setShowCertificate(true); }} className="theater-btn px-4 py-3 bg-[#e67e22] text-white text-base">📜 Sertifikat</button>
            <button onClick={(e) => {
              e.stopPropagation();
              const text = `Hasil Quiz Theater - ${new Date().toLocaleDateString('id-ID')}\n\n` + ranked.map((t, i) => `${i + 1}. ${t.name} — ${t.score} poin ${i === 0 ? CHAMPION_TITLES[0] : i === 1 ? CHAMPION_TITLES[1] : i === 2 ? CHAMPION_TITLES[2] : ''}`).join('\n');
              const blob = new Blob([text], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'hasil-quiz.txt'; a.click();
              URL.revokeObjectURL(url); showToast('Hasil diunduh!');
            }} className="theater-btn px-4 py-3 bg-[#3498db] text-white text-base">⬇ Unduh</button>
            <button onClick={(e) => {
              e.stopPropagation();
              setTeams(ts => ts.map(t => ({ ...t, score: 0, lives: 3, eliminated: false, combo: 0, maxCombo: 0, mood: 'normal', powerups: settings.powerupsEnabled ? ['shield', 'double'] as PowerupType[] : [], shieldActive: false, doubleNext: false, correctStreak: 0, totalCorrect: 0, totalWrong: 0 })));
              setHistory([]); setCurrentQ(0); setCurrentRound(1); setScreen('countdown'); setNewlyEarnedBadges([]);
              startCountdown();
            }} className="theater-btn px-4 py-3 bg-[#2ecc71] text-white text-base">🔄 Main Lagi</button>
            <button onClick={(e) => { e.stopPropagation(); startNewGame(); }} className="theater-btn px-4 py-3 bg-[#e74c3c] text-white text-base">✨ Game Baru</button>
          </div>
        )}
        {/* Stats */}
        {showStats && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowStats(false); }}>
            <div className="bg-[#2a1810] rounded-2xl p-6 max-w-2xl max-h-[80vh] overflow-auto border-4 border-[#9b59b6]" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-2xl text-[#f5c542] mb-4">📊 Statistik</h3>
              <div className="space-y-3">
                {ranked.map(team => (
                  <div key={team.id} className="bg-[#1a1210] rounded-xl p-3 border-2" style={{ borderColor: team.color }}>
                    <div className="flex items-center gap-2 mb-1"><span className="text-2xl">{team.avatar}</span><span className="font-bold text-lg" style={{ color: team.color }}>{team.name}</span></div>
                    <div className="text-white text-sm">Skor: <strong>{team.score}</strong> | Benar: <strong className="text-green-400">{team.totalCorrect}</strong> | Salah: <strong className="text-red-400">{team.totalWrong}</strong> | Max Combo: <strong className="text-yellow-400">{team.maxCombo}</strong> | Nyawa: <strong>{team.lives}/3</strong></div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowStats(false)} className="theater-btn mt-4 px-6 py-3 bg-[#9b59b6] text-white text-lg">Tutup</button>
            </div>
          </div>
        )}
        {/* Certificate */}
        {showCertificate && (
          <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowCertificate(false); }}>
            <div className="certificate max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <div className="text-center relative z-10">
                <p className="text-4xl mb-2">🎭 🏆 🎭</p>
                <h3 className="font-display text-3xl text-[#8b5a2b] mb-2">SERTIFIKAT APRESIASI</h3>
                <p className="text-sm text-gray-600 mb-4">Quiz Theater — {new Date().toLocaleDateString('id-ID')}</p>
                <div className="space-y-2 mb-4">
                  {ranked.slice(0, 3).map((t, i) => (
                    <div key={t.id} className="flex items-center justify-center gap-2">
                      <span className="text-2xl">{t.avatar}</span>
                      <span className="font-bold text-lg" style={{ color: t.color }}>{t.name}</span>
                      <span className="text-xl">{['🥇', '🥈', '🥉'][i]}</span>
                      <span className="text-sm text-gray-600">{CHAMPION_TITLES[i]}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600 italic">"Diberikan atas keberanian, kecerdasan, dan sportivitas di panggung Quiz Theater"</p>
                <p className="text-sm mt-4 text-gray-500">— Guru Pembina —</p>
              </div>
              <button onClick={() => setShowCertificate(false)} className="theater-btn mt-4 px-6 py-3 bg-[#8b5a2b] text-white text-lg w-full">Tutup</button>
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
      {screen !== 'countdown' && screen !== 'resume' && (
        <div className="absolute top-2 right-2 z-[200] flex gap-1">
          <button onClick={toggleFullscreen} className="w-10 h-10 rounded-full bg-[#333]/80 text-white flex items-center justify-center text-lg hover:bg-[#555]">⛶</button>
        </div>
      )}
      {showResume && renderResume()}
      {!showResume && screen === 'teams-count' && renderTeamsCount()}
      {!showResume && screen === 'teams-setup' && renderTeamsSetup()}
      {!showResume && screen === 'program' && renderProgram()}
      {!showResume && screen === 'questions' && renderQuestions()}
      {!showResume && screen === 'ready' && renderReady()}
      {!showResume && screen === 'countdown' && renderCountdown()}
      {!showResume && screen === 'game' && renderGame()}
      {!showResume && screen === 'winner' && renderWinner()}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
