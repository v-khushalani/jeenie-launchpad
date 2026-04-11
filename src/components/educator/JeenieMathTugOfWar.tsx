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
        .jm-stage {
          background:
            radial-gradient(circle at 15% -20%, rgba(1, 48, 98, 0.10), transparent 55%),
            radial-gradient(circle at 90% 10%, rgba(201, 101, 18, 0.10), transparent 50%),
            #fff;
        }
        .jm-track-pull .jm-rope {
          animation: jmRopePulse 360ms ease;
        }
        @keyframes jmRopePulse {
          0% { transform: translateY(-50%) scaleX(1); }
          40% { transform: translateY(-50%) scaleX(1.03); }
          100% { transform: translateY(-50%) scaleX(1); }
        }
        .jm-flag {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 24px;
          transition: left 280ms ease;
          pointer-events: none;
        }
        .jm-flag-pole {
          position: absolute;
          left: 6px;
          top: 1px;
          width: 2px;
          height: 22px;
          background: #6b7280;
          border-radius: 999px;
        }
        .jm-flag-cloth {
          position: absolute;
          left: 8px;
          top: 2px;
          width: 28px;
          height: 16px;
          border-radius: 3px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr 1fr;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }
        .jm-flag-blue { background: #013062; }
        .jm-flag-orange { background: #c96512; }
        .jm-team {
          display: flex;
          gap: 8px;
          min-height: 42px;
        }
        .jm-team-left { justify-content: flex-start; }
        .jm-team-right { justify-content: flex-end; }
        .jm-player {
          position: relative;
          width: 18px;
          height: 36px;
          transform: translateX(var(--shift, 0px)) rotate(var(--lean, 0deg));
          transition: transform 220ms ease;
          filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.12));
        }
        .jm-head {
          position: absolute;
          left: 50%;
          top: 0;
          width: 10px;
          height: 10px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: #f2c4a0;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }
        .jm-shirt {
          position: absolute;
          left: 50%;
          top: 10px;
          width: 14px;
          height: 14px;
          transform: translateX(-50%);
          border-radius: 5px;
          background: var(--team-color);
          color: #fff;
          font-size: 8px;
          font-weight: 800;
          display: grid;
          place-items: center;
        }
        .jm-arm {
          position: absolute;
          top: 14px;
          width: 11px;
          height: 5px;
          border-bottom: 2px solid var(--team-color);
          border-radius: 999px;
        }
        .jm-team-left .jm-arm {
          right: -6px;
          transform: rotate(-16deg);
        }
        .jm-team-right .jm-arm {
          left: -6px;
          transform: rotate(16deg);
        }
        .jm-legs {
          position: absolute;
          left: 50%;
          bottom: 2px;
          width: 12px;
          height: 7px;
          transform: translateX(-50%);
          border-bottom: 2px solid var(--team-color);
          border-radius: 999px;
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

      <div style={{ ...styles.scoreStrip, ...(isCompact ? { padding: 9 } : {}) }} className="jm-card">
        <div style={styles.scoreBoxBlue}>Team Blue: {teamAScore}</div>
        <div style={styles.centerMeta}>
          <span>Round {round}/{maxRounds}</span>
          <span>Time: {secondsLeft}s</span>
        </div>
        <div style={styles.scoreBoxOrange}>Team Orange: {teamBScore}</div>
      </div>

      <div style={{ ...styles.boardWrap, ...(isCompact ? { padding: '10px 12px', gap: 8 } : {}) }} className="jm-card jm-stage">
        <div style={styles.trackLabelRow}>
          <span style={styles.sideLabel}>Team Blue Pull Zone</span>
          <span style={styles.sideLabel}>Team Orange Pull Zone</span>
        </div>
        <div style={styles.trackOuter} className={pullFlashWinner ? 'jm-track-pull' : ''}>
          <div style={styles.ropeLine} className="jm-rope" />
          <div style={styles.centerLine} />
          <div className="jm-flag" style={{ left: `${markerPercent}%` }}>
            <span className="jm-flag-pole" />
            <span className="jm-flag-cloth">
              <span className="jm-flag-blue" />
              <span className="jm-flag-orange" />
            </span>
          </div>
        </div>
        <div style={styles.playersRow}>
          <TugTeamPlayers accent="#013062" facing="right" ropePull={ropePull} isWinner={pullFlashWinner === 'A'} />
          <TugTeamPlayers accent="#c96512" facing="left" ropePull={ropePull} isWinner={pullFlashWinner === 'B'} />
        </div>
      </div>

      <div style={{ ...styles.questionBox, ...(isCompact ? { padding: 10 } : {}) }} className="jm-card">
        <div style={{ ...styles.questionText, ...(isCompact ? { fontSize: 27 } : {}) }}>{question.label}</div>
        <div style={{ ...styles.answerHint, ...(isCompact ? { marginTop: 3, fontSize: 12 } : {}) }}>First correct answer wins the round.</div>
      </div>

      {gameOver ? (
        <div style={styles.winnerBanner} className="jm-card jm-status">
          <strong style={{ color: '#013062', fontSize: 20 }}>{winnerText}</strong>
          <p style={{ margin: '8px 0 0', color: '#3b4f72' }}>Tap Restart to play again with your class.</p>
        </div>
      ) : (
        <div
          style={{
            ...styles.playArea,
            ...(isCompact
              ? {
                  minHeight: 0,
                  gap: 8,
                  gridTemplateColumns: '1fr 185px 1fr',
                }
              : {}),
          }}
        >
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
          />

          <div style={styles.statusCol} className="jm-card jm-status">
            <p style={styles.statusText}>{statusText}</p>
            <button
              className="jm-btn"
              style={styles.skipBtn}
              onClick={() => resolveRound(null)}
              disabled={roundLocked || gameOver}
            >
              Skip Round
            </button>
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
          />
        </div>
      )}
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
};

type TugTeamPlayersProps = {
  accent: string;
  facing: 'left' | 'right';
  ropePull: number;
  isWinner: boolean;
};

const TugTeamPlayers: React.FC<TugTeamPlayersProps> = ({ accent, facing, ropePull, isWinner }) => {
  const directionalPull = facing === 'right' ? Math.max(0, ropePull) : Math.max(0, -ropePull);
  const baseLean = facing === 'right' ? -9 : 9;
  const lean = baseLean + (facing === 'right' ? -1 : 1) * Math.min(6, directionalPull * 1.2);
  const pullShift = isWinner ? (facing === 'right' ? -7 : 7) : 0;
  const align = facing === 'right' ? 'flex-start' : 'flex-end';

  return (
    <div className={`jm-team ${facing === 'right' ? 'jm-team-left' : 'jm-team-right'}`} style={{ ...styles.teamPlayersWrap, justifyContent: align }}>
      {[0, 1, 2].map((idx) => (
        <div
          key={`${accent}-${idx}`}
          className="jm-player"
          style={{
            '--team-color': accent,
            '--lean': `${lean}deg`,
            '--shift': `${pullShift + (facing === 'right' ? -idx * 1.2 : idx * 1.2)}px`,
          } as React.CSSProperties}
        >
          <span className="jm-head" />
          <span className="jm-shirt">J</span>
          <span className="jm-arm" />
          <span className="jm-legs" />
        </div>
      ))}
    </div>
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
}) => {
  return (
    <div style={{ ...styles.teamPanel, borderColor: accent, ...(compact ? { padding: 10 } : {}) }} className="jm-card">
      <h3 style={{ ...styles.teamTitle, color: accent }}>{teamName}</h3>

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
    padding: 10,
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
    height: 38,
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
    height: 6,
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
  questionBox: {
    padding: 9,
    textAlign: 'center',
  },
  questionText: {
    fontSize: 32,
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
    gap: 10,
    alignItems: 'stretch',
  },
  teamPanel: {
    padding: 12,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  teamTitle: {
    margin: '0 0 8px',
    fontSize: 16,
  },
  answerInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'solid',
    marginBottom: 8,
    fontWeight: 700,
    color: '#0f274b',
    outline: 'none',
  },
  keypadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
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