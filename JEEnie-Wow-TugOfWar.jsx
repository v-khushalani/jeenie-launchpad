export default function App() {
  const MAX_PULL = 6;
  const ROUND_TIME = 22;
  const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "-", "0", "DEL"];

  const [mode, setMode] = useState("mix");
  const [maxRounds, setMaxRounds] = useState(10);
  const [round, setRound] = useState(1);
  const [question, setQuestion] = useState(() => makeQuestion(1, "mix"));

  const [blueInput, setBlueInput] = useState("");
  const [orangeInput, setOrangeInput] = useState("");

  const [blueScore, setBlueScore] = useState(0);
  const [orangeScore, setOrangeScore] = useState(0);
  const [ropePull, setRopePull] = useState(0);

  const [seconds, setSeconds] = useState(ROUND_TIME);
  const [locked, setLocked] = useState(false);
  const [over, setOver] = useState(false);
  const [status, setStatus] = useState("Solve fast and smash ENTER to pull the rope.");
  const [winner, setWinner] = useState("");

  const [pulse, setPulse] = useState(null);
  const [shake, setShake] = useState(false);
  const [confetti, setConfetti] = useState([]);

  const flagLeft = 50 - ropePull * 7;

  useEffect(() => {
    if (over || locked) return;
    const timer = setInterval(() => {
      setSeconds((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [over, locked]);

  useEffect(() => {
    if (!over && !locked && seconds === 0) resolveRound(null);
  }, [seconds, over, locked]);

  useEffect(() => {
    setQuestion(makeQuestion(round, mode));
    setBlueInput("");
    setOrangeInput("");
    setStatus("Mode updated. Let the battle continue.");
  }, [mode]);

  function makeQuestion(r, m) {
    const op = m === "mix" ? pick(["+", "-", "x"]) : m === "add" ? "+" : m === "sub" ? "-" : "x";
    const lvl = Math.min(5, Math.floor((r - 1) / 2) + 1);

    if (op === "+") {
      const max = lvl === 1 ? 20 : lvl === 2 ? 40 : lvl === 3 ? 70 : lvl === 4 ? 120 : 160;
      const a = rand(1, max);
      const b = rand(1, max);
      return { label: a + " + " + b + " = ?", answer: a + b };
    }

    if (op === "-") {
      const max = lvl === 1 ? 30 : lvl === 2 ? 60 : lvl === 3 ? 100 : lvl === 4 ? 150 : 200;
      const hi = rand(10, max);
      const lo = rand(1, Math.max(2, hi - 1));
      return { label: hi + " - " + lo + " = ?", answer: hi - lo };
    }

    const mx = lvl === 1 ? 7 : lvl === 2 ? 10 : lvl === 3 ? 13 : lvl === 4 ? 16 : 20;
    const a = rand(2, mx);
    const b = rand(2, mx);
    return { label: a + " x " + b + " = ?", answer: a * b };
  }

  function nextRound() {
    const nr = round + 1;
    setRound(nr);
    setQuestion(makeQuestion(nr, mode));
    setBlueInput("");
    setOrangeInput("");
    setSeconds(ROUND_TIME);
    setLocked(false);
    setPulse(null);
    setStatus("New round. Pull harder!");
  }

  function finish(a, b, pull) {
    setOver(true);
    if (Math.abs(pull) >= MAX_PULL) {
      const w = pull > 0 ? "Team Blue" : "Team Orange";
      setWinner(w + " DOMINATES by rope power!");
      triggerConfetti(w === "Team Blue" ? "blue" : "orange");
      return;
    }

    if (a > b) {
      setWinner("Team Blue wins on points!");
      triggerConfetti("blue");
    } else if (b > a) {
      setWinner("Team Orange wins on points!");
      triggerConfetti("orange");
    } else {
      setWinner("Deadlock! Both teams are legends.");
      triggerConfetti("mix");
    }
  }

  function triggerConfetti(theme) {
    const colors =
      theme === "blue"
        ? ["#013062", "#2b6cb0", "#84b6ff", "#d8e9ff"]
        : theme === "orange"
          ? ["#c96512", "#f08a24", "#ffd2a8", "#fff0e1"]
          : ["#013062", "#c96512", "#2b6cb0", "#f08a24", "#84b6ff", "#ffd2a8"];

    const pieces = Array.from({ length: 110 }).map((_, i) => ({
      id: i + "-" + Math.random(),
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.8 + Math.random() * 1.8,
      rot: -240 + Math.random() * 480,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 5 + Math.random() * 6,
    }));
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 3800);
  }

  function resolveRound(win) {
    if (locked || over) return;
    setLocked(true);

    const nextBlue = win === "A" ? blueScore + 1 : blueScore;
    const nextOrange = win === "B" ? orangeScore + 1 : orangeScore;
    const nextPull = win === "A" ? ropePull + 1 : win === "B" ? ropePull - 1 : ropePull;

    setBlueScore(nextBlue);
    setOrangeScore(nextOrange);
    setRopePull(nextPull);

    setShake(true);
    setTimeout(() => setShake(false), 280);

    if (win === "A") {
      setPulse("A");
      setStatus("TEAM BLUE STRIKES. FLAG MOVES LEFT.");
    } else if (win === "B") {
      setPulse("B");
      setStatus("TEAM ORANGE STRIKES. FLAG MOVES RIGHT.");
    } else {
      setPulse(null);
      setStatus("Time up. No pull this round.");
    }

    const doneByRounds = round >= maxRounds;
    const doneByPull = Math.abs(nextPull) >= MAX_PULL;

    if (doneByRounds || doneByPull) {
      setTimeout(() => finish(nextBlue, nextOrange, nextPull), 900);
      return;
    }

    setTimeout(nextRound, 1000);
  }

  function submit(team) {
    if (locked || over) return;
    const raw = team === "A" ? blueInput.trim() : orangeInput.trim();
    if (!raw) return;
    const val = Number(raw);
    if (Number.isNaN(val)) return;

    if (val === question.answer) {
      resolveRound(team);
    } else {
      setStatus((team === "A" ? "Blue" : "Orange") + " guessed " + val + ". Keep fighting.");
    }
  }

  function keyPress(team, key) {
    if (locked || over) return;
    const value = team === "A" ? blueInput : orangeInput;
    const setValue = team === "A" ? setBlueInput : setOrangeInput;

    if (key === "C") {
      setValue("");
      return;
    }

    if (key === "DEL") {
      setValue(value.slice(0, -1));
      return;
    }

    if (key === "ENTER") {
      submit(team);
      return;
    }

    if (/^[0-9-]$/.test(key)) {
      if (key === "-" && (value.includes("-") || value.length > 0)) return;
      if (value.length >= 6) return;
      setValue(value + key);
    }
  }

  function resetAll() {
    setRound(1);
    setQuestion(makeQuestion(1, mode));
    setBlueInput("");
    setOrangeInput("");
    setBlueScore(0);
    setOrangeScore(0);
    setRopePull(0);
    setSeconds(ROUND_TIME);
    setLocked(false);
    setOver(false);
    setWinner("");
    setPulse(null);
    setConfetti([]);
    setStatus("Fresh game started. Crowd is waiting!");
  }

  const tiltBlue = -10 - Math.max(0, ropePull) * 1.4;
  const tiltOrange = 10 + Math.max(0, -ropePull) * 1.4;

  return (
    <div style={ui.root}>
      <style>{css}</style>

      <div style={ui.topBar}>
        <div style={ui.brand}>JEEnie Arena</div>
        <div style={ui.controls}>
          <label style={ui.label}>Mode
            <select value={mode} onChange={(e) => setMode(e.target.value)} style={ui.select} disabled={over}>
              <option value="mix">Mixed</option>
              <option value="add">Addition</option>
              <option value="sub">Subtraction</option>
              <option value="mul">Multiplication</option>
            </select>
          </label>
          <label style={ui.label}>Rounds
            <select value={maxRounds} onChange={(e) => setMaxRounds(Number(e.target.value))} style={ui.select} disabled={over}>
              <option value={8}>8</option>
              <option value={10}>10</option>
              <option value={12}>12</option>
              <option value={15}>15</option>
            </select>
          </label>
          <button className="j-btn" style={ui.restart} onClick={resetAll}>Restart</button>
        </div>
      </div>

      <div style={ui.scoreBar}>
        <div style={{ ...ui.teamScore, ...ui.blueScore, boxShadow: pulse === "A" ? "0 0 0 3px rgba(43,108,176,0.25)" : "none" }}>Blue: {blueScore}</div>
        <div style={ui.meta}>Round {round}/{maxRounds}<br />Time: {seconds}s</div>
        <div style={{ ...ui.teamScore, ...ui.orangeScore, boxShadow: pulse === "B" ? "0 0 0 3px rgba(201,101,18,0.25)" : "none" }}>Orange: {orangeScore}</div>
      </div>

      <div style={ui.stage} className={shake ? "j-shake" : ""}>
        <div style={ui.zoneRow}><span>Team Blue Pull Zone</span><span>Team Orange Pull Zone</span></div>

        <div style={ui.trackWrap}>
          <div style={ui.trackGradient} />
          <div style={ui.centerLine} />
          <div className="j-rope" style={ui.rope} />
          <div style={{ ...ui.flag, left: flagLeft + "%" }}>
            <span style={ui.flagPole} />
            <span style={ui.flagCloth}><span style={ui.flagBlue} /><span style={ui.flagOrange} /></span>
          </div>
        </div>

        <div style={ui.playerRow}>
          <PlayerTeam color="#013062" side="left" tilt={tiltBlue} pulse={pulse === "A"} />
          <PlayerTeam color="#c96512" side="right" tilt={tiltOrange} pulse={pulse === "B"} />
        </div>
      </div>

      <div style={ui.questionCard}>
        <div style={ui.question}>{question.label}</div>
        <div style={ui.hint}>First correct answer wins the round.</div>
      </div>

      {over ? (
        <div style={ui.winnerCard}>
          <div style={ui.winnerText}>{winner}</div>
          <div style={ui.winnerSub}>Restart to run another showdown.</div>
        </div>
      ) : (
        <div style={ui.gameGrid}>
          <TeamPanel
            name="Team Blue"
            accent="#013062"
            soft="#e6eeff"
            value={blueInput}
            onChange={setBlueInput}
            onSubmit={() => submit("A")}
            onKey={(k) => keyPress("A", k)}
            keys={KEYS}
            disabled={locked || over}
          />

          <div style={ui.middleCard}>
            <div style={ui.middleStatus}>{status}</div>
            <button className="j-btn" style={ui.skipBtn} onClick={() => resolveRound(null)} disabled={locked || over}>Skip</button>
          </div>

          <TeamPanel
            name="Team Orange"
            accent="#c96512"
            soft="#fff2e6"
            value={orangeInput}
            onChange={setOrangeInput}
            onSubmit={() => submit("B")}
            onKey={(k) => keyPress("B", k)}
            keys={KEYS}
            disabled={locked || over}
          />
        </div>
      )}

      <div className="j-confetti-layer" aria-hidden>
        {confetti.map((c) => (
          <span
            key={c.id}
            className="j-confetti"
            style={{
              left: c.left + "%",
              animationDelay: c.delay + "s",
              animationDuration: c.dur + "s",
              background: c.color,
              width: c.size + "px",
              height: c.size * 1.7 + "px",
              transform: "rotate(" + c.rot + "deg)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TeamPanel(props) {
  return (
    <div style={{ ...ui.panel, borderColor: props.accent }}>
      <div style={{ ...ui.panelTitle, color: props.accent }}>{props.name}</div>

      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.replace(/[^0-9-]/g, "").slice(0, 6))}
        onKeyDown={(e) => e.key === "Enter" && props.onSubmit()}
        disabled={props.disabled}
        placeholder="Type answer"
        style={{ ...ui.input, borderColor: props.accent, background: props.soft }}
      />

      <div style={ui.keysGrid}>
        {props.keys.map((k) => (
          <button
            key={props.name + k}
            className="j-btn"
            style={{ ...ui.keyBtn, background: props.soft, color: props.accent, opacity: props.disabled ? 0.55 : 1 }}
            onClick={() => props.onKey(k)}
            disabled={props.disabled}
          >
            {k}
          </button>
        ))}
      </div>

      <div style={ui.actionRow}>
        <button className="j-btn" style={{ ...ui.enterBtn, background: props.accent }} onClick={props.onSubmit} disabled={props.disabled}>ENTER</button>
        <button className="j-btn" style={{ ...ui.clearBtn, borderColor: props.accent, color: props.accent }} onClick={() => props.onKey("C")} disabled={props.disabled}>CLEAR</button>
      </div>
    </div>
  );
}

function PlayerTeam({ color, side, tilt, pulse }) {
  const dir = side === "left" ? -1 : 1;

  return (
    <div style={{ ...ui.teamWrap, justifyContent: side === "left" ? "flex-start" : "flex-end" }}>
      {[0, 1, 2, 3].map((idx) => (
        <div
          key={side + idx}
          className={pulse ? "j-player-pulse" : ""}
          style={{
            ...ui.player,
            transform: "translateX(" + dir * idx * 2 + "px) rotate(" + tilt + "deg)",
            animationDelay: idx * 40 + "ms",
          }}
        >
          <span style={ui.head} />
          <span style={{ ...ui.shirt, background: color }}>J</span>
          <span style={{ ...ui.arm, borderColor: color, transform: side === "left" ? "rotate(-18deg)" : "rotate(18deg)" }} />
          <span style={{ ...ui.legs, borderColor: color }} />
        </div>
      ))}
    </div>
  );
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const ui = {
  root: {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    display: "grid",
    gap: 10,
    gridTemplateRows: "auto auto auto auto minmax(0,1fr)",
    padding: 10,
    background:
      "radial-gradient(1200px 500px at 10% -20%, rgba(1,48,98,0.18), transparent 55%), radial-gradient(1000px 420px at 90% 0%, rgba(201,101,18,0.18), transparent 60%), linear-gradient(180deg,#f5f9ff 0%,#edf4ff 100%)",
    fontFamily: "Saira, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif",
    color: "#10294f",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #cadbf6",
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(6px)",
  },
  brand: {
    fontSize: 15,
    fontWeight: 900,
    letterSpacing: 0.2,
    color: "#013062",
    textTransform: "uppercase",
  },
  controls: { display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" },
  label: { display: "grid", gap: 3, fontSize: 11, fontWeight: 800, color: "#3f5f89" },
  select: {
    border: "1px solid #bfd2f0",
    borderRadius: 9,
    padding: "6px 8px",
    minWidth: 96,
    background: "#fff",
    color: "#0e2a50",
    fontWeight: 700,
  },
  restart: {
    background: "linear-gradient(135deg,#013062,#0f4f93)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
  },
  scoreBar: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: 8,
    alignItems: "center",
    padding: 8,
    borderRadius: 14,
    border: "1px solid #cadbf6",
    background: "rgba(255,255,255,0.85)",
  },
  teamScore: {
    textAlign: "center",
    borderRadius: 10,
    padding: "8px 10px",
    fontWeight: 900,
    fontSize: "clamp(14px,1.6vw,18px)",
    transition: "box-shadow 180ms ease",
  },
  blueScore: { background: "#e6eeff", color: "#013062" },
  orangeScore: { background: "#fff2e6", color: "#c96512" },
  meta: {
    textAlign: "center",
    color: "#446086",
    fontWeight: 800,
    fontSize: 12,
    lineHeight: 1.25,
    minWidth: 94,
  },
  stage: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #cadbf6",
    background: "rgba(255,255,255,0.86)",
    display: "grid",
    gap: 7,
  },
  zoneRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    fontWeight: 900,
    color: "#57739a",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  trackWrap: {
    position: "relative",
    height: 44,
    borderRadius: 999,
    border: "1px solid #cadbf6",
    overflow: "hidden",
  },
  trackGradient: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(90deg,#e8f1ff 0%,#f8fbff 50%,#fff4e8 100%)",
  },
  rope: {
    position: "absolute",
    left: "6%",
    right: "6%",
    top: "50%",
    height: 7,
    transform: "translateY(-50%)",
    borderRadius: 999,
    background: "repeating-linear-gradient(90deg,#8a6f49 0 9px,#b59267 9px 18px)",
    boxShadow: "0 1px 0 rgba(255,255,255,0.35) inset",
  },
  centerLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 2,
    transform: "translateX(-50%)",
    background: "#013062",
    opacity: 0.45,
  },
  flag: {
    position: "absolute",
    top: "50%",
    transform: "translate(-50%,-50%)",
    width: 42,
    height: 24,
    transition: "left 260ms cubic-bezier(0.22,0.78,0.24,1)",
    pointerEvents: "none",
  },
  flagPole: {
    position: "absolute",
    left: 6,
    top: 1,
    width: 2,
    height: 22,
    borderRadius: 999,
    background: "#7b8494",
  },
  flagCloth: {
    position: "absolute",
    left: 8,
    top: 2,
    width: 30,
    height: 16,
    borderRadius: 3,
    overflow: "hidden",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    border: "1px solid rgba(255,255,255,0.8)",
    boxShadow: "0 4px 10px rgba(0,0,0,0.16)",
  },
  flagBlue: { background: "#013062" },
  flagOrange: { background: "#c96512" },
  playerRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" },
  teamWrap: { display: "flex", gap: 8, minHeight: 42 },
  player: {
    position: "relative",
    width: 18,
    height: 36,
    transition: "transform 220ms ease",
    filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.12))",
  },
  head: {
    position: "absolute",
    left: "50%",
    top: 0,
    width: 10,
    height: 10,
    transform: "translateX(-50%)",
    borderRadius: "50%",
    background: "#f2c4a0",
    border: "1px solid rgba(0,0,0,0.08)",
  },
  shirt: {
    position: "absolute",
    left: "50%",
    top: 10,
    width: 14,
    height: 14,
    transform: "translateX(-50%)",
    borderRadius: 5,
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontSize: 8,
    fontWeight: 900,
    textShadow: "0 1px 1px rgba(0,0,0,0.3)",
  },
  arm: {
    position: "absolute",
    top: 14,
    width: 12,
    height: 5,
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
    borderRadius: 999,
  },
  legs: {
    position: "absolute",
    left: "50%",
    bottom: 2,
    width: 12,
    height: 7,
    transform: "translateX(-50%)",
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
    borderRadius: 999,
  },
  questionCard: {
    borderRadius: 14,
    border: "1px solid #cadbf6",
    background: "rgba(255,255,255,0.86)",
    padding: "8px 10px",
    textAlign: "center",
  },
  question: {
    fontSize: "clamp(28px,3.7vw,44px)",
    lineHeight: 1.1,
    fontWeight: 900,
    color: "#013062",
    letterSpacing: -0.2,
  },
  hint: { fontSize: 12, color: "#4b6890", fontWeight: 700, marginTop: 2 },
  gameGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 190px 1fr",
    gap: 8,
    minHeight: 0,
    overflow: "hidden",
  },
  panel: {
    border: "1px solid",
    borderRadius: 14,
    background: "rgba(255,255,255,0.9)",
    padding: 9,
    display: "grid",
    gap: 7,
    alignContent: "start",
    minHeight: 0,
    overflow: "hidden",
  },
  panelTitle: { margin: 0, fontSize: 16, fontWeight: 900 },
  input: {
    width: "100%",
    border: "1px solid",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 18,
    fontWeight: 900,
    outline: "none",
  },
  keysGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 },
  keyBtn: {
    border: "none",
    borderRadius: 9,
    minHeight: 31,
    fontSize: 13,
    fontWeight: 900,
  },
  actionRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 },
  enterBtn: {
    color: "#fff",
    border: "none",
    borderRadius: 9,
    padding: "8px 7px",
    fontSize: 11,
    fontWeight: 900,
  },
  clearBtn: {
    background: "#fff",
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 9,
    padding: "8px 7px",
    fontSize: 11,
    fontWeight: 900,
  },
  middleCard: {
    borderRadius: 14,
    border: "1px solid #cadbf6",
    background: "rgba(255,255,255,0.9)",
    padding: 10,
    display: "grid",
    alignContent: "center",
    justifyItems: "center",
    gap: 10,
    textAlign: "center",
  },
  middleStatus: {
    margin: 0,
    color: "#3a5781",
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1.35,
  },
  skipBtn: {
    borderRadius: 9,
    border: "1px solid #c7d7ef",
    background: "#fff",
    color: "#013062",
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 900,
  },
  winnerCard: {
    borderRadius: 14,
    border: "1px solid #cadbf6",
    background: "rgba(255,255,255,0.92)",
    display: "grid",
    alignContent: "center",
    justifyItems: "center",
    gap: 6,
    padding: 16,
  },
  winnerText: { fontSize: 24, fontWeight: 900, color: "#013062", textAlign: "center" },
  winnerSub: { fontSize: 13, color: "#4d6a92", fontWeight: 700 },
};

const css = `
  .j-btn {
    cursor: pointer;
    transition: transform .14s ease, box-shadow .2s ease, opacity .18s ease;
  }
  .j-btn:active { transform: translateY(1px); }
  .j-btn:disabled { opacity: .55; cursor: not-allowed; }

  .j-rope { animation: j-rope-breathe 1.8s ease-in-out infinite; }
  @keyframes j-rope-breathe {
    0%,100% { transform: translateY(-50%) scaleX(1); }
    50% { transform: translateY(-50%) scaleX(1.01); }
  }

  .j-shake { animation: j-shake .26s linear; }
  @keyframes j-shake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-2px); }
    40% { transform: translateX(2px); }
    60% { transform: translateX(-1px); }
    80% { transform: translateX(1px); }
  }

  .j-player-pulse { animation: j-player-hit .28s ease; }
  @keyframes j-player-hit {
    0% { filter: brightness(1); }
    50% { filter: brightness(1.18); }
    100% { filter: brightness(1); }
  }

  .j-confetti-layer {
    pointer-events: none;
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  .j-confetti {
    position: absolute;
    top: -18px;
    border-radius: 2px;
    opacity: .95;
    animation-name: j-fall;
    animation-timing-function: cubic-bezier(.18,.62,.24,.99);
    animation-fill-mode: both;
  }
  @keyframes j-fall {
    0% { transform: translate3d(0,-10px,0) rotate(0deg); opacity: 0; }
    10% { opacity: .95; }
    100% { transform: translate3d(0,108vh,0) rotate(540deg); opacity: .95; }
  }

  @media (max-width: 980px) {
    .j-confetti { display: none; }
  }
`;
