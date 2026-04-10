import React, { useEffect, useMemo, useState } from 'react';

type TeamId = 'A' | 'B';
type OperationMode = 'add' | 'sub' | 'mul' | 'mix';

type Question = {
  a: number;
  b: number;
  op: '+' | '-' | 'x';
  answer: number;
  label: string;
};

const MAX_PULL = 5;

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

type JeenieMathTugOfWarProps = {
  fullscreen?: boolean;
};

const buildQuestion = (round: number, mode: OperationMode): Question => {
  const op =
    mode === 'mix'
      ? pickRandom<Question['op']>(['+', '-', 'x'])
      : mode === 'add'
        ? '+'
        : mode === 'sub'
          ? '-'
          : 'x';

  // Gentle difficulty scaling so younger students can still participate.
  const level = Math.min(4, Math.floor((round - 1) / 3) + 1);

  if (op === '+') {
    const max = level === 1 ? 20 : level === 2 ? 40 : level === 3 ? 70 : 100;
    const a = Math.floor(Math.random() * max) + 1;
    const b = Math.floor(Math.random() * max) + 1;
    return { a, b, op, answer: a + b, label: `${a} + ${b} = ?` };
  }

  if (op === '-') {
    const max = level === 1 ? 20 : level === 2 ? 50 : level === 3 ? 80 : 120;
    const high = Math.floor(Math.random() * max) + 10;
    const low = Math.floor(Math.random() * Math.max(2, high - 1)) + 1;
    return { a: high, b: low, op, answer: high - low, label: `${high} - ${low} = ?` };
  }

  const multMax = level === 1 ? 6 : level === 2 ? 9 : level === 3 ? 12 : 15;
  const a = Math.floor(Math.random() * multMax) + 2;
  const b = Math.floor(Math.random() * multMax) + 2;
  return { a, b, op, answer: a * b, label: `${a} x ${b} = ?` };
};

const JeenieMathTugOfWar: React.FC<JeenieMathTugOfWarProps> = ({ fullscreen = false }) => {
  const [mode, setMode] = useState<OperationMode>('mix');
  const [maxRounds, setMaxRounds] = useState<number>(10);

  const [round, setRound] = useState<number>(1);
  const [question, setQuestion] = useState<Question>(() => buildQuestion(1, 'mix'));

  const [teamAInput, setTeamAInput] = useState<string>('');
  const [teamBInput, setTeamBInput] = useState<string>('');

  const [teamAScore, setTeamAScore] = useState<number>(0);
  const [teamBScore, setTeamBScore] = useState<number>(0);
  const [ropePull, setRopePull] = useState<number>(0);

  const [secondsLeft, setSecondsLeft] = useState<number>(20);
  const [roundLocked, setRoundLocked] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Solve and hit ENTER to pull the rope.');

  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winnerText, setWinnerText] = useState<string>('');
  const [pullFlashWinner, setPullFlashWinner] = useState<TeamId | null>(null);

  // Team Blue is shown on the left; positive pull should move flag left.
  const markerPercent = useMemo(() => 50 - ropePull * 8, [ropePull]);

  useEffect(() => {
    if (gameOver || roundLocked) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [gameOver, roundLocked]);

  useEffect(() => {
    if (!gameOver && !roundLocked && secondsLeft === 0) {
      resolveRound(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, gameOver, roundLocked]);

  const prepareNextRound = (nextRound: number) => {
    setRound(nextRound);
    setQuestion(buildQuestion(nextRound, mode));
    setTeamAInput('');
    setTeamBInput('');
    setSecondsLeft(20);
    setRoundLocked(false);
    setPullFlashWinner(null);
    setStatusText('New round started. Solve fast!');
  };

  const finishGame = (nextA: number, nextB: number, nextPull: number) => {
    setGameOver(true);

    if (Math.abs(nextPull) >= MAX_PULL) {
      setWinnerText(nextPull > 0 ? 'Team Blue wins by rope pull!' : 'Team Orange wins by rope pull!');
      return;
    }

    if (nextA > nextB) {
      setWinnerText('Team Blue wins on points!');
    } else if (nextB > nextA) {
      setWinnerText('Team Orange wins on points!');
    } else {
      setWinnerText('It is a draw. Great battle from both teams!');
    }
  };

  const resolveRound = (winner: TeamId | null) => {
    if (roundLocked || gameOver) return;

    setRoundLocked(true);

    const nextA = winner === 'A' ? teamAScore + 1 : teamAScore;
    const nextB = winner === 'B' ? teamBScore + 1 : teamBScore;
    const nextPull = winner === 'A' ? ropePull + 1 : winner === 'B' ? ropePull - 1 : ropePull;

    setTeamAScore(nextA);
    setTeamBScore(nextB);
    setRopePull(nextPull);
    setPullFlashWinner(winner);

    if (winner === 'A') setStatusText('Team Blue answered correctly first. Rope pulled left.');
    if (winner === 'B') setStatusText('Team Orange answered correctly first. Rope pulled right.');
    if (winner === null) setStatusText('Time up. No pull this round.');

    const lastRoundReached = round >= maxRounds;
    const edgeReached = Math.abs(nextPull) >= MAX_PULL;

    if (lastRoundReached || edgeReached) {
      window.setTimeout(() => finishGame(nextA, nextB, nextPull), 900);
      return;
    }

    window.setTimeout(() => prepareNextRound(round + 1), 1100);
  };

  const submitAnswer = (team: TeamId) => {
    if (roundLocked || gameOver) return;
    const rawValue = team === 'A' ? teamAInput : teamBInput;
    const parsed = Number(rawValue.trim());
    if (rawValue.trim() === '' || Number.isNaN(parsed)) return;

    if (parsed === question.answer) {
      resolveRound(team);
    } else {
      setStatusText(`${team === 'A' ? 'Team Blue' : 'Team Orange'} guessed ${parsed}. Try again.`);
    }
  };

  const appendKey = (team: TeamId, key: string) => {
    if (roundLocked || gameOver) return;

    const setValue = team === 'A' ? setTeamAInput : setTeamBInput;
    const getValue = team === 'A' ? teamAInput : teamBInput;

    if (key === 'C') {
      setValue('');
      return;
    }

    if (key === 'DEL') {
      setValue(getValue.slice(0, -1));
      return;
    }

    if (key === 'ENTER') {
      submitAnswer(team);
      return;
    }

    if (/^[0-9-]$/.test(key)) {
      if (key === '-' && getValue.includes('-')) return;
      if (getValue.length >= 6) return;
      if (key === '-' && getValue.length > 0) return;
      setValue(getValue + key);
    }
  };

  const resetAll = () => {
    setRound(1);
    setQuestion(buildQuestion(1, mode));
    setTeamAInput('');
    setTeamBInput('');
    setTeamAScore(0);
    setTeamBScore(0);
    setRopePull(0);
    setSecondsLeft(20);
    setRoundLocked(false);
    setGameOver(false);
    setWinnerText('');
    setPullFlashWinner(null);
    setStatusText('Fresh game started. Solve and pull!');
  };

  useEffect(() => {
    // Keep question mode in sync when teacher changes operation set.
    setQuestion(buildQuestion(round, mode));
    setTeamAInput('');
    setTeamBInput('');
    setStatusText('Operation mode updated. Continue playing.');
  }, [mode, round]);

  const keypad = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', 'DEL'];
  const isCompact = fullscreen;
  const bluePull = Math.max(0, ropePull);
  const orangePull = Math.max(0, -ropePull);
  const ropeCurve = ropePull * 18;

  return (
    <div
      style={{
        ...styles.pageWrap,
        ...(isCompact
          ? {
              height: '100%',
              minHeight: 0,
              padding: 8,
              gap: 8,
              gridTemplateRows: 'auto auto auto auto minmax(0, 1fr)',
            }
          : {}),
      }}
    >
      <style>{`
        .jm-card {
          background: #ffffff;
          border: 1px solid #d9e3f3;
          border-radius: 16px;
          box-shadow: 0 8px 28px rgba(1, 48, 98, 0.08);
        }
        .jm-btn {
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
          transition: transform 120ms ease, box-shadow 160ms ease, opacity 160ms ease;
        }
        .jm-btn:active {
          transform: translateY(1px);
        }
        .jm-k {
          background: #e6eeff;
          color: #013062;
          min-height: 38px;
          font-size: 14px;
        }
        .jm-k:hover {
          box-shadow: 0 6px 16px rgba(1, 48, 98, 0.15);
        }
        .jm-status {
          animation: jmPulse 1.6s ease infinite;
        }
        @keyframes jmPulse {
          0% { box-shadow: 0 0 0 0 rgba(1, 48, 98, 0.20); }
          70% { box-shadow: 0 0 0 10px rgba(1, 48, 98, 0); }
          100% { box-shadow: 0 0 0 0 rgba(1, 48, 98, 0); }
        }
      `}</style>

      <div style={{ ...styles.controlsBar, ...(isCompact ? { padding: 8 } : {}) }} className="jm-card">
        <div style={styles.controls}>
          <label style={styles.controlLabel}>
            Mode
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as OperationMode)}
              style={styles.select}
              disabled={gameOver}
            >
              <option value="mix">Mixed</option>
              <option value="add">Addition</option>
              <option value="sub">Subtraction</option>
              <option value="mul">Multiplication</option>
            </select>
          </label>

          <label style={styles.controlLabel}>
            Rounds
            <select
              value={maxRounds}
              onChange={(e) => setMaxRounds(Number(e.target.value))}
              style={styles.select}
              disabled={gameOver}
            >
              <option value={8}>8</option>
              <option value={10}>10</option>
              <option value={12}>12</option>
              <option value={15}>15</option>
            </select>
          </label>

          <button className="jm-btn" style={styles.resetBtn} onClick={resetAll}>
            Restart
          </button>
        </div>
      </div>

      <div style={{ ...styles.mainGrid, ...(isCompact ? { gap: 8 } : {}) }}>
        <TeamPanel
          teamName="Team Blue"
          inputValue={teamAInput}
          onInputChange={setTeamAInput}
          onSubmit={() => submitAnswer('A')}
          onKey={(key) => appendKey('A', key)}
          keypad={keypad}
          accent="#013062"
          soft="#e6eeff"
          disabled={roundLocked || gameOver}
          compact={isCompact}
          score={teamAScore}
        />

        <div style={{ ...styles.sceneCard, ...(isCompact ? { padding: 8 } : {}) }} className="jm-card">
          <div style={{ ...styles.sceneToolbar, ...(isCompact ? { marginBottom: 6 } : {}) }}>
            <div style={styles.roundMeta}>Round {round}/{maxRounds}</div>
            <div style={styles.timerMeta}>Time: {secondsLeft}s</div>
            <div style={styles.questionPill}>{question.label}</div>
          </div>

          <div style={styles.sceneStage} className={pullFlashWinner ? `winner-${pullFlashWinner}` : ''}>
            <svg viewBox="0 0 900 390" role="img" aria-label="JEEnie tug of war illustration" style={styles.sceneSvg}>
              <defs>
                <linearGradient id="skyGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#f8fbff" />
                  <stop offset="100%" stopColor="#e8f0ff" />
                </linearGradient>
                <linearGradient id="groundGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#edf4ff" />
                </linearGradient>
                <linearGradient id="flagGrad" x1="0%" x2="100%">
                  <stop offset="0%" stopColor="#013062" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#c96512" />
                </linearGradient>
                <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#013062" floodOpacity="0.12" />
                </filter>
              </defs>

              <rect x="0" y="0" width="900" height="390" rx="24" fill="url(#skyGrad)" />
              <circle cx="450" cy="110" r="110" fill="#dce9ff" opacity="0.45" />
              <circle cx="450" cy="110" r="58" fill="#fefefe" opacity="0.5" />
              <path d="M 0 286 C 170 252, 310 248, 450 274 C 595 300, 720 288, 900 254 L 900 390 L 0 390 Z" fill="url(#groundGrad)" />
              <path d="M 0 303 C 170 278, 305 276, 450 296 C 595 317, 730 310, 900 280" stroke="#c9d8ef" strokeWidth="3" fill="none" strokeLinecap="round" />
              <line x1="450" y1="96" x2="450" y2="330" stroke="#013062" strokeWidth="2.5" strokeDasharray="6 8" opacity="0.45" />

              <g transform={`translate(${440 + ropePull * 2} 175)`}>
                <path d={`M -260 22 C -140 ${18 + ropeCurve} -54 ${18 - ropeCurve * 0.4} 0 22 C 54 ${26 + ropeCurve * 0.4} 140 ${20 - ropeCurve} 260 22`} fill="none" stroke="#8c6d43" strokeWidth="9" strokeLinecap="round" />
                <path d={`M -260 22 C -140 ${18 + ropeCurve} -54 ${18 - ropeCurve * 0.4} 0 22 C 54 ${26 + ropeCurve * 0.4} 140 ${20 - ropeCurve} 260 22`} fill="none" stroke="#c29b6a" strokeWidth="3" strokeDasharray="10 11" strokeLinecap="round" opacity="0.65" />
                <rect x="-10" y="6" width="20" height="32" rx="10" fill="#013062" filter="url(#softShadow)" />
                <rect x="-16" y="12" width="32" height="18" rx="4" fill="url(#flagGrad)" />
                <rect x="-1" y="-38" width="2" height="54" fill="#1a2f55" />
                <path d="M 1 -37 L 42 -29 L 1 -20 Z" fill="#013062" />
              </g>

              <g className="blue-team" transform={`translate(${112 - bluePull * 8} ${232 + bluePull * 1.5}) rotate(${ -11 - bluePull * 1.8})`}>
                <PlayerArt x={0} y={0} color="#013062" facing="right" tilt={0} pull={bluePull} jerseyLabel="J" winner={pullFlashWinner === 'A'} />
                <PlayerArt x={82} y={6} color="#2a6ccf" facing="right" tilt={2} pull={bluePull} jerseyLabel="J" winner={pullFlashWinner === 'A'} />
                <circle cx="36" cy="126" r="18" fill="#f7fbff" opacity="0.65" />
              </g>

              <g className="orange-team" transform={`translate(${682 + orangePull * 8} ${232 + orangePull * 1.5}) rotate(${11 + orangePull * 1.8})`}>
                <PlayerArt x={0} y={0} color="#c96512" facing="left" tilt={0} pull={orangePull} jerseyLabel="J" winner={pullFlashWinner === 'B'} />
                <PlayerArt x={82} y={6} color="#ef7f1d" facing="left" tilt={-2} pull={orangePull} jerseyLabel="J" winner={pullFlashWinner === 'B'} />
                <circle cx="36" cy="126" r="18" fill="#fff8ef" opacity="0.7" />
              </g>
            </svg>
          </div>

          <div style={styles.sceneFooter}>
            <div style={styles.sceneStatus}>{statusText}</div>
            <button className="jm-btn" style={styles.skipBtn} onClick={() => resolveRound(null)} disabled={roundLocked || gameOver}>
              Skip Round
            </button>
          </div>
        </div>

        <TeamPanel
          teamName="Team Orange"
          inputValue={teamBInput}
          onInputChange={setTeamBInput}
          onSubmit={() => submitAnswer('B')}
          onKey={(key) => appendKey('B', key)}
          keypad={keypad}
          accent="#c96512"
          soft="#fff2e6"
          disabled={roundLocked || gameOver}
          compact={isCompact}
          score={teamBScore}
        />
      </div>

      {gameOver ? (
        <div style={styles.winnerBanner} className="jm-card jm-status">
          <strong style={{ color: '#013062', fontSize: 20 }}>{winnerText}</strong>
          <p style={{ margin: '8px 0 0', color: '#3b4f72' }}>Tap Restart to play again with your class.</p>
        </div>
      ) : null}
    </div>
  );
};

type TeamPanelProps = {
  teamName: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onKey: (key: string) => void;
  keypad: string[];
  accent: string;
  soft: string;
  disabled: boolean;
  compact?: boolean;
  score: number;
};

type PlayerArtProps = {
  x: number;
  y: number;
  color: string;
  facing: 'left' | 'right';
  tilt: number;
  pull: number;
  jerseyLabel: string;
  winner: boolean;
};

const PlayerArt: React.FC<PlayerArtProps> = ({ x, y, color, facing, tilt, pull, jerseyLabel, winner }) => {
   const direction = facing === 'left' ? -1 : 1;
   const swing = tilt + direction * Math.min(10, pull * 1.6);
   const push = winner ? direction * 12 : direction * Math.min(10, pull * 2.2);
 
   return (
     <g transform={`translate(${x + push} ${y}) scale(${direction} 1) rotate(${swing})`}>
       <ellipse cx="0" cy="120" rx="42" ry="12" fill="rgba(15,39,75,0.16)" />
       <circle cx="0" cy="28" r="16" fill="#f2c39b" stroke="rgba(0,0,0,0.08)" strokeWidth="2" />
       <path d="M -20 52 Q 0 42 20 52 L 14 94 Q 0 106 -14 94 Z" fill={color} />
       <rect x="-20" y="52" width="40" height="28" rx="11" fill={color} opacity="0.9" />
       <text x="0" y="71" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="800">{jerseyLabel}</text>
       <path d="M -18 59 L -44 88" stroke={color} strokeWidth="8" strokeLinecap="round" />
       <path d="M 18 59 L 40 81" stroke={color} strokeWidth="8" strokeLinecap="round" />
       <path d="M -9 92 L -20 126" stroke="#10294f" strokeWidth="9" strokeLinecap="round" />
       <path d="M 9 92 L 22 126" stroke="#10294f" strokeWidth="9" strokeLinecap="round" />
       <path d="M -22 126 L -42 126" stroke="#10294f" strokeWidth="8" strokeLinecap="round" />
       <path d="M 22 126 L 44 126" stroke="#10294f" strokeWidth="8" strokeLinecap="round" />
     </g>
   );
 };

const TeamPanel: React.FC<TeamPanelProps> = ({
  teamName,
  inputValue,
  onInputChange,
  onSubmit,
  onKey,
  keypad,
  accent,
  soft,
  disabled,
  compact = false,
  score,
}) => {
  return (
    <div style={{ ...styles.teamPanel, borderColor: accent, ...(compact ? { padding: 10 } : {}) }} className="jm-card">
      <div style={styles.panelHeadRow}>
        <h3 style={{ ...styles.teamTitle, color: accent }}>{teamName}</h3>
        <div style={{ ...styles.teamScorePill, background: soft, color: accent }}>{score}</div>
      </div>

      <input
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value.replace(/[^0-9-]/g, '').slice(0, 6))}
        placeholder="Type answer"
        style={{ ...styles.answerInput, borderColor: accent, background: soft, ...(compact ? { fontSize: 17, marginBottom: 8, padding: '8px 10px' } : {}) }}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
      />

      <div style={styles.keypadGrid}>
        {keypad.map((key) => (
          <button
            key={`${teamName}-${key}`}
            className="jm-btn jm-k"
            style={{
              background: soft,
              color: accent,
              minHeight: compact ? 32 : 38,
              opacity: disabled ? 0.6 : 1,
            }}
            onClick={() => onKey(key)}
            disabled={disabled}
          >
            {key}
          </button>
        ))}
      </div>

      <div style={styles.teamActions}>
        <button
          className="jm-btn"
          style={{ ...styles.actionBtn, background: accent, ...(compact ? { padding: '8px 8px' } : {}) }}
          onClick={onSubmit}
          disabled={disabled}
        >
          ENTER
        </button>
        <button
          className="jm-btn"
          style={{ ...styles.actionBtnSecondary, color: accent, borderColor: accent, ...(compact ? { padding: '8px 8px' } : {}) }}
          onClick={() => onKey('C')}
          disabled={disabled}
        >
          CLEAR
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageWrap: {
    background: 'linear-gradient(180deg, #f7faff 0%, #eef4ff 100%)',
    border: '1px solid #d8e3f5',
    borderRadius: 20,
    padding: 16,
    display: 'grid',
    gridTemplateRows: 'auto auto auto auto auto',
    gap: 14,
    width: '100%',
    fontFamily: 'Saira, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    color: '#132340',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    padding: 16,
    flexWrap: 'wrap',
  },
  brandTag: {
    margin: 0,
    fontSize: 12,
    fontWeight: 700,
    color: '#013062',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  title: {
    margin: '3px 0 4px',
    fontSize: 28,
    lineHeight: 1.1,
    color: '#013062',
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    color: '#425776',
  },
  controls: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  controlsBar: {
    padding: 10,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  controlLabel: {
    display: 'grid',
    gap: 4,
    fontSize: 12,
    fontWeight: 600,
    color: '#364d71',
  },
  select: {
    border: '1px solid #c7d6f0',
    borderRadius: 9,
    background: '#fff',
    minWidth: 120,
    padding: '7px 10px',
    fontWeight: 600,
    color: '#10294f',
  },
  resetBtn: {
    background: '#013062',
    color: '#fff',
    padding: '9px 14px',
    fontSize: 13,
  },
  scoreStrip: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  scoreBoxBlue: {
    background: '#e6eeff',
    color: '#013062',
    borderRadius: 10,
    fontWeight: 800,
    textAlign: 'center',
    padding: '10px 8px',
  },
  centerMeta: {
    display: 'grid',
    gap: 4,
    textAlign: 'center',
    color: '#3a5073',
    fontWeight: 700,
    fontSize: 12,
    minWidth: 104,
  },
  scoreBoxOrange: {
    background: '#fff2e6',
    color: '#b85a0d',
    borderRadius: 10,
    fontWeight: 800,
    textAlign: 'center',
    padding: '10px 8px',
  },
  boardWrap: {
    padding: '10px 12px 12px',
    display: 'grid',
    gap: 8,
  },
  playersRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    alignItems: 'end',
  },
  teamPlayersWrap: {
    display: 'flex',
    gap: 8,
    minHeight: 42,
  },
  playerFigure: {
    display: 'grid',
    justifyItems: 'center',
    gap: 2,
    transition: 'transform 220ms ease',
  },
  playerHead: {
    width: 11,
    height: 11,
    borderRadius: '50%',
    display: 'block',
    opacity: 0.95,
  },
  playerBody: {
    width: 14,
    height: 16,
    borderRadius: 6,
    display: 'grid',
    placeItems: 'center',
    opacity: 0.95,
  },
  playerBadge: {
    color: '#ffffff',
    fontWeight: 800,
    fontSize: 8,
    lineHeight: 1,
  },
  playerLeg: {
    width: 10,
    height: 6,
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderRadius: 999,
    display: 'block',
    opacity: 0.95,
  },
  playerArm: {
    width: 12,
    height: 5,
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderRadius: 999,
    display: 'block',
    opacity: 0.95,
    marginTop: -1,
  },
  trackLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    fontWeight: 700,
    color: '#5b6f91',
  },
  sideLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  trackOuter: {
    position: 'relative',
    height: 36,
    borderRadius: 999,
    border: '1px solid #d2def3',
    background: 'linear-gradient(90deg, #e9f1ff 0%, #f8fbff 50%, #fff3e7 100%)',
    overflow: 'hidden',
  },
  ropeLine: {
    position: 'absolute',
    left: '7%',
    right: '7%',
    top: '50%',
    height: 5,
    transform: 'translateY(-50%)',
    borderRadius: 999,
    background: 'repeating-linear-gradient(90deg, #8f7348 0 8px, #b29164 8px 16px)',
    opacity: 0.9,
  },
  centerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    transform: 'translateX(-50%)',
    background: '#013062',
    opacity: 0.45,
  },
  flag: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#013062',
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
    borderRadius: 999,
    padding: '6px 10px',
    transition: 'left 280ms ease',
    whiteSpace: 'nowrap',
  },
  questionBox: {
    padding: 10,
    textAlign: 'center',
  },
  questionText: {
    fontSize: 36,
    fontWeight: 800,
    color: '#013062',
    lineHeight: 1.15,
  },
  answerHint: {
    marginTop: 3,
    fontSize: 12,
    color: '#4d6387',
    fontWeight: 600,
  },
  playArea: {
    display: 'grid',
    gridTemplateColumns: '1fr 240px 1fr',
    gap: 12,
    alignItems: 'stretch',
  },
  teamPanel: {
    padding: 12,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  teamTitle: {
    margin: '0 0 8px',
    fontSize: 18,
  },
  answerInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'solid',
    marginBottom: 10,
    fontWeight: 700,
    color: '#0f274b',
    outline: 'none',
  },
  keypadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  teamActions: {
    marginTop: 7,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
  },
  actionBtn: {
    color: '#fff',
    padding: '10px 8px',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  actionBtnSecondary: {
    background: '#fff',
    borderWidth: 1,
    borderStyle: 'solid',
    padding: '10px 8px',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  statusCol: {
    display: 'grid',
    alignContent: 'center',
    justifyItems: 'center',
    gap: 8,
    padding: 10,
    textAlign: 'center',
  },
  statusText: {
    margin: 0,
    color: '#314a71',
    fontWeight: 700,
    fontSize: 14,
  },
  skipBtn: {
    background: '#ffffff',
    border: '1px solid #d0dcf3',
    color: '#013062',
    padding: '9px 12px',
    fontSize: 13,
  },
  winnerBanner: {
    textAlign: 'center',
    padding: '18px 14px',
  },
};

export default JeenieMathTugOfWar;