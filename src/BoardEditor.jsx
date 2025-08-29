import React, { useMemo, useRef, useState, useEffect } from "react";

/**
 * BoardEditor (SVG)
 * - Left click: paint with selected brush (drag to paint continuously)
 * - Right click (or select "Eraser"): clear a tile / remove entities on that cell
 * - Toolbar: choose brush, resize grid, export/import JSON
 * - Props are optional; the component is fully self-contained and stylable.
 */

const CELL = 44; // px size for each grid cell (visual only)
const TILE_TYPES = ["empty", "wall", "spawn"];
const ENTITY_TYPES = ["smallDot", "bigDot", "player", "enemy"];

const PALETTE = [
  { kind: "tile", type: "wall", label: "Wall" },
  { kind: "tile", type: "spawn", label: "Spawn" },
  { kind: "tile", type: "empty", label: "Empty" },
  { kind: "entity", type: "smallDot", label: "Small Dot" },
  { kind: "entity", type: "bigDot", label: "Big Dot" },
  { kind: "entity", type: "player", label: "Player" },
  { kind: "entity", type: "enemy", label: "Enemy" },
  { kind: "eraser", type: "eraser", label: "Eraser" },
];

function createEmptyBoard(rows, cols) {
  return {
    rows,
    cols,
    tiles: Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => "empty")
    ),
    // entities: array of { type, r, c }
    entities: [],
  };
}

function cloneBoard(board) {
  return {
    rows: board.rows,
    cols: board.cols,
    tiles: board.tiles.map((row) => row.slice()),
    entities: board.entities.map((e) => ({ ...e })),
  };
}

function key(r, c) {
  return `${r},${c}`;
}

export default function BoardEditor({
  initialRows = 10,
  initialCols = 10,
  initialBoard = null,
  onChange,
}) {
  const [board, setBoard] = useState(
    initialBoard || createEmptyBoard(initialRows, initialCols)
  );
  const [brush, setBrush] = useState(PALETTE[0]); // default "Wall"
  const [isPainting, setIsPainting] = useState(false);
  const [hoverCell, setHoverCell] = useState(null);
  const svgRef = useRef(null);

  // Notify parent on change (if provided)
  useEffect(() => {
    if (onChange) onChange(board);
  }, [board, onChange]);

  const size = useMemo(
    () => ({ width: board.cols * CELL, height: board.rows * CELL }),
    [board.cols, board.rows]
  );

  function setTile(r, c, type) {
    setBoard((prev) => {
      const next = cloneBoard(prev);
      next.tiles[r][c] = type;
      // Clearing a tile doesn't auto-remove entities (keeps flexibility).
      return next;
    });
  }

  function toggleEntity(r, c, type) {
    setBoard((prev) => {
      const next = cloneBoard(prev);
      const idx = next.entities.findIndex(
        (e) => e.r === r && e.c === c && e.type === type
      );
      if (idx !== -1) {
        next.entities.splice(idx, 1); // remove existing
      } else {
        next.entities.push({ type, r, c });
      }
      return next;
    });
  }

  function clearCell(r, c) {
    setBoard((prev) => {
      const next = cloneBoard(prev);
      next.tiles[r][c] = "empty";
      next.entities = next.entities.filter((e) => !(e.r === r && e.c === c));
      return next;
    });
  }

  function applyBrush(r, c, currentBrush = brush) {
    if (r < 0 || c < 0 || r >= board.rows || c >= board.cols) return;
    if (currentBrush.kind === "tile") {
      setTile(r, c, currentBrush.type);
    } else if (currentBrush.kind === "entity") {
      toggleEntity(r, c, currentBrush.type);
    } else if (currentBrush.kind === "eraser") {
      clearCell(r, c);
    }
  }

  // Painting via transparent per-cell hit rectangles (simple & reliable)
  function CellHit({ r, c }) {
    const x = c * CELL;
    const y = r * CELL;
    return (
      <rect
        x={x}
        y={y}
        width={CELL}
        height={CELL}
        fill='transparent'
        onMouseDown={(e) => {
          e.preventDefault();
          setIsPainting(true);
          applyBrush(r, c);
        }}
        onMouseEnter={() => setHoverCell({ r, c })}
        onMouseMove={(e) => {
          if (isPainting) applyBrush(r, c);
        }}
        onMouseUp={() => setIsPainting(false)}
        onContextMenu={(e) => {
          e.preventDefault();
          applyBrush(r, c, { kind: "eraser", type: "eraser" });
        }}
        style={{ cursor: "crosshair" }}
      />
    );
  }

  useEffect(() => {
    const up = () => setIsPainting(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  // Toolbar helpers
  const [rowsInput, setRowsInput] = useState(board.rows);
  const [colsInput, setColsInput] = useState(board.cols);
  function resizeBoard() {
    const r = Math.max(1, parseInt(rowsInput || 1, 10));
    const c = Math.max(1, parseInt(colsInput || 1, 10));
    setBoard((prev) => {
      const next = createEmptyBoard(r, c);
      // copy overlap area from previous board
      const rr = Math.min(prev.rows, r);
      const cc = Math.min(prev.cols, c);
      for (let i = 0; i < rr; i++) {
        for (let j = 0; j < cc; j++) next.tiles[i][j] = prev.tiles[i][j];
      }
      next.entities = prev.entities
        .filter((e) => e.r < r && e.c < c)
        .map((e) => ({ ...e }));
      return next;
    });
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(board, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "board.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        // very light validation
        if (
          typeof obj?.rows === "number" &&
          typeof obj?.cols === "number" &&
          Array.isArray(obj?.tiles) &&
          Array.isArray(obj?.entities)
        ) {
          setBoard(obj);
          setRowsInput(obj.rows);
          setColsInput(obj.cols);
        } else {
          alert("Invalid board JSON.");
        }
      } catch {
        alert("Failed to parse JSON.");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  }

  // Colors / look (you can tweak these to match your game's palette)
  const COLORS = {
    bg: "#3f5172",
    border: "#2b3b5a",
    grid: "#2b3b5a",
    wall: "#233553",
    spawn: "#9BE7C5",
    hover: "rgba(255,255,255,0.2)",
    smallDot: "#7DD6A1",
    bigDot: "#7DF6A0",
    player: "#C293F2",
    enemy: "#FF9DB4",
  };

  // Pre-index entities by cell for quick draw
  const entityByCell = useMemo(() => {
    const map = new Map();
    for (const e of board.entities) {
      const k = key(e.r, e.c);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(e);
    }
    return map;
  }, [board.entities]);

  // Single-cell overlay preview when hovering
  const hoverRect =
    hoverCell && !isPainting ? (
      <rect
        x={hoverCell.c * CELL}
        y={hoverCell.r * CELL}
        width={CELL}
        height={CELL}
        fill={COLORS.hover}
        pointerEvents='none'
      />
    ) : null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        gap: 16,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI",
        color: "#e8eefc",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          background: "#2d3d5b",
          border: "1px solid #22324e",
          borderRadius: 8,
          padding: 12,
          height: "fit-content",
        }}
      >
        <h3 style={{ margin: "4px 0 12px" }}>Board Editor</h3>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, opacity: 0.9 }}>
            Grid Size
          </label>
          <div style={{ marginTop: 6 }}>
            <input
              value={rowsInput}
              onChange={(e) => setRowsInput(e.target.value)}
              type='number'
              min={1}
              style={inputStyle}
              placeholder='rows'
            />
            <input
              value={colsInput}
              onChange={(e) => setColsInput(e.target.value)}
              type='number'
              min={1}
              style={inputStyle}
              placeholder='cols'
            />
            <button style={btnStyle} onClick={resizeBoard}>
              Resize
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, opacity: 0.9 }}>
            Brush
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8,
              marginTop: 6,
            }}
          >
            {PALETTE.map((p) => {
              const active =
                brush.kind === p.kind && brush.type === p.type
                  ? { outline: "2px solid #9BE7C5" }
                  : {};
              return (
                <button
                  key={`${p.kind}:${p.type}`}
                  style={{ ...btnStyle, ...active, display: "flex", gap: 8 }}
                  onClick={() => setBrush(p)}
                  title={p.label}
                >
                  <Swatch type={p.type} kind={p.kind} colors={COLORS} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnStyle} onClick={exportJSON}>
            Save
          </button>
          <label style={{ ...btnStyle, cursor: "pointer" }}>
            Import
            <input
              type='file'
              accept='application/json'
              onChange={importJSON}
              style={{ display: "none" }}
            />
          </label>
        </div>

        <p
          style={{ fontSize: 12, opacity: 0.8, marginTop: 12, lineHeight: 1.4 }}
        >
          Tips: Click or click-drag to paint. Right-click to erase. Entities
          toggle on the same cell.
        </p>
      </div>

      {/* SVG Board */}
      <div
        style={{
          background: "#2d3d5b",
          border: "1px solid #22324e",
          borderRadius: 8,
          padding: 12,
          overflow: "auto",
        }}
      >
        <svg
          ref={svgRef}
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          style={{
            background: COLORS.bg,
            border: `2px solid ${COLORS.border}`,
            borderRadius: 6,
            display: "block",
          }}
          onMouseLeave={() => setHoverCell(null)}
        >
          <defs>
            {/* soft vertical gradient for "spawn" look */}
            <linearGradient id='spawnGrad' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor={COLORS.spawn} stopOpacity='0.85' />
              <stop offset='100%' stopColor={COLORS.spawn} stopOpacity='0.25' />
            </linearGradient>
          </defs>

          {/* grid lines */}
          <g stroke={COLORS.grid} strokeWidth='1'>
            {Array.from({ length: board.cols + 1 }, (_, i) => (
              <line
                key={`v-${i}`}
                x1={i * CELL}
                y1={0}
                x2={i * CELL}
                y2={size.height}
              />
            ))}
            {Array.from({ length: board.rows + 1 }, (_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={i * CELL}
                x2={size.width}
                y2={i * CELL}
              />
            ))}
          </g>

          {/* tiles */}
          <g>
            {board.tiles.map((row, r) =>
              row.map((type, c) => {
                if (type === "empty") return null;
                const x = c * CELL;
                const y = r * CELL;
                const fill =
                  type === "wall"
                    ? COLORS.wall
                    : type === "spawn"
                    ? "url(#spawnGrad)"
                    : "transparent";
                return (
                  <rect
                    key={`t-${r}-${c}`}
                    x={x}
                    y={y}
                    width={CELL}
                    height={CELL}
                    fill={fill}
                  />
                );
              })
            )}
          </g>

          {/* entities */}
          <g>
            {board.entities.map((e, i) => {
              const cx = e.c * CELL + CELL / 2;
              const cy = e.r * CELL + CELL / 2;
              switch (e.type) {
                case "smallDot":
                  return (
                    <circle
                      key={`e-${i}`}
                      cx={cx}
                      cy={cy}
                      r={Math.max(3, CELL * 0.08)}
                      fill={COLORS.smallDot}
                    />
                  );
                case "bigDot":
                  return (
                    <circle
                      key={`e-${i}`}
                      cx={cx}
                      cy={cy}
                      r={CELL * 0.28}
                      fill={COLORS.bigDot}
                    />
                  );
                case "player":
                  return (
                    <circle
                      key={`e-${i}`}
                      cx={cx}
                      cy={cy}
                      r={CELL * 0.26}
                      fill={COLORS.player}
                    />
                  );
                case "enemy":
                  return (
                    <circle
                      key={`e-${i}`}
                      cx={cx}
                      cy={cy}
                      r={CELL * 0.26}
                      fill={COLORS.enemy}
                    />
                  );
                default:
                  return null;
              }
            })}
          </g>

          {/* hover highlight */}
          {hoverRect}

          {/* hit layer for painting */}
          <g>
            {Array.from({ length: board.rows }).map((_, r) =>
              Array.from({ length: board.cols }).map((_, c) => (
                <CellHit key={`hit-${r}-${c}`} r={r} c={c} />
              ))
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ---------- Small UI helpers ---------- */

function Swatch({ kind, type, colors }) {
  return (
    <svg width='22' height='22' viewBox='0 0 22 22' style={{ flexShrink: 0 }}>
      <rect
        x='1'
        y='1'
        width='20'
        height='20'
        rx='3'
        ry='3'
        fill='#2b3b5a'
        stroke='#1f2c45'
      />
      {kind === "tile" && type === "wall" && (
        <rect x='3' y='3' width='16' height='16' fill={colors.wall} />
      )}
      {kind === "tile" && type === "spawn" && (
        <rect x='3' y='3' width='16' height='16' fill='url(#swatchSpawn)' />
      )}
      {kind === "tile" && type === "empty" && (
        <g stroke='#445a84' strokeWidth='1'>
          <line x1='3' y1='7' x2='19' y2='7' />
          <line x1='3' y1='11' x2='19' y2='11' />
          <line x1='3' y1='15' x2='19' y2='15' />
        </g>
      )}
      {kind === "entity" && type === "smallDot" && (
        <circle cx='11' cy='11' r='2.8' fill={colors.smallDot} />
      )}
      {kind === "entity" && type === "bigDot" && (
        <circle cx='11' cy='11' r='6' fill={colors.bigDot} />
      )}
      {kind === "entity" && type === "player" && (
        <circle cx='11' cy='11' r='6' fill={colors.player} />
      )}
      {kind === "entity" && type === "enemy" && (
        <circle cx='11' cy='11' r='6' fill={colors.enemy} />
      )}
      {kind === "eraser" && (
        <g stroke='#e8eefc' strokeWidth='2'>
          <line x1='5' y1='5' x2='17' y2='17' />
          <line x1='17' y1='5' x2='5' y2='17' />
        </g>
      )}
      {/* local defs so the swatch spawn preview works */}
      <defs>
        <linearGradient id='swatchSpawn' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor={colors.spawn} stopOpacity='0.9' />
          <stop offset='100%' stopColor={colors.spawn} stopOpacity='0.3' />
        </linearGradient>
      </defs>
    </svg>
  );
}

const btnStyle = {
  background: "#3a4b6e",
  color: "#e8eefc",
  border: "1px solid #22324e",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
};

const inputStyle = {
  background: "#3a4b6e",
  color: "#e8eefc",
  border: "1px solid #22324e",
  borderRadius: 6,
  padding: "8px 10px",
  width: 80,
  fontSize: 13,
};
