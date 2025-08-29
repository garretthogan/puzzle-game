import React, { use, useEffect, useMemo, useRef, useState } from "react";
import useStatsStore from "./stats";

const COLORS = {
  bg: "#3f5172",
  border: "#22324e",
  panel: "#2d3d5b",
  accent: "#9BE7C5",
  text: "#e8eefc",
  dieFace: "#3a4b6e",
  edge: "#1f2c45",
};

const btnStyle = {
  background: COLORS.dieFace,
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  cursor: "pointer",
};

const categories = {
  moves: { color: "#89CFF0" },
  attack: { color: "#FF9DB4" },
  defense: { color: "#7DD6A1" },
  magic: { color: "#C293F2" },
};

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function normalizeInitial(total, init) {
  //   if (!init) {
  //     const base = Math.floor(total / 4);
  //     const rem = total - base * 4;
  //     const even = categories.map((_, i) => base + (i < rem ? 1 : 0));
  //     return Object.fromEntries(categories.map((c, i) => [c.key, even[i]]));
  //   }
  //   const vals = categories.map((c) =>
  //     clamp(Math.round(init[c.key] ?? 0), 0, total),
  //   );
  //   const sum = vals.reduce((a, b) => a + b, 0) || 1;
  //   let scaled = vals.map((v) => Math.max(0, Math.round((v / sum) * total)));
  //   let diff = total - scaled.reduce((a, b) => a + b, 0);
  //   for (let i = 0; diff !== 0 && i < 100; i++) {
  //     const idx = i % scaled.length;
  //     if (diff > 0) {
  //       scaled[idx]++;
  //       diff--;
  //     } else if (scaled[idx] > 0) {
  //       scaled[idx]--;
  //       diff++;
  //     }
  //   }
  //   return Object.fromEntries(categories.map((c, i) => [c.key, scaled[i]]));
}

export default function AllocationBar({
  totalPoints = 20,
  initial,
  onChange,
  width = 120,
  height = 240,
}) {
  const {
    statsArr,
    moves,
    attack,
    defense,
    magic,
    setStat,
    add,
    subtract,
    total,
  } = useStatsStore();
  const [alloc, setAlloc] = useState(() =>
    normalizeInitial(totalPoints, initial),
  );
  const [dragIdx, setDragIdx] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    setAlloc((prev) => normalizeInitial(totalPoints, prev));
  }, [totalPoints]);

  useEffect(() => {
    onChange && onChange(alloc);
  }, [alloc, onChange]);

  //   const values = categories.map((c) => alloc[c.key]);
  //   const sum = values.reduce((a, b) => a + b, 0);
  const pxPerPoint = height / Math.max(20, 1);

  const boundaries = useMemo(() => {
    let acc = 0;
    const arr = [];
    for (let i = 0; i < statsArr().length - 1; i++) {
      acc += statsArr()[i].value;
      arr.push(acc * pxPerPoint);
    }
    return arr;
  }, [pxPerPoint]);

  function setValueAt(idx, next) {
    const nextVals = values.slice();
    nextVals[idx] = clamp(Math.round(next), 0, totalPoints);
    let diff = totalPoints - nextVals.reduce((a, b) => a + b, 0);

    for (let i = 0; diff !== 0 && i < 64; i++) {
      const j = (idx + 1 + i) % nextVals.length;
      if (diff > 0) {
        nextVals[j]++;
        diff--;
      } else if (nextVals[j] > 0) {
        nextVals[j]--;
        diff++;
      }
    }
    const nextObj = Object.fromEntries(
      categories.map((c, i) => [c.key, nextVals[i]]),
    );
    setAlloc(nextObj);
  }

  function nudge(idx, delta) {
    const nextVals = values.slice();
    if (delta > 0) {
      const donor = nextVals.findIndex((v, j) => j !== idx && v > 0);
      if (donor === -1) return;
      nextVals[idx] += 1;
      nextVals[donor] -= 1;
    } else if (delta < 0 && nextVals[idx] > 0) {
      const rec = (idx + 1) % nextVals.length;
      nextVals[idx] -= 1;
      nextVals[rec] += 1;
    }
    const nextObj = Object.fromEntries(
      categories.map((c, i) => [c.key, nextVals[i]]),
    );
    setAlloc(nextObj);
  }

  const innerW = Math.max(56, width - 24);
  const barW = innerW - 16;

  return (
    <div
      style={{
        width,
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: 12,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI",
        color: COLORS.text,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Allocate Points</div>
      <p>
        Distribute your points according to the actions you want to take this
        turn.
      </p>
      <div
        style={{
          fontSize: 12,
          background: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          padding: "6px 8px",
          marginBottom: 10,
        }}
      >
        {/* Total: <b>{totalPoints}</b> &nbsp; (allocated: 20) */}
      </div>
      {/* <div style={{ display: "grid", placeItems: "center", marginBottom: 10 }}>
        <svg
          ref={svgRef}
          width={innerW}
          height={height}
          viewBox={`0 0 ${innerW} ${height}`}
          style={{
            background: COLORS.bg,
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            display: "block",
          }}
        >
          <rect
            x={(innerW - barW) / 2}
            y={8}
            width={barW}
            height={height - 16}
            rx="8"
            ry="8"
            fill={COLORS.dieFace}
            stroke={COLORS.edge}
            strokeWidth="2"
          />
          {/* {statsArr().map((stat, i) => {
            const x = (innerW - barW) / 2;
            let yBottom = height - 8;
            const h = stat.value * pxPerPoint;
            const y = yBottom - h;
            yBottom = y;

            return (
              <g key={stat.label}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  fill={stat.color}
                  opacity="0.9"
                />
                {h >= 28 && (
                  <text
                    x={innerW / 2}
                    y={y + h / 2 + 4}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="700"
                    fill={COLORS.text}
                    style={{ pointerEvents: "none" }}
                  >
                    Movement · {stat.label}
                  </text>
                )}
              </g>
            );
          })} 

          {boundaries.map((fromBottom, i) => {
            const y = height - 8 - fromBottom;
            return (
              <g
                key={`b-${i}`}
                onMouseDown={() => setDragIdx(i)}
                style={{ cursor: "ns-resize" }}
              >
                <rect
                  x={(innerW - barW) / 2}
                  y={y - 6}
                  width={barW}
                  height={12}
                  fill="transparent"
                />
                <line
                  x1={(innerW - barW) / 2 + 6}
                  x2={(innerW + barW) / 2 - 6}
                  y1={y}
                  y2={y}
                  stroke={COLORS.accent}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
      </div> */}

      <div
        style={{
          background: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: 8,
          display: "grid",
          gap: 6,
        }}
      >
        <div
        //   style={{
        //     display: "grid",
        //     gridTemplateColumns: "1fr auto auto",
        //     alignItems: "center",
        //     gap: 6,
        //   }}
        >
          {statsArr().map((stat) => {
            return (
              <div key={stat.id}>
                <div style={{ fontSize: 13, display: "inline-block" }}>
                  <span
                    style={{
                      color: "black",
                      display: "inline-block",
                      width: 24,
                      height: 24,
                      borderRadius: 2,
                      background: categories[stat.id].color,
                      marginRight: 6,
                      verticalAlign: "middle",
                      textAlign: "center",
                    }}
                  >
                    {stat.value}
                  </span>
                  <span style={{ opacity: 0.85 }}> {stat.label}</span>
                </div>
                <div style={{ display: "inline", paddingLeft: 6 }}>
                  <button style={btnStyle} onClick={() => subtract(stat.id)}>
                    -
                  </button>
                  <button style={btnStyle} onClick={() => add(stat.id)}>
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
