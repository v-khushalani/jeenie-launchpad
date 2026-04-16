import React, { useCallback, useEffect, useRef, useState } from 'react';

const BRAND = {
  primary: '#013062',
  primarySoft: '#e6eeff',
  primaryLight: '#4a90e2',
  blue: '#1d72d8',
  blueSoft: '#e9f3ff',
  red: '#e53935',
  redSoft: '#ffebee',
  ink: '#12253a',
  muted: '#6b7d91',
  border: '#d8e2ef',
  white: '#ffffff',
  gold: '#f39c12',
};

const KEY_LAYOUT = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['C', '0', '<-'],
];

let MATCH_SECONDS = 90; // Configurable during game setup
const MAX_PULL = 12;

function clampPull(value) {
  return Math.max(-MAX_PULL, Math.min(MAX_PULL, value));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildQuestion(timeLeft) {
  const elapsed = MATCH_SECONDS - timeLeft;
  const level = elapsed < 30 ? 1 : elapsed < 60 ? 2 : 3;

  if (level === 1) {
    const a = randInt(10, 99);
    const b = randInt(10, 99);
    if (Math.random() < 0.7) return { text: `${a} + ${b}`, answer: a + b };
    return { text: `${Math.max(a, b)} - ${Math.min(a, b)}`, answer: Math.abs(a - b) };
  }

  if (level === 2) {
    if (Math.random() < 0.55) {
      const a = randInt(6, 18);
      const b = randInt(3, 12);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    const a = randInt(100, 450);
    const b = randInt(20, 140);
    return { text: `${a} + ${b}`, answer: a + b };
  }

  if (Math.random() < 0.45) {
    const d = randInt(4, 16);
    const ans = randInt(5, 25);
    return { text: `${d * ans} ÷ ${d}`, answer: ans };
  }

  if (Math.random() < 0.5) {
    const a = randInt(18, 40);
    const b = randInt(8, 24);
    const c = randInt(12, 70);
    return { text: `${a} × ${b} - ${c}`, answer: a * b - c };
  }

  const a = randInt(130, 550);
  const b = randInt(40, 200);
  return { text: `${a} - ${b}`, answer: a - b };
}

function createTeam() {
  return {
    input: '',
    score: 0,
    streak: 0,
    flash: 0,
    powerFlash: 0,
    power: 0,
    attempts: 0,
    correct: 0,
    totalResponseMs: 0,
  };
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}

function playTone(audioContext, { frequency, duration, type = 'sine', volume = 0.08 }) {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = volume;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const startTime = audioContext.currentTime;
  gainNode.gain.setValueAtTime(volume, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function playCountdownSound(audioContext, count) {
  if (!audioContext || count <= 0) return;
  const pitch = count === 3 ? 660 : count === 2 ? 740 : 820;
  playTone(audioContext, { frequency: pitch, duration: 0.16, type: 'square', volume: 0.05 });
}

function playStartChime(audioContext) {
  if (!audioContext) return;
  playTone(audioContext, { frequency: 880, duration: 0.12, type: 'triangle', volume: 0.06 });
  window.setTimeout(() => playTone(audioContext, { frequency: 1175, duration: 0.14, type: 'triangle', volume: 0.05 }), 120);
}

function playApplause(audioContext) {
  if (!audioContext) return;

  const duration = 1.6;
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  const channel = buffer.getChannelData(0);

  for (let i = 0; i < channel.length; i += 1) {
    const t = i / sampleRate;
    const env = Math.max(0, 1 - t / duration);
    const burst = t < 0.45 ? 1 : Math.max(0, 0.45 - (t - 0.45));
    channel[i] = (Math.random() * 2 - 1) * env * burst * 0.45;
  }

  const noise = audioContext.createBufferSource();
  const noiseGain = audioContext.createGain();
  noise.buffer = buffer;
  noiseGain.gain.value = 0.16;
  noise.connect(noiseGain);
  noiseGain.connect(audioContext.destination);
  noise.start();

  [330, 415, 523].forEach((frequency, index) => {
    window.setTimeout(() => playTone(audioContext, { frequency, duration: 0.22, type: 'triangle', volume: 0.045 }), index * 120);
  });
}

function TeamPanel({
  side,
  state,
  enabled,
  onKey,
  onSubmit,
  focusReady,
  teamName,
}) {
  const isBlue = side === 'left';
  const accent = isBlue ? BRAND.blue : BRAND.red;
  const soft = isBlue ? BRAND.blueSoft : BRAND.redSoft;

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        maxWidth: '100%',
        background: BRAND.white,
        border: `2px solid ${accent}`,
        borderRadius: 16,
        padding: 14,
        opacity: enabled ? 1 : 0.6,
        transition: 'opacity 200ms ease, box-shadow 200ms ease',
        boxShadow: enabled ? '0 12px 32px rgba(1,48,98,0.12)' : '0 4px 12px rgba(1,48,98,0.08)',
        position: 'relative',
      }}
    >
      {state.powerFlash > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            [isBlue ? 'left' : 'right']: 10,
            background: accent,
            color: BRAND.white,
            borderRadius: 999,
            padding: '6px 10px',
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 0.5,
            boxShadow: `0 8px 20px ${accent}66`,
            animation: 'powerPop 700ms ease-out',
            zIndex: 3,
          }}
        >
          AUTO POWER!
        </div>
      )}

      <div
        style={{
          background: soft,
          borderRadius: 10,
          border: `2px solid ${accent}`,
          padding: '10px 12px',
          marginBottom: 12,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 11, color: accent, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {teamName}
        </div>
      </div>

      <div
        style={{
          height: 52,
          borderRadius: 12,
          border: `2px solid ${state.flash > 0 ? accent : BRAND.border}`,
          background: state.flash > 0 ? `${accent}22` : '#f8fbff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          fontWeight: 900,
          color: BRAND.ink,
          letterSpacing: 2,
          marginBottom: 12,
          transition: 'all 150ms ease',
        }}
      >
        {state.input || '0'}
      </div>

      <div style={{ display: 'grid', gap: 7 }}>
        {KEY_LAYOUT.map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
            {row.map((k) => (
              <button
                key={k}
                onClick={() => onKey(side, k)}
                disabled={!enabled}
                style={{
                  height: 40,
                  border: `2px solid ${BRAND.border}`,
                  borderRadius: 10,
                  background: k === 'C' ? '#ffe8e8' : k === '<-' ? '#e8f4ff' : BRAND.white,
                  color: BRAND.ink,
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: enabled ? 'pointer' : 'not-allowed',
                  transition: 'all 150ms ease',
                  transform: 'scale(1)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.transform = 'scale(0.95)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.transform = 'scale(0.95)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
                }}
              >
                {k}
              </button>
            ))}
          </div>
        ))}
      </div>

      <button
        onClick={() => onSubmit(side)}
        disabled={!enabled}
        style={{
          marginTop: 10,
          width: '100%',
          height: 44,
          border: 'none',
          borderRadius: 12,
          background: enabled ? accent : '#c0c0c0',
          color: BRAND.white,
          fontWeight: 900,
          fontSize: 14,
          cursor: enabled ? 'pointer' : 'not-allowed',
          transition: 'all 200ms ease',
          boxShadow: enabled ? `0 6px 16px ${accent}40` : 'none',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        Submit
      </button>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <div style={{ color: BRAND.muted }}>
          Score: <strong style={{ color: BRAND.ink, fontSize: 15 }}>{state.score}</strong>
        </div>
        <div style={{ color: BRAND.muted }}>
          Streak: <strong style={{ color: accent, fontSize: 15 }}>{state.streak}</strong>
        </div>
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => {}}
          disabled
          style={{
            flex: 1,
            height: 36,
            borderRadius: 10,
            border: `1px solid ${state.powerFlash > 0 ? BRAND.gold : accent}`,
            background: state.powerFlash > 0 ? `${BRAND.gold}22` : (state.power > 0 ? `${accent}16` : '#eef2f7'),
            color: accent,
            fontWeight: 800,
            cursor: 'default',
            transition: 'all 180ms ease',
          }}
        >
          Power Auto ({state.power})
        </button>
        <div style={{ fontSize: 11, color: focusReady ? accent : BRAND.muted, fontWeight: 700 }}>
          {focusReady ? 'Focus Bonus Ready' : 'Focus Bonus'}
        </div>
      </div>
    </div>
  );
}

function RopePlayer({ side, pull, running, animTick }) {
  const isLeft = side === 'left';
  const jersey = isLeft ? '#1d72d8' : '#e53935';
  const accent = isLeft ? '#8ec5ff' : '#ffc04d';
  const offset = (isLeft ? -pull : pull) * 2.1;
  const pullIntensity = Math.max(0, Math.min(1, Math.abs(pull) / MAX_PULL));
  const bobY = running ? Math.sin(animTick * 0.22 + (isLeft ? 0 : 1.1)) * 2.2 : 0;
  const baseLean = (isLeft ? -1 : 1) * (8 + pullIntensity * 8);
  const ropeGripX = isLeft ? 186 : 10;

  const renderPlayer = (x, depth) => {
    const sway = running ? Math.sin(animTick * 0.26 + depth) * 2.2 : 0;
    const legKick = running ? Math.sin(animTick * 0.3 + depth) * 3 : 0;
    const lean = baseLean + (isLeft ? -depth * 1.5 : depth * 1.5);
    const armY = 88 + depth * 2;

    return (
      <g key={`${side}-${x}-${depth}`} transform={`translate(${x}, ${16 + sway}) rotate(${lean}, 0, 84)`}>
        <ellipse cx="0" cy="168" rx="18" ry="5" fill="rgba(0,0,0,0.16)" />

        <circle cx="0" cy="38" r="10.5" fill="#f4cfaa" stroke="#cfab88" strokeWidth="1" />
        <path d="M-11 35 C-11 24, 11 24, 11 35 L11 40 L-11 40 Z" fill="#222831" />
        <rect x="-9" y="30" width="18" height="5" rx="2.5" fill="#ccd5df" />

        <path d="M-15 56 C-14 47, 14 47, 15 56 L16 105 C16 115, -16 115, -16 105 Z" fill={jersey} />
        <path d="M-13 66 C-7 62, 7 62, 13 66" stroke={accent} strokeWidth="3" fill="none" />
        <circle cx="-7" cy="78" r="2" fill={accent} />
        <circle cx="0" cy="82" r="2" fill={accent} />
        <circle cx="7" cy="78" r="2" fill={accent} />

        <line x1={isLeft ? 10 : -10} y1={armY} x2={ropeGripX - x} y2={94 + depth} stroke="#efc39c" strokeWidth="6" strokeLinecap="round" />
        <line x1={isLeft ? 4 : -4} y1={armY + 8} x2={ropeGripX - x - (isLeft ? 8 : -8)} y2={100 + depth} stroke="#dfb58f" strokeWidth="6" strokeLinecap="round" />
        <circle cx={ropeGripX - x} cy={94 + depth} r="4" fill="#c79f7c" />

        <line x1="-8" y1="112" x2={-14 + legKick} y2="149" stroke="#1f2733" strokeWidth="7" strokeLinecap="round" />
        <line x1="8" y1="112" x2={14 - legKick} y2="147" stroke="#1f2733" strokeWidth="7" strokeLinecap="round" />
        <ellipse cx={-15 + legKick} cy="154" rx="7" ry="4" fill={isLeft ? '#2f8eff' : '#ff6f4d'} />
        <ellipse cx={14 - legKick} cy="152" rx="7" ry="4" fill={isLeft ? '#2f8eff' : '#ff6f4d'} />
      </g>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: `calc(50% - 92px + ${bobY}px)`,
        [isLeft ? 'left' : 'right']: 0 + offset,
        width: 198,
        height: 190,
        transition: 'left 120ms linear, right 120ms linear',
        userSelect: 'none',
      }}
    >
      <svg width="198" height="190" viewBox="0 0 198 190" style={{ overflow: 'visible' }}>
        {isLeft ? renderPlayer(62, 0.2) : renderPlayer(136, 0.2)}
        {isLeft ? renderPlayer(108, 1.2) : renderPlayer(90, 1.2)}
      </svg>
    </div>
  );
}

function CenterArena({ challenge, running, animTick, pull, countdown, winner, overallWinner, announcer, inputEnabled }) {
  const centerShift = (pull / MAX_PULL) * 36;
  const ropeWave = running ? Math.sin(animTick * 0.35) * 4 : 0;
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 18,
        border: `2px solid ${BRAND.border}`,
        background: `linear-gradient(180deg, #fafbfd 0%, #eef3f9 100%)`,
        minHeight: 360,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 24px rgba(1,48,98,0.1)',
      }}
    >
      {/* Question Display - Large & Centered */}
      <div
        style={{
          padding: '20px 16px 16px',
          textAlign: 'center',
          borderBottom: `1px solid ${BRAND.border}`,
          background: BRAND.white,
        }}
      >
        <div style={{ fontSize: 12, color: BRAND.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Current Challenge
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: BRAND.primary,
            letterSpacing: 1,
            minHeight: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Saira', 'Segoe UI', sans-serif",
          }}
        >
          {challenge}
        </div>
      </div>

      {/* Rope Battle Arena */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
            padding: '28px 18px 38px',
        }}
      >
        {/* Ground line */}
        <div
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: 22,
            height: 10,
            borderRadius: 999,
            background: 'linear-gradient(180deg, #d9e4ef 0%, #cfd9e6 100%)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.9), 0 -1px 0 rgba(0,0,0,0.04)',
          }}
        />
        
        {/* Left rope knot - cleaner design */}
        <svg
          style={{
            position: 'absolute',
            left: 20,
            top: '50%',
            width: 24,
            height: 24,
            transform: 'translateY(-50%)',
          }}
          viewBox="0 0 24 24"
        >
          {/* Main knot ball */}
          <defs>
            <radialGradient id="knotLeft" cx="35%" cy="35%">
              <stop offset="0%" style={{ stopColor: '#d4af7f', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#a0826d', stopOpacity: 1 }} />
            </radialGradient>
          </defs>
          <circle cx="12" cy="12" r="9" fill="url(#knotLeft)" />
          <circle cx="12" cy="12" r="9" fill="rgba(0,0,0,0.1)" opacity="0.3" />
          {/* Highlight */}
          <ellipse cx="10" cy="10" rx="4" ry="3.5" fill="rgba(255,255,255,0.35)" />
          {/* Shadow */}
          <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
        </svg>
        
        {/* Right rope knot - cleaner design */}
        <svg
          style={{
            position: 'absolute',
            right: 20,
            top: '50%',
            width: 24,
            height: 24,
            transform: 'translateY(-50%)',
          }}
          viewBox="0 0 24 24"
        >
          <defs>
            <radialGradient id="knotRight" cx="35%" cy="35%">
              <stop offset="0%" style={{ stopColor: '#d4af7f', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#a0826d', stopOpacity: 1 }} />
            </radialGradient>
          </defs>
          <circle cx="12" cy="12" r="9" fill="url(#knotRight)" />
          <circle cx="12" cy="12" r="9" fill="rgba(0,0,0,0.1)" opacity="0.3" />
          {/* Highlight */}
          <ellipse cx="10" cy="10" rx="4" ry="3.5" fill="rgba(255,255,255,0.35)" />
          {/* Shadow */}
          <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
        </svg>

        {/* Rope players */}
        <RopePlayer side="left" pull={pull} running={running} animTick={animTick} />
        <RopePlayer side="right" pull={pull} running={running} animTick={animTick} />

        {/* Rope with dynamic animation */}
        <div
          style={{
            position: 'absolute',
            left: 60,
            right: 60,
            top: '50%',
            transform: `translateY(calc(-50% + ${ropeWave}px))`,
          }}
        >
          <div style={{ position: 'relative', height: 58 }}>
            <svg width="100%" height="58" viewBox="0 0 1000 58" preserveAspectRatio="none" style={{ display: 'block' }}>
              <defs>
                <linearGradient id="ropeTone" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8f6f53" />
                  <stop offset="50%" stopColor="#c6a17a" />
                  <stop offset="100%" stopColor="#8f6f53" />
                </linearGradient>
              </defs>
              <path d="M0 26 C180 18, 320 34, 500 26 C680 18, 820 34, 1000 26" stroke="url(#ropeTone)" strokeWidth="10" fill="none" strokeLinecap="round" />
              <path d="M0 26 C180 18, 320 34, 500 26 C680 18, 820 34, 1000 26" stroke="rgba(255,255,255,0.28)" strokeWidth="2" fill="none" strokeDasharray="10 12" />
              <path d="M0 31 C180 23, 320 39, 500 31 C680 23, 820 39, 1000 31" stroke="rgba(53,35,20,0.26)" strokeWidth="3" fill="none" />
            </svg>

            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: -6,
                width: 8,
                height: 50,
                borderRadius: 999,
                background: '#e4e9f2',
                transform: 'translateX(-50%)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 2,
                width: 14,
                height: 34,
                borderRadius: 8,
                background: `linear-gradient(180deg, ${BRAND.red} 0%, ${BRAND.primary} 100%)`,
                transform: `translateX(calc(-50% + ${centerShift}px))`,
                transition: 'transform 120ms linear',
                boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
              }}
            />
          </div>

          {/* Tension Indicator */}
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: BRAND.muted, fontWeight: 700, marginBottom: 6 }}>
              Rope Tension
            </div>
            <div
              style={{
                display: 'flex',
                gap: 3,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: i < Math.abs(pull) ? (pull < 0 ? BRAND.blue : BRAND.red) : '#e3e8f3',
                    transition: 'background 140ms ease',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Status Message */}
      <div
        style={{
          borderTop: `1px solid ${BRAND.border}`,
          background: winner ? '#fff5f5' : '#f8fbff',
          padding: '12px 16px',
          textAlign: 'center',
          minHeight: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 900,
            color: winner ? '#b91c1c' : BRAND.primary,
            letterSpacing: 0.3,
          }}
        >
          {overallWinner || winner || announcer || (inputEnabled && !countdown ? 'Solve and submit.' : 'Waiting to start.')}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const audioContextRef = useRef(null);
  const hasPlayedStartChimeRef = useRef(false);
  const hasPlayedApplauseRef = useRef(false);

  const [timeLeft, setTimeLeft] = useState(MATCH_SECONDS);
  const [pull, setPull] = useState(0);
  const [winner, setWinner] = useState('');
  const [overallWinner, setOverallWinner] = useState('');
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundsWon, setRoundsWon] = useState({ left: 0, right: 0 });
  const [announcer, setAnnouncer] = useState('Click Start Match to begin!');
  const [roundSummary, setRoundSummary] = useState(null);

  const [started, setStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [animTick, setAnimTick] = useState(0);
  const [questionIssuedAt, setQuestionIssuedAt] = useState(Date.now());

  const [question, setQuestion] = useState(() => buildQuestion(MATCH_SECONDS));
  const [left, setLeft] = useState(() => createTeam());
  const [right, setRight] = useState(() => createTeam());
  const [roundShowIntro, setRoundShowIntro] = useState(false);
  const [showRoundWinner, setShowRoundWinner] = useState(false);
  const [teamNames, setTeamNames] = useState({ left: 'Team 1', right: 'Team 2' });
  const [matchDuration, setMatchDuration] = useState(90);
  const [confettiPieces, setConfettiPieces] = useState([]);
  const [showFullscreenCountdown, setShowFullscreenCountdown] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(0);

  const inputEnabled = started && running && !winner && !overallWinner;
  const canStartNextRound = Boolean(winner) && !overallWinner && roundNumber < 3 && roundsWon.left < 2 && roundsWon.right < 2;

  const resetMatch = useCallback(() => {
    MATCH_SECONDS = matchDuration;
    setTimeLeft(matchDuration);
    setPull(0);
    setWinner('');
    setOverallWinner('');
    setRoundNumber(1);
    setRoundsWon({ left: 0, right: 0 });
    setRoundSummary(null);
    setAnnouncer('Click Start Match to begin!');
    setStarted(false);
    setRunning(false);
    setCountdown(0);
    setAnimTick(0);
    setQuestionIssuedAt(Date.now());
    setQuestion(buildQuestion(matchDuration));
    setLeft(createTeam());
    setRight(createTeam());
    hasPlayedStartChimeRef.current = false;
    hasPlayedApplauseRef.current = false;
  }, [matchDuration]);

  const unlockAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = getAudioContext();
    }

    const audioContext = audioContextRef.current;
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }

    return audioContext;
  }, []);

  const startMatch = useCallback(() => {
    if (started || winner || overallWinner) return;
    MATCH_SECONDS = matchDuration;
    unlockAudio();
    setRoundShowIntro(true);
    setStarted(true);
    setTimeout(() => {
      setRoundShowIntro(false);
      setShowFullscreenCountdown(true);
      setCountdownNumber(3);
      setCountdown(3);
      setAnnouncer(`Round ${roundNumber} starts in 3...`);
    }, 1000);
  }, [started, winner, overallWinner, roundNumber, matchDuration, unlockAudio]);

  const startNextRound = useCallback((force = false) => {
    if (!force && !canStartNextRound) return;

    const nextRound = roundNumber + 1;
    setRoundNumber(nextRound);
    setTimeLeft(MATCH_SECONDS);
    setPull(0);
    setWinner('');
    setRoundSummary(null);
    setStarted(true);
    setRunning(false);
    setCountdown(0);
    setAnimTick(0);
    setQuestionIssuedAt(Date.now());
    setQuestion(buildQuestion(MATCH_SECONDS));
    setLeft(createTeam());
    setRight(createTeam());
    setAnnouncer(`Ready for Round ${nextRound}? Click Start Match!`);
    setShowRoundWinner(false);
    setRoundShowIntro(true);
    setTimeout(() => {
      setRoundShowIntro(false);
      setShowFullscreenCountdown(true);
      setCountdownNumber(3);
      setCountdown(3);
      setAnnouncer(`Round ${nextRound} starts in 3...`);
    }, 1000);
    hasPlayedStartChimeRef.current = false;
    hasPlayedApplauseRef.current = false;
  }, [canStartNextRound, roundNumber]);

  useEffect(() => {
    if (!started || running || countdown <= 0) return;

    playCountdownSound(audioContextRef.current, countdown);

    const timer = setTimeout(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setRunning(true);
          setQuestionIssuedAt(Date.now());
          setAnnouncer(`Round ${roundNumber} live. Solve fast!`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [started, running, countdown, roundNumber]);

  useEffect(() => {
    if (!started || !running || countdown > 0 || hasPlayedStartChimeRef.current) return;

    playStartChime(audioContextRef.current);
    hasPlayedStartChimeRef.current = true;
  }, [started, running, countdown]);

  useEffect(() => {
    if (countdown > 0) {
      setCountdownNumber(countdown);
    } else if (countdown === 0 && countdownNumber > 0) {
      setTimeout(() => {
        setShowFullscreenCountdown(false);
        setCountdownNumber(0);
      }, 800);
    }
  }, [countdown, countdownNumber]);

  useEffect(() => {
    if (confettiPieces.length > 0) {
      const timer = setTimeout(() => {
        setConfettiPieces([]);
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, [confettiPieces]);

  const finishRound = useCallback((side, message) => {
    if (winner || overallWinner) return;

    const nextWins = { ...roundsWon };
    if (side === 'left' || side === 'right') {
      nextWins[side] += 1;
    }

    const leftAccuracy = left.attempts ? Math.round((left.correct / left.attempts) * 100) : 0;
    const rightAccuracy = right.attempts ? Math.round((right.correct / right.attempts) * 100) : 0;
    const leftAvgMs = left.correct ? Math.round(left.totalResponseMs / left.correct) : 0;
    const rightAvgMs = right.correct ? Math.round(right.totalResponseMs / right.correct) : 0;

    // Classroom-friendly winner messages
    let classroomMessage = message;
    if (side === 'left') {
      classroomMessage = `${teamNames.left} wins Round ${roundNumber}! 🎉`;
    } else if (side === 'right') {
      classroomMessage = `${teamNames.right} wins Round ${roundNumber}! 🎉`;
    }

    setWinner(classroomMessage);
    setShowRoundWinner(true);
    setRunning(false);
    setRoundsWon(nextWins);
    setRoundSummary({
      round: roundNumber,
      leftAccuracy,
      rightAccuracy,
      leftAvgMs,
      rightAvgMs,
    });

    if (nextWins.left >= 2 || nextWins.right >= 2 || roundNumber === 3) {
      let finalMessage = '';
      let finalAnnouncer = '';
      
      if (nextWins.left === nextWins.right) {
        finalMessage = 'Best of 3 Championship: It\'s a Tie!';
        finalAnnouncer = 'Series tied. Excellent competition!';
      } else if (nextWins.left > nextWins.right) {
        finalMessage = `🏆 ${teamNames.left} is the Champion!`;
        finalAnnouncer = `${teamNames.left} wins the Best of 3 championship!`;
      } else {
        finalMessage = `🏆 ${teamNames.right} is the Champion!`;
        finalAnnouncer = `${teamNames.right} wins the Best of 3 championship!`;
      }
      
      setOverallWinner(finalMessage);
      setAnnouncer(finalAnnouncer);
      // Generate confetti
      const pieces = [];
      for (let i = 0; i < 60; i++) {
        pieces.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: window.innerHeight,
          xVel: (Math.random() - 0.5) * 8,
          yVel: -Math.random() * 8 - 4,
          rotation: Math.random() * 360,
          color: [BRAND.primary, BRAND.blue, BRAND.red, '#f39c12'][Math.floor(Math.random() * 4)],
        });
      }
      setConfettiPieces(pieces);
      return;
    }

    setAnnouncer(`Round ${roundNumber} complete. Get ready for Round ${roundNumber + 1}.`);
    hasPlayedApplauseRef.current = false;
    // Auto-advance into the next round after the flash screen
    setTimeout(() => {
      startNextRound(true);
    }, 3000);
  }, [winner, overallWinner, roundsWon, left, right, roundNumber, teamNames, startNextRound]);

  useEffect(() => {
    if (!running || winner) return;

    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [running, winner]);

  useEffect(() => {
    if (!running || winner) return;
    const tick = setInterval(() => setAnimTick((v) => v + 1), 90);
    return () => clearInterval(tick);
  }, [running, winner]);

  useEffect(() => {
    if (!winner && timeLeft === 0 && started) {
      if (pull < 0) finishRound('left', `Round ${roundNumber}: Team 1 wins on final pull.`);
      else if (pull > 0) finishRound('right', `Round ${roundNumber}: Team 2 wins on final pull.`);
      else finishRound(null, `Round ${roundNumber}: Draw.`);
    }
  }, [timeLeft, pull, winner, started, finishRound, roundNumber]);

  useEffect(() => {
    if (winner) return;
    if (!hasPlayedApplauseRef.current) {
      playApplause(audioContextRef.current);
      hasPlayedApplauseRef.current = true;
    }
  }, [pull, winner, finishRound, roundNumber]);

  const nextSharedQuestion = useCallback((now) => {
    setQuestion(buildQuestion(now));
    setQuestionIssuedAt(Date.now());
    setLeft((p) => ({ ...p, input: '' }));
    setRight((p) => ({ ...p, input: '' }));
  }, []);

  const onUsePower = useCallback((side) => {
    if (!inputEnabled) return;
    const isLeft = side === 'left';
    const setter = isLeft ? setLeft : setRight;

    let used = false;
    setter((prev) => {
      if (prev.power <= 0) return prev;
      used = true;
      return { ...prev, power: prev.power - 1, powerFlash: 1 };
    });

    if (!used) return;

    setPull((p) => clampPull(p + (isLeft ? -2 : 2)));
    setAnnouncer(isLeft ? `${teamNames.left} used Power Pull.` : `${teamNames.right} used Power Pull.`);
  }, [inputEnabled, teamNames]);

  const onKey = useCallback((side, key) => {
    if (!inputEnabled) return;

    const setter = side === 'left' ? setLeft : setRight;
    setter((prev) => {
      let input = prev.input;
      if (key === 'C') input = '';
      else if (key === '<-') input = input.slice(0, -1);
      else if (input.length < 6) input += key;
      return { ...prev, input };
    });
  }, [inputEnabled]);

  const onSubmit = useCallback((side) => {
    if (!inputEnabled) return;

    const isLeft = side === 'left';
    const team = isLeft ? left : right;
    if (!team.input) return;

    const user = Number(team.input);
    const ok = Number.isFinite(user) && user === question.answer;
    const responseMs = Math.max(0, Date.now() - questionIssuedAt);

    if (ok) {
      const newStreak = team.streak + 1;
      let force = 1 + Math.min(2, Math.floor(newStreak / 3));
      const fastBonus = responseMs <= 2500;
      const comebackBonus = (isLeft && pull >= 5) || (!isLeft && pull <= -5);

      if (fastBonus) force += 1;
      if (comebackBonus) force += 1;

      const powerEarned = newStreak > 0 && newStreak % 3 === 0;

      if (isLeft) {
        setLeft((prev) => ({
          ...prev,
          input: '',
          score: prev.score + 10 * force,
          streak: newStreak,
          flash: 1,
          attempts: prev.attempts + 1,
          correct: prev.correct + 1,
          totalResponseMs: prev.totalResponseMs + responseMs,
          power: powerEarned ? Math.min(2, prev.power + 1) : prev.power,
        }));
        setPull((p) => clampPull(p - force));
      } else {
        setRight((prev) => ({
          ...prev,
          input: '',
          score: prev.score + 10 * force,
          streak: newStreak,
          flash: 1,
          attempts: prev.attempts + 1,
          correct: prev.correct + 1,
          totalResponseMs: prev.totalResponseMs + responseMs,
          power: powerEarned ? Math.min(2, prev.power + 1) : prev.power,
        }));
        setPull((p) => clampPull(p + force));
      }

      if (comebackBonus) {
        setAnnouncer(isLeft ? `${teamNames.left} comeback bonus activated.` : `${teamNames.right} comeback bonus activated.`);
      } else if (fastBonus) {
        setAnnouncer(isLeft ? `${teamNames.left} speed bonus.` : `${teamNames.right} speed bonus.`);
      } else if (powerEarned) {
        setAnnouncer(isLeft ? `${teamNames.left} earned a Power Pull.` : `${teamNames.right} earned a Power Pull.`);
        setTimeout(() => {
          onUsePower(side);
          setAnnouncer(isLeft ? `${teamNames.left} Power Pull activated! 💪` : `${teamNames.right} Power Pull activated! 💪`);
        }, 600);
      }

      nextSharedQuestion(timeLeft);
    } else {
      const update = (prev) => ({
        ...prev,
        input: '',
        streak: 0,
        score: Math.max(0, prev.score - 2),
        flash: 1,
        attempts: prev.attempts + 1,
        totalResponseMs: prev.totalResponseMs + responseMs,
      });
      if (isLeft) setLeft(update);
      else setRight(update);
      setAnnouncer(isLeft ? `${teamNames.left} missed. ${teamNames.right} chance.` : `${teamNames.right} missed. ${teamNames.left} chance.`);
    }
  }, [inputEnabled, left, right, question.answer, nextSharedQuestion, timeLeft, questionIssuedAt, pull, teamNames, onUsePower]);

  useEffect(() => {
    if (!left.flash && !right.flash && !left.powerFlash && !right.powerFlash) return;
    const timer = setTimeout(() => {
      setLeft((p) => ({ ...p, flash: 0, powerFlash: 0 }));
      setRight((p) => ({ ...p, flash: 0, powerFlash: 0 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [left.flash, right.flash, left.powerFlash, right.powerFlash]);

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        maxHeight: '100vh',
        boxSizing: 'border-box',
        fontFamily: "'Saira', 'Segoe UI', system-ui, sans-serif",
        background: `linear-gradient(135deg, #f5f9ff 0%, #eef3f9 50%, #e8f1f8 100%)`,
        padding: '12px 8px',
        color: BRAND.ink,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          flex: 1,
          gap: 12,
          width: '100%',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header - Minimalist */}
        <div
          style={{
            borderRadius: 16,
            border: `2px solid ${BRAND.border}`,
            background: `linear-gradient(135deg, ${BRAND.white} 0%, #f8fbfd 100%)`,
            boxShadow: '0 4px 12px rgba(1,48,98,0.08)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            userSelect: 'none',
            cursor: 'default',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="text"
                maxLength="15"
                value={teamNames.left}
                onChange={(e) => setTeamNames({ ...teamNames, left: e.target.value })}
                disabled={started}
                style={{
                  width: 95,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: `2px solid ${BRAND.blue}`,
                  fontSize: 12,
                  fontWeight: 800,
                  color: BRAND.blue,
                  background: BRAND.blueSoft,
                  cursor: started ? 'not-allowed' : 'default',
                  userSelect: 'none',
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: BRAND.muted }}>vs</span>
              <input
                type="text"
                maxLength="15"
                value={teamNames.right}
                onChange={(e) => setTeamNames({ ...teamNames, right: e.target.value })}
                disabled={started}
                style={{
                  width: 95,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: `2px solid ${BRAND.red}`,
                  fontSize: 12,
                  fontWeight: 800,
                  color: BRAND.red,
                  background: BRAND.redSoft,
                  cursor: started ? 'not-allowed' : 'default',
                  userSelect: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
              <label style={{ fontWeight: 700, color: BRAND.muted }}>Game Time (sec):</label>
              <input
                type="number"
                min="30"
                max="300"
                value={matchDuration}
                onChange={(e) => !started && setMatchDuration(Math.max(30, Math.min(300, parseInt(e.target.value) || 90)))}
                disabled={started}
                style={{
                  width: 60,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: `1px solid ${BRAND.border}`,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: started ? 'not-allowed' : 'default',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, color: BRAND.primary, fontWeight: 800, letterSpacing: 0.2 }}>
                Round {roundNumber}/3 • Series {roundsWon.left}-{roundsWon.right}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                border: `2px solid ${BRAND.border}`,
                background: BRAND.white,
                minWidth: 140,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 10, color: BRAND.muted, fontWeight: 800, textTransform: 'uppercase' }}>Time Left</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: BRAND.primary, fontFamily: "'Saira', 'Segoe UI', sans-serif", marginTop: 2 }}>
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>

            {!started && (
              <button
                onClick={startMatch}
                style={{
                  height: 44,
                  padding: '0 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: BRAND.primary,
                  color: BRAND.white,
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 200ms ease',
                  boxShadow: '0 4px 10px rgba(1,48,98,0.2)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#0d437c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = BRAND.primary;
                }}
              >
                Start Match
              </button>
            )}

            {started && !winner && (
              <button
                onClick={() => setRunning((r) => !r)}
                disabled={countdown > 0}
                style={{
                  height: 44,
                  padding: '0 18px',
                  borderRadius: 12,
                  border: 'none',
                  background: BRAND.primary,
                  color: BRAND.white,
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                  userSelect: 'none',
                  opacity: countdown > 0 ? 0.6 : 1,
                  transition: 'all 200ms ease',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {running ? 'Pause' : 'Resume'}
              </button>
            )}

            <button
              onClick={canStartNextRound ? startNextRound : resetMatch}
              style={{
                height: 44,
                padding: '0 18px',
                borderRadius: 12,
                border: `2px solid ${BRAND.border}`,
                background: BRAND.white,
                color: BRAND.primary,
                fontWeight: 900,
                fontSize: 13,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 200ms ease',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = BRAND.primarySoft;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = BRAND.white;
              }}
            >
              {canStartNextRound ? 'Next Round' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(360px, 1.4fr) 1fr', gap: 12, flex: 1, minHeight: 0 }}>
          <TeamPanel
            side="left"
            state={left}
            enabled={inputEnabled}
            onKey={onKey}
            onSubmit={onSubmit}
            focusReady={pull >= 5}
            teamName={teamNames.left}
          />

          <CenterArena
            challenge={question.text}
            running={running}
            animTick={animTick}
            pull={pull}
            countdown={countdown}
            winner={winner}
            overallWinner={overallWinner}
            announcer={announcer}
            inputEnabled={inputEnabled}
          />

          <TeamPanel
            side="right"
            state={right}
            enabled={inputEnabled}
            onKey={onKey}
            onSubmit={onSubmit}
            focusReady={pull <= -5}
            teamName={teamNames.right}
          />
        </div>

        {roundSummary && (
          <div
            style={{
              borderRadius: 14,
              border: `1px solid ${BRAND.border}`,
              background: BRAND.white,
              padding: '10px 14px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 12, color: BRAND.muted }}>Round {roundSummary.round} Accuracy</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: BRAND.blue }}>{teamNames.left}: {roundSummary.leftAccuracy}%</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: BRAND.red }}>{teamNames.right}: {roundSummary.rightAccuracy}%</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: BRAND.primary }}>Avg Speed: {roundSummary.leftAvgMs || '-'}ms / {roundSummary.rightAvgMs || '-'}ms</div>
          </div>
        )}

        {/* Fullscreen 3-2-1 countdown overlay */}
        {showFullscreenCountdown && countdownNumber > 0 && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9050,
              userSelect: 'none',
              cursor: 'default',
            }}
          >
            <div
              style={{
                fontSize: 180,
                fontWeight: 900,
                color: countdownNumber === 3 ? BRAND.blue : countdownNumber === 2 ? BRAND.primary : BRAND.red,
                textShadow: `0 10px 30px rgba(0,0,0,0.6)`,
                fontFamily: "'Saira', sans-serif",
                animation: 'countdownPulse 1s ease-in-out',
              }}
            >
              {countdownNumber}
            </div>
          </div>
        )}
        
        {/* Confetti animation */}
        {confettiPieces.length > 0 && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 9300,
            }}
          >
            {confettiPieces.map((piece) => (
              <div
                key={piece.id}
                style={{
                  position: 'absolute',
                  width: 10,
                  height: 10,
                  background: piece.color,
                  borderRadius: piece.id % 2 === 0 ? '50%' : '2px',
                  left: piece.x,
                  top: piece.y,
                  opacity: 1,
                  animation: `confettiFall 3s ease-in forwards`,
                  transform: `rotate(${piece.rotation}deg)`,
                }}
              />
            ))}
          </div>
        )}

        {/* Round intro overlay */}
        {roundShowIntro && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9000,
              animation: 'fadeIn 300ms ease-out',
              userSelect: 'none',
              cursor: 'default',
            }}
          >
            <div
              style={{
                fontSize: 160,
                fontWeight: 900,
                color: BRAND.white,
                textShadow: `0 8px 24px rgba(0,0,0,0.5)`,
                fontFamily: "'Saira', sans-serif",
                animation: 'scaleIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              ROUND {roundNumber}
            </div>
          </div>
        )}

        {/* Round winner modal */}
        {showRoundWinner && winner && !overallWinner && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9100,
              animation: 'fadeIn 400ms ease-out',
              userSelect: 'none',
              cursor: 'default',
            }}
          >
            <div
              style={{
                background: BRAND.white,
                borderRadius: 24,
                padding: '48px 40px',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                maxWidth: 500,
                animation: 'slideUp 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <div style={{ fontSize: 48, fontWeight: 900, color: BRAND.primary, marginBottom: 16 }}>
                🎉
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, color: BRAND.ink, marginBottom: 24 }}>
                {winner}
              </div>
              {roundSummary && (
                <div style={{ fontSize: 14, color: BRAND.muted, lineHeight: 1.8 }}>
                  <div>Accuracy: {roundSummary.leftAccuracy}% vs {roundSummary.rightAccuracy}%</div>
                  <div>Rounds Won: {roundsWon.left} - {roundsWon.right}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Game winner modal */}
        {overallWinner && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9200,
              animation: 'fadeIn 400ms ease-out',
              userSelect: 'none',
              cursor: 'default',
            }}
          >
            <div
              style={{
                background: `linear-gradient(135deg, ${BRAND.primarySoft} 0%, ${BRAND.blueSoft} 100%)`,
                borderRadius: 28,
                padding: '64px 48px',
                textAlign: 'center',
                boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
                maxWidth: 600,
                animation: 'slideUp 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <div style={{ fontSize: 72, fontWeight: 900, marginBottom: 24 }}>
                🏆
              </div>
              <div style={{ fontSize: 48, fontWeight: 900, color: BRAND.primary, marginBottom: 16 }}>
                {overallWinner}
              </div>
              <div style={{ fontSize: 18, color: BRAND.ink, marginBottom: 32, fontWeight: 700 }}>
                Best of 3 Championship!
              </div>
              <button
                onClick={resetMatch}
                style={{
                  padding: '14px 32px',
                  fontSize: 16,
                  fontWeight: 900,
                  borderRadius: 12,
                  border: 'none',
                  background: BRAND.primary,
                  color: BRAND.white,
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 200ms ease',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#0d437c';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = BRAND.primary;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes countdownPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        @keyframes powerPop {
          0% { transform: scale(0.65) translateY(-4px); opacity: 0; }
          55% { transform: scale(1.08) translateY(0); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotateX(0) rotateZ(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotateX(720deg) rotateZ(360deg) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
