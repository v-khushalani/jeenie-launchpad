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

type JeenieMathTugOfWarProps = {
  fullscreen?: boolean;
};

const MAX_PULL = 5;
const TEAM_A = { name: 'Team Blue', accent: '#0f3d7e', glow: '#8cc3ff', surface: '#eaf3ff' };
const TEAM_B = { name: 'Team Orange', accent: '#c85f11', glow: '#ffd1a3', surface: '#fff1e6' };

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const ribbonDotAccentStyle = (color: string): React.CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: color,
  boxShadow: `0 0 0 4px ${color}20`,
});

const buildQuestion = (round: number, mode: OperationMode): Question => {
  const op =
    mode === 'mix'
      ? pickRandom<Question['op']>(['+', '-', 'x'])
      : mode === 'add'
        ? '+'
        : mode === 'sub'
          ? '-'
          : 'x';

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

const formatModeLabel = (mode: OperationMode) => {
  if (mode === 'mix') return 'Mixed Mode';
  if (mode === 'add') return 'Addition';
  if (mode === 'sub') return 'Subtraction';
  return 'Multiplication';
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

  const isCompact = fullscreen;
  const markerPercent = useMemo(() => clamp(50 - ropePull * 8, 8, 92), [ropePull]);
  const roundProgress = useMemo(() => Math.round(((round - 1) / maxRounds) * 100), [round, maxRounds]);
  const scoreGap = teamAScore - teamBScore;
  const ropeDirection = ropePull > 0 ? 'left' : ropePull < 0 ? 'right' : 'center';
  const arenaTone = gameOver
    ? '#5b708f'
    : pullFlashWinner === 'A'
      ? TEAM_A.accent
      : pullFlashWinner === 'B'
        ? TEAM_B.accent
        : '#183153';

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
    setQuestion(buildQuestion(round, mode));
    setTeamAInput('');
    setTeamBInput('');
    setStatusText('Challenge mode updated. Continue playing.');
  }, [mode, round]);

  const keypad = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', 'DEL'];
  const leadingTeam = scoreGap > 0 ? 'Team Blue' : scoreGap < 0 ? 'Team Orange' : 'Even battle';

  return (
    <div
      style={{
        ...styles.pageWrap,
        ...(isCompact
          ? {
              height: '100%',
              minHeight: 0,
              padding: 12,
              gap: 12,
              gridTemplateRows: 'auto auto auto auto minmax(0, 1fr)',
            }
          : {}),
      }}
    >
      <style>{`
        .jm-card {
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,251,255,0.96) 100%);
          border: 1px solid rgba(203, 216, 236, 0.95);
          border-radius: 22px;
          box-shadow:
            0 16px 40px rgba(11, 29, 58, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(16px);
        }
        .jm-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top left, rgba(120, 167, 255, 0.12), transparent 32%),
                      radial-gradient(circle at top right, rgba(255, 180, 120, 0.12), transparent 32%);
          pointer-events: none;
        }
        .jm-btn {
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 800;
          letter-spacing: 0.02em;
          transition: transform 140ms ease, box-shadow 180ms ease, opacity 180ms ease, filter 180ms ease;
        }
        .jm-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: saturate(1.05);
          box-shadow: 0 10px 22px rgba(15, 31, 58, 0.12);
        }
        .jm-btn:active:not(:disabled) {
          transform: translateY(1px) scale(0.99);
        }
        .jm-btn:disabled {
          cursor: not-allowed;
        }
        .jm-k {
          min-height: 40px;
          font-size: 14px;
        }
        .jm-status {
          animation: jmPulse 1.8s ease infinite;
        }
        @keyframes jmPulse {
          0% { box-shadow: 0 0 0 0 rgba(14, 58, 112, 0.18); }
          70% { box-shadow: 0 0 0 12px rgba(14, 58, 112, 0); }
          100% { box-shadow: 0 0 0 0 rgba(14, 58, 112, 0); }
        }
        .jm-float {
          animation: jmFloat 6s ease-in-out infinite;
        }
        .jm-float-delay {
          animation-delay: -2.5s;
        }
        @keyframes jmFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
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
          width: 44px;
          height: 26px;
          pointer-events: none;
          filter: drop-shadow(0 8px 14px rgba(9, 27, 53, 0.2));
          transition: left 300ms ease;
        }
        .jm-flag-pole {
          position: absolute;
          left: 7px;
          top: 1px;
          width: 2px;
          height: 24px;
          background: linear-gradient(180deg, #7d8795, #445264);
          border-radius: 999px;
        }
        .jm-flag-cloth {
          position: absolute;
          left: 9px;
          top: 3px;
          width: 30px;
          height: 18px;
          border-radius: 4px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr 1fr;
          border: 1px solid rgba(255, 255, 255, 0.72);
        }
        .jm-flag-blue { background: linear-gradient(135deg, #0e4fa0, #0c2f60); }
        .jm-flag-orange { background: linear-gradient(135deg, #f68a23, #b94f09); }
        .jm-team {
          display: flex;
          gap: 8px;
          min-height: 42px;
        }
        .jm-team-left { justify-content: flex-start; }
        .jm-team-right { justify-content: flex-end; }
        .jm-player {
          position: relative;
          width: 22px;
          height: 40px;
          transform: translateX(var(--shift, 0px)) rotate(var(--lean, 0deg));
          transition: transform 220ms ease;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15));
        }
        .jm-head {
          position: absolute;
          left: 50%;
          top: 0;
          width: 11px;
          height: 11px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: linear-gradient(180deg, #f6d0b6, #eeb692);
          border: 1px solid rgba(0, 0, 0, 0.08);
        }
        .jm-shirt {
          position: absolute;
          left: 50%;
          top: 11px;
          width: 16px;
          height: 15px;
          transform: translateX(-50%);
          border-radius: 6px;
          background: linear-gradient(180deg, color-mix(in srgb, var(--team-color) 88%, white), var(--team-color));
          color: #fff;
          font-size: 8px;
          font-weight: 900;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.26);
        }
        .jm-arm {
          position: absolute;
          top: 16px;
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
          width: 13px;
          height: 8px;
          transform: translateX(-50%);
          border-bottom: 2px solid var(--team-color);
          border-radius: 999px;
        }
        .jm-ribbon {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(180, 196, 224, 0.9);
          box-shadow: 0 8px 20px rgba(15, 31, 58, 0.06);
        }
      `}</style>

      <div style={{ ...styles.hero, ...(isCompact ? { padding: '14px 16px' } : {}) }} className="jm-card">
        <div style={styles.heroCopy}>
          <div style={styles.ribbonRow}>
            <span className="jm-ribbon" style={{ color: '#0f3d7e' }}>
              <span style={styles.ribbonDotBlue} /> Live classroom battle
            </span>
            <span className="jm-ribbon" style={{ color: arenaTone }}>
              <span style={ribbonDotAccentStyle(arenaTone)} /> {formatModeLabel(mode)}
            </span>
          </div>
          <h2 style={{ ...styles.title, ...(isCompact ? { fontSize: 28 } : {}) }}>JEEnie Tug of War Arena</h2>
          <p style={styles.subtitle}>
            Fast-paced class competition for students. Answer correctly, pull the rope, and make the room feel alive.
          </p>
          <div style={styles.heroStats}>
            <StatPill label="Rounds" value={`${round}/${maxRounds}`} />
            <StatPill label="Timer" value={`${secondsLeft}s`} />
            <StatPill label="Lead" value={leadingTeam} />
          </div>
        </div>

        <div style={styles.heroVisual}>
          <div style={{ ...styles.orb, boxShadow: `0 0 0 1px rgba(255,255,255,0.35), 0 0 60px ${TEAM_A.glow}55` }} className="jm-float" />
          <div style={{ ...styles.orbTwo, boxShadow: `0 0 0 1px rgba(255,255,255,0.35), 0 0 60px ${TEAM_B.glow}55` }} className="jm-float jm-float-delay" />
          <div style={styles.miniArena}>
            <div style={styles.miniArenaBar}>
              <span style={{ ...styles.miniTeamTag, background: TEAM_A.accent }}>Blue</span>
              <span style={{ ...styles.miniCenterText }}>Class Battle</span>
              <span style={{ ...styles.miniTeamTag, background: TEAM_B.accent }}>Orange</span>
            </div>
            <div style={styles.miniArenaTrack}>
              <div style={styles.miniArenaRope} />
              <div style={{ ...styles.miniFlag, left: `${markerPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...styles.controlsBar, ...(isCompact ? { padding: 12 } : {}) }} className="jm-card">
        <div style={styles.controlsRow}>
          <label style={styles.controlLabel}>
            Challenge mode
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
            Battle length
            <select
              value={maxRounds}
              onChange={(e) => setMaxRounds(Number(e.target.value))}
              style={styles.select}
              disabled={gameOver}
            >
              <option value={8}>8 rounds</option>
              <option value={10}>10 rounds</option>
              <option value={12}>12 rounds</option>
              <option value={15}>15 rounds</option>
            </select>
          </label>

          <button className="jm-btn" style={styles.resetBtn} onClick={resetAll}>
            Restart battle
          </button>
        </div>
      </div>

      <div style={{ ...styles.scoreStrip, ...(isCompact ? { padding: 12 } : {}) }} className="jm-card">
        <ScoreCard
          title="Team Blue"
          score={teamAScore}
          accent={TEAM_A.accent}
          glow={TEAM_A.glow}
          subtitle={scoreGap >= 0 ? 'Pulling ahead or holding ground.' : 'Need a comeback round.'}
        />
        <div style={styles.centerMeta}>
          <span style={styles.centerBadge}>Round {round} of {maxRounds}</span>
          <span style={styles.centerTimer}>Time left: {secondsLeft}s</span>
          <span style={styles.centerMicro}>Progress {roundProgress}%</span>
        </div>
        <ScoreCard
          title="Team Orange"
          score={teamBScore}
          accent={TEAM_B.accent}
          glow={TEAM_B.glow}
          subtitle={scoreGap <= 0 ? 'Building pressure on the rope.' : 'Need a clutch answer.'}
        />
      </div>

      <div style={{ ...styles.boardWrap, ...(isCompact ? { padding: '14px 14px 16px', gap: 12 } : {}) }} className="jm-card">
        <div style={styles.trackHeader}>
          <div style={styles.trackHeaderItem}>
            <span style={styles.trackLabel}>Team Blue side</span>
            <strong style={{ color: TEAM_A.accent }}>Left lane</strong>
          </div>
          <div style={styles.trackHeaderItemCenter}>
            <span style={styles.trackLabel}>Live momentum</span>
            <strong style={{ color: arenaTone }}>{statusText}</strong>
          </div>
          <div style={styles.trackHeaderItemRight}>
            <span style={styles.trackLabel}>Team Orange side</span>
            <strong style={{ color: TEAM_B.accent }}>Right lane</strong>
          </div>
        </div>

        <div style={styles.trackOuter} className={pullFlashWinner ? 'jm-track-pull' : ''}>
          <div style={styles.ropeLine} className="jm-rope" />
          <div style={styles.ropeGlowLeft} />
          <div style={styles.ropeGlowRight} />
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
          <TeamBanner team={TEAM_A} side="left" ropePull={ropePull} isWinner={pullFlashWinner === 'A'} />
          <TeamBanner team={TEAM_B} side="right" ropePull={ropePull} isWinner={pullFlashWinner === 'B'} />
        </div>
      </div>

      <div style={{ ...styles.questionBox, ...(isCompact ? { padding: 14 } : {}) }} className="jm-card">
        <div style={{ ...styles.questionLabel, borderColor: arenaTone }}>
          Solve to pull
        </div>
        <div style={{ ...styles.questionText, ...(isCompact ? { fontSize: 30 } : {}) }}>{question.label}</div>
        <div style={styles.answerHint}>First correct answer wins the round. Wrong answer = no pull.</div>
      </div>

      {gameOver ? (
        <div style={styles.winnerBanner} className="jm-card jm-status">
          <strong style={{ color: '#0f3d7e', fontSize: 20 }}>{winnerText}</strong>
          <p style={{ margin: '8px 0 0', color: '#41597c' }}>Tap restart to run another battle with your class.</p>
        </div>
      ) : (
        <div
          style={{
            ...styles.playArea,
            ...(isCompact
              ? {
                  minHeight: 0,
                  gap: 10,
                  gridTemplateColumns: '1fr 220px 1fr',
                }
              : {}),
          }}
        >
          <TeamPanel
            team={TEAM_A}
            inputValue={teamAInput}
            onInputChange={setTeamAInput}
            onSubmit={() => submitAnswer('A')}
            onKey={(key) => appendKey('A', key)}
            keypad={keypad}
            disabled={roundLocked || gameOver}
            compact={isCompact}
          />

          <div style={styles.statusCol} className="jm-card jm-status">
            <div style={styles.statusChip}>{statusText}</div>
            <div style={styles.statusMeta}>Round {round} of {maxRounds}</div>
            <button className="jm-btn" style={styles.skipBtn} onClick={() => resolveRound(null)} disabled={roundLocked || gameOver}>
              Skip round
            </button>
          </div>

          <TeamPanel
            team={TEAM_B}
            inputValue={teamBInput}
            onInputChange={setTeamBInput}
            onSubmit={() => submitAnswer('B')}
            onKey={(key) => appendKey('B', key)}
            keypad={keypad}
            disabled={roundLocked || gameOver}
            compact={isCompact}
          />
        </div>
      )}
    </div>
  );
};

type StatPillProps = {
  label: string;
  value: string;
};

const StatPill: React.FC<StatPillProps> = ({ label, value }) => (
  <div style={styles.statPill}>
    <span style={styles.statLabel}>{label}</span>
    <span style={styles.statValue}>{value}</span>
  </div>
);

type ScoreCardProps = {
  title: string;
  score: number;
  accent: string;
  glow: string;
  subtitle: string;
};

const ScoreCard: React.FC<ScoreCardProps> = ({ title, score, accent, glow, subtitle }) => (
  <div style={{ ...styles.scoreCard, borderColor: accent, boxShadow: `0 14px 28px ${glow}45` }}>
    <span style={{ ...styles.scoreTitle, color: accent }}>{title}</span>
    <strong style={{ ...styles.scoreValue, color: accent }}>{score}</strong>
    <span style={styles.scoreSub}>{subtitle}</span>
  </div>
);

type TeamBannerProps = {
  team: { name: string; accent: string; glow: string; surface: string };
  side: 'left' | 'right';
  ropePull: number;
  isWinner: boolean;
};

const TeamBanner: React.FC<TeamBannerProps> = ({ team, side, ropePull, isWinner }) => {
  const directionalPull = side === 'left' ? Math.max(0, ropePull) : Math.max(0, -ropePull);
  const baseLean = side === 'left' ? -8 : 8;
  const lean = baseLean + (side === 'left' ? -1 : 1) * Math.min(6, directionalPull * 1.2);
  const pullShift = isWinner ? (side === 'left' ? -8 : 8) : 0;
  const align = side === 'left' ? 'flex-start' : 'flex-end';

  return (
    <div style={{ ...styles.teamBanner, justifyContent: align }}>
      <div style={{ ...styles.teamBadge, background: team.surface, borderColor: team.accent, boxShadow: `0 12px 24px ${team.glow}45` }}>
        <span style={{ ...styles.teamName, color: team.accent }}>{team.name}</span>
        <div style={styles.teamPlayersWrap}>
          {[0, 1, 2].map((idx) => (
            <div
              key={`${team.accent}-${idx}`}
              className="jm-player"
              style={{
                '--team-color': team.accent,
                '--lean': `${lean}deg`,
                '--shift': `${pullShift + (side === 'left' ? -idx * 1.4 : idx * 1.4)}px`,
              } as React.CSSProperties}
            >
              <span className="jm-head" />
              <span className="jm-shirt">J</span>
              <span className="jm-arm" />
              <span className="jm-legs" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

type TeamPanelProps = {
  team: { name: string; accent: string; glow: string; surface: string };
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onKey: (key: string) => void;
  keypad: string[];
  disabled: boolean;
  compact?: boolean;
};

const TeamPanel: React.FC<TeamPanelProps> = ({
  team,
  inputValue,
  onInputChange,
  onSubmit,
  onKey,
  keypad,
  disabled,
  compact = false,
}) => {
  return (
    <div style={{ ...styles.teamPanel, borderColor: team.accent, ...(compact ? { padding: 14 } : {}) }} className="jm-card">
      <div style={styles.teamHeaderRow}>
        <div>
          <h3 style={{ ...styles.teamTitle, color: team.accent }}>{team.name}</h3>
          <p style={styles.teamHint}>Type the answer, then hit Enter to lock the pull.</p>
        </div>
        <span style={{ ...styles.teamTag, background: team.surface, color: team.accent, borderColor: team.accent }}>
          Fast lane
        </span>
      </div>

      <input
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value.replace(/[^0-9-]/g, '').slice(0, 6))}
        placeholder="Type answer"
        style={{ ...styles.answerInput, borderColor: team.accent, background: team.surface, ...(compact ? { fontSize: 17, marginBottom: 10, padding: '9px 12px' } : {}) }}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
      />

      <div style={styles.keypadGrid}>
        {keypad.map((key) => (
          <button
            key={`${team.name}-${key}`}
            className="jm-btn jm-k"
            style={{
              background: team.surface,
              color: team.accent,
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
        <button className="jm-btn" style={{ ...styles.actionBtn, background: team.accent }} onClick={onSubmit} disabled={disabled}>
          ENTER
        </button>
        <button className="jm-btn" style={{ ...styles.actionBtnSecondary, color: team.accent, borderColor: team.accent, background: '#fff' }} onClick={() => onKey('C')} disabled={disabled}>
          CLEAR
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageWrap: {
    background:
      'radial-gradient(circle at top left, rgba(89, 145, 255, 0.12), transparent 32%), radial-gradient(circle at top right, rgba(255, 161, 72, 0.11), transparent 34%), linear-gradient(180deg, #f7fbff 0%, #eef4ff 100%)',
    border: '1px solid #d8e3f5',
    borderRadius: 24,
    padding: 16,
    display: 'grid',
    gridTemplateRows: 'auto auto auto auto auto',
    gap: 14,
    width: '100%',
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    color: '#132340',
  },
  hero: {
    padding: 18,
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: 16,
    alignItems: 'stretch',
  },
  heroCopy: {
    display: 'grid',
    gap: 14,
    alignContent: 'center',
  },
  ribbonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  },
  ribbonDotBlue: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: TEAM_A.accent,
    boxShadow: '0 0 0 4px rgba(15, 61, 126, 0.12)',
  },
  title: {
    margin: 0,
    fontSize: 34,
    lineHeight: 1.02,
    color: '#0f305f',
    letterSpacing: '-0.03em',
  },
  subtitle: {
    margin: 0,
    maxWidth: 700,
    fontSize: 14,
    lineHeight: 1.7,
    color: '#41597c',
  },
  heroStats: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  },
  statPill: {
    minWidth: 120,
    display: 'grid',
    gap: 4,
    padding: '12px 14px',
    borderRadius: 18,
    background: 'rgba(255,255,255,0.82)',
    border: '1px solid rgba(192, 208, 233, 0.9)',
    boxShadow: '0 10px 24px rgba(14, 30, 54, 0.06)',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#60748f',
  },
  statValue: {
    fontSize: 15,
    fontWeight: 900,
    color: '#0f305f',
  },
  heroVisual: {
    position: 'relative',
    minHeight: 220,
    display: 'grid',
    alignContent: 'stretch',
    padding: 16,
    borderRadius: 20,
    background: 'linear-gradient(180deg, rgba(10,28,55,0.96), rgba(14,45,86,0.96))',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    top: 18,
    right: 16,
    width: 120,
    height: 120,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95), rgba(255,255,255,0.18) 26%, rgba(99,156,255,0.22) 46%, rgba(21, 48, 91, 0.08) 70%, transparent 72%)',
    filter: 'blur(0px)',
  },
  orbTwo: {
    position: 'absolute',
    bottom: 16,
    left: 18,
    width: 88,
    height: 88,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95), rgba(255,255,255,0.12) 24%, rgba(255, 183, 98, 0.18) 50%, rgba(21, 48, 91, 0.04) 70%, transparent 74%)',
  },
  miniArena: {
    position: 'relative',
    display: 'grid',
    gap: 12,
    alignSelf: 'end',
    zIndex: 1,
  },
  miniArenaBar: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    gap: 10,
    alignItems: 'center',
  },
  miniTeamTag: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '7px 11px',
    borderRadius: 999,
    color: '#fff',
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: '0.03em',
    boxShadow: '0 10px 22px rgba(0,0,0,0.18)',
  },
  miniCenterText: {
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  miniArenaTrack: {
    position: 'relative',
    height: 88,
    borderRadius: 22,
    overflow: 'hidden',
    background:
      'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.16), transparent 26%), linear-gradient(90deg, rgba(18,66,128,0.88) 0%, rgba(14,35,68,0.94) 50%, rgba(141,62,12,0.88) 100%)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  miniArenaRope: {
    position: 'absolute',
    left: '7%',
    right: '7%',
    top: '50%',
    height: 8,
    transform: 'translateY(-50%)',
    borderRadius: 999,
    background: 'repeating-linear-gradient(90deg, #8b6a3f 0 8px, #b8915d 8px 16px)',
    opacity: 0.95,
  },
  miniFlag: {
    position: 'absolute',
    top: '50%',
    width: 30,
    height: 16,
    transform: 'translate(-50%, -50%)',
    borderRadius: 4,
    background: 'linear-gradient(90deg, #0e4fa0 50%, #f68a23 50%)',
    boxShadow: '0 8px 14px rgba(0,0,0,0.24)',
  },
  controlsBar: {
    padding: 12,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  controlsRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  controlLabel: {
    display: 'grid',
    gap: 5,
    fontSize: 12,
    fontWeight: 700,
    color: '#365175',
  },
  select: {
    border: '1px solid #c7d6f0',
    borderRadius: 12,
    background: '#fff',
    minWidth: 150,
    padding: '9px 12px',
    fontWeight: 700,
    color: '#10294f',
    outline: 'none',
  },
  resetBtn: {
    background: 'linear-gradient(135deg, #0f3d7e, #1a5db0)',
    color: '#fff',
    padding: '10px 15px',
    fontSize: 13,
    boxShadow: '0 12px 22px rgba(15, 61, 126, 0.18)',
  },
  scoreStrip: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  scoreCard: {
    display: 'grid',
    gap: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'solid',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.95)',
  },
  scoreTitle: {
    fontSize: 12,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  scoreValue: {
    fontSize: 34,
    fontWeight: 950,
    lineHeight: 1,
  },
  scoreSub: {
    fontSize: 12,
    color: '#5a6d86',
    fontWeight: 600,
  },
  centerMeta: {
    display: 'grid',
    gap: 6,
    textAlign: 'center',
    color: '#2e4a72',
    fontWeight: 800,
    minWidth: 150,
  },
  centerBadge: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#0f3d7e',
  },
  centerTimer: {
    fontSize: 15,
    color: '#112d52',
  },
  centerMicro: {
    fontSize: 11,
    color: '#617592',
  },
  boardWrap: {
    padding: '14px 14px 16px',
    display: 'grid',
    gap: 12,
  },
  trackHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.4fr 1fr',
    gap: 10,
    alignItems: 'center',
  },
  trackHeaderItem: {
    display: 'grid',
    justifyItems: 'start',
    gap: 2,
  },
  trackHeaderItemCenter: {
    display: 'grid',
    justifyItems: 'center',
    gap: 2,
    textAlign: 'center',
  },
  trackHeaderItemRight: {
    display: 'grid',
    justifyItems: 'end',
    gap: 2,
    textAlign: 'right',
  },
  trackLabel: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#71829b',
  },
  trackOuter: {
    position: 'relative',
    height: 112,
    borderRadius: 26,
    border: '1px solid #d2def3',
    background:
      'linear-gradient(90deg, rgba(218,235,255,0.96) 0%, rgba(247,251,255,0.96) 50%, rgba(255,236,219,0.96) 100%)',
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
  },
  ropeLine: {
    position: 'absolute',
    left: '7%',
    right: '7%',
    top: '50%',
    height: 8,
    transform: 'translateY(-50%)',
    borderRadius: 999,
    background: 'repeating-linear-gradient(90deg, #8d7042 0 8px, #b99460 8px 16px)',
    opacity: 0.96,
  },
  ropeGlowLeft: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, rgba(15,61,126,0.06), transparent 42%)',
    pointerEvents: 'none',
  },
  ropeGlowRight: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(270deg, rgba(200,95,17,0.06), transparent 42%)',
    pointerEvents: 'none',
  },
  centerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 3,
    transform: 'translateX(-50%)',
    background: 'linear-gradient(180deg, rgba(15,61,126,0.15), rgba(15,61,126,0.65), rgba(15,61,126,0.15))',
  },
  playersRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    alignItems: 'end',
  },
  teamBanner: {
    display: 'flex',
  },
  teamBadge: {
    minWidth: 240,
    display: 'grid',
    gap: 8,
    padding: '14px 14px 12px',
    borderRadius: 20,
    border: '1px solid transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  teamName: {
    fontSize: 14,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  teamPlayersWrap: {
    display: 'flex',
    gap: 8,
    minHeight: 42,
  },
  questionBox: {
    padding: 14,
    textAlign: 'center',
    display: 'grid',
    gap: 8,
    justifyItems: 'center',
  },
  questionLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px',
    borderRadius: 999,
    border: '1px solid #d7dfec',
    color: '#38577e',
    background: 'rgba(255,255,255,0.84)',
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  questionText: {
    fontSize: 34,
    fontWeight: 950,
    color: '#0f305f',
    lineHeight: 1.05,
    letterSpacing: '-0.03em',
  },
  answerHint: {
    fontSize: 12,
    color: '#4d6387',
    fontWeight: 700,
  },
  playArea: {
    display: 'grid',
    gridTemplateColumns: '1fr 240px 1fr',
    gap: 12,
    alignItems: 'stretch',
  },
  teamPanel: {
    padding: 14,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  teamHeaderRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  teamTitle: {
    margin: '0 0 4px',
    fontSize: 16,
    fontWeight: 900,
  },
  teamHint: {
    margin: 0,
    fontSize: 12,
    color: '#58708f',
    lineHeight: 1.5,
  },
  teamTag: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 10px',
    borderRadius: 999,
    border: '1px solid',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  answerInput: {
    width: '100%',
    padding: '11px 12px',
    fontSize: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'solid',
    marginBottom: 10,
    fontWeight: 800,
    color: '#0f274b',
    outline: 'none',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
  },
  keypadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  teamActions: {
    marginTop: 10,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  actionBtn: {
    color: '#fff',
    padding: '11px 10px',
    fontSize: 12,
    letterSpacing: '0.12em',
    boxShadow: '0 10px 20px rgba(15, 31, 58, 0.14)',
  },
  actionBtnSecondary: {
    background: '#fff',
    borderWidth: 1,
    borderStyle: 'solid',
    padding: '11px 10px',
    fontSize: 12,
    letterSpacing: '0.12em',
    boxShadow: '0 10px 20px rgba(15, 31, 58, 0.05)',
  },
  statusCol: {
    display: 'grid',
    alignContent: 'center',
    justifyItems: 'center',
    gap: 10,
    padding: 14,
    textAlign: 'center',
  },
  statusChip: {
    width: '100%',
    padding: '14px 12px',
    borderRadius: 18,
    background: 'linear-gradient(135deg, rgba(15,61,126,0.08), rgba(15,61,126,0.02))',
    color: '#17355f',
    fontWeight: 900,
    fontSize: 14,
    lineHeight: 1.5,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
  },
  statusMeta: {
    fontSize: 12,
    color: '#5f7088',
    fontWeight: 700,
  },
  skipBtn: {
    background: '#ffffff',
    border: '1px solid #d0dcf3',
    color: '#0f3d7e',
    padding: '10px 14px',
    fontSize: 13,
    boxShadow: '0 10px 18px rgba(15, 31, 58, 0.05)',
  },
  winnerBanner: {
    textAlign: 'center',
    padding: '20px 16px',
  },
};

export default JeenieMathTugOfWar;
