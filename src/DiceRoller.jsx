import React, { useMemo, useState } from "react";

const COLORS = {
  bg: "#3f5172",
  border: "#22324e",
  panel: "#2d3d5b",
  grid: "#2b3b5a",
  accent: "#9BE7C5",
  text: "#e8eefc",
  dieFace: "#3a4b6e",
  dieEdge: "#1f2c45",
  pip: "#e8eefc",
  glow: "rgba(155, 231, 197, 0.25)",
};

const btnStyle = {
  background: COLORS.dieFace,
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
  cursor: "pointer",
};

const inputStyle = {
  background: COLORS.dieFace,
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  padding: "8px 10px",
  width: 90,
  fontSize: 13,
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollArray(n, sides) {
  return Array.from({ length: n }, () => randInt(1, sides));
}

const pip = (x, y, r = 7) => ({ x, y, r });
const positionsD6 = {
  1: [pip(50, 50)],
  2: [pip(30, 30), pip(70, 70)],
  3: [pip(25, 25), pip(50, 50), pip(75, 75)],
  4: [pip(30, 30), pip(70, 30), pip(30, 70), pip(70, 70)],
  5: [pip(30, 30), pip(70, 30), pip(50, 50), pip(30, 70), pip(70, 70)],
  6: [
    pip(30, 25),
    pip(70, 25),
    pip(30, 50),
    pip(70, 50),
    pip(30, 75),
    pip(70, 75),
  ],
};

function DieSVG({ value, sides, size = 72, onClick, highlight = false }) {
  const view = 100;
  const edge = 10;

  const polygon = useMemo(() => {
    const n = Math.max(3, Math.min(sides, 20));
    const cx = 50,
      cy = 50,
      r = 40;
    const pts = Array.from({ length: n }, (_, i) => {
      const a = ((Math.PI * 2) / n) * i - Math.PI / 2;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");
    return pts;
  }, [sides]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${view} ${view}`}
      style={{
        borderRadius: 8,
        boxShadow: highlight ? `0 0 0 3px ${COLORS.accent} inset` : "none",
        transition: "transform 120ms ease",
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <rect
        x={edge}
        y={edge}
        width={view - edge * 2}
        height={view - edge * 2}
        rx={12}
        ry={12}
        fill={COLORS.dieFace}
        stroke={COLORS.dieEdge}
        strokeWidth='3'
      />
      {sides === 6 ? (
        <g>
          {positionsD6[value]?.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={COLORS.pip} />
          ))}
        </g>
      ) : (
        <g>
          <polygon
            points={polygon}
            fill={COLORS.bg}
            stroke={COLORS.dieEdge}
            strokeWidth='3'
          />
          <text
            x='50'
            y='54'
            textAnchor='middle'
            fontSize='36'
            fontWeight='700'
            fill={COLORS.text}
            style={{ fontFamily: "system-ui, -apple-system, Segoe UI" }}
          >
            {value}
          </text>
          <text
            x='50'
            y='90'
            textAnchor='middle'
            fontSize='10'
            fill={COLORS.text}
            opacity='0.7'
            style={{ fontFamily: "system-ui, -apple-system, Segoe UI" }}
          >
            d{sides}
          </text>
        </g>
      )}
    </svg>
  );
}

export default function DiceRoller() {
  const [count, setCount] = useState(4);
  const [sides, setSides] = useState(6);
  const [faces, setFaces] = useState(rollArray(count, sides));
  const [rollingIdx, setRollingIdx] = useState(-1);
  const [history, setHistory] = useState([]);

  const total = useMemo(() => faces.reduce((a, b) => a + b, 0), [faces]);

  function rollAll() {
    const next = rollArray(count, sides);
    setFaces(next);
    setHistory((h) =>
      [
        { sum: next.reduce((a, b) => a + b, 0), faces: next, sides },
        ...h,
      ].slice(0, 10)
    );
    setRollingIdx(-1);
  }

  function reRollAt(i) {
    setRollingIdx(i);
    setTimeout(() => {
      setFaces((prev) => {
        const next = prev.slice();
        next[i] = randInt(1, sides);
        return next;
      });
      setRollingIdx(-1);
    }, 120);
  }

  function syncCount(nextCount) {
    const n = Math.max(1, Math.min(30, parseInt(nextCount || "1", 10)));
    setCount(n);
    setFaces((prev) => {
      const arr = prev.slice(0, n);
      while (arr.length < n) arr.push(randInt(1, sides));
      return arr;
    });
  }

  function syncSides(nextSides) {
    const s = Math.max(2, Math.min(100, parseInt(nextSides || "6", 10)));
    setSides(s);
    setFaces((prev) => prev.map(() => randInt(1, s)));
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI",
        color: COLORS.text,
        paddingTop: 2,
      }}
    >
      <div
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: 12,
          height: "fit-content",
          maxHeight: 230,
          overflow: "scroll",
        }}
      >
        <h3 style={{ margin: "4px 0 12px" }}>Dice Tray</h3>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, opacity: 0.9 }}>
            Dice
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input
              type='number'
              min={1}
              max={30}
              value={count}
              onChange={(e) => syncCount(e.target.value)}
              style={inputStyle}
            />
            <input
              type='number'
              min={2}
              max={100}
              value={sides}
              onChange={(e) => syncSides(e.target.value)}
              style={inputStyle}
            />
            <button style={btnStyle} onClick={rollAll}>
              Roll
            </button>
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
            Count &nbsp; / &nbsp; Sides (e.g., 6 = d6, 20 = d20)
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontSize: 14,
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              padding: "8px 10px",
              borderRadius: 6,
            }}
          >
            Total: <b>{total}</b> &nbsp; ({count} × d{sides})
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              opacity: 0.9,
              marginBottom: 6,
            }}
          >
            History (last 10)
          </label>
          <div
            style={{
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              padding: 8,
              maxHeight: 18,
              overflow: "auto",
              fontSize: 12,
              overflowY: "scroll",
            }}
          >
            {history.length === 0 && (
              <div style={{ opacity: 0.7 }}>No rolls yet.</div>
            )}
            {history.map((h, i) => (
              <div
                key={i}
                style={{
                  padding: "6px 8px",
                  borderBottom:
                    i < history.length - 1
                      ? `1px solid ${COLORS.border}`
                      : "none",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>
                    Sum: <b>{h.sum}</b> ({h.faces.length}×d{h.sides})
                  </span>
                </div>
                <div style={{ opacity: 0.85, marginTop: 2 }}>
                  {h.faces.join(" • ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: 12,
          maxHeight: 230,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))",
          }}
        >
          {faces.map((v, i) => (
            <div
              key={i}
              style={{
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: 6,
                display: "grid",
                placeItems: "center",
                position: "relative",
              }}
            >
              {/* subtle glow when re-rolling */}
              {rollingIdx === i && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 8,
                    boxShadow: `0 0 0 100vmax ${COLORS.glow} inset`,
                    pointerEvents: "none",
                    transition: "opacity 120ms",
                  }}
                />
              )}
              <DieSVG
                value={Math.min(v, sides)}
                sides={sides}
                size={76}
                onClick={() => reRollAt(i)}
                highlight={rollingIdx === i}
              />
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                click to re-roll
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
