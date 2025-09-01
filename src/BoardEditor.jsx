import { useMemo, useRef, useState, useEffect } from 'react';
import AllocationBar from './AllocationBar';
import useStatsStore from './stats';
import useBoardStore from './board';
import usePortalStore from './portals';

/**
 * BoardEditor (SVG)
 * - Left click: paint with selected brush (drag to paint continuously)
 * - Right click (or select "Eraser"): clear a tile / remove entities on that cell
 */

const CELL = 40; // px size for each grid cell (visual only)

const PALETTE = [
  { kind: 'tile', type: 'wall', label: 'Wall' },
  { kind: 'tile', type: 'spawn', label: 'Spawn' },
  { kind: 'tile', type: 'empty', label: 'Empty' },
  { kind: 'entity', type: 'smallDot', label: 'Small Dot' },
  { kind: 'entity', type: 'bigDot', label: 'Big Dot' },
  { kind: 'entity', type: 'player', label: 'Player' },
  { kind: 'entity', type: 'enemy', label: 'Enemy' },
  { kind: 'eraser', type: 'eraser', label: 'Eraser' },
  { kind: 'tile', type: 'exit', label: 'Exit' },
  { kind: 'tile', type: 'enterPortal', label: 'Portal' },
  //   { kind: "tile", type: "exitPortal", label: "Exit Portal" },
];

export default function BoardEditor({}) {
  const [brush, setBrush] = useState(PALETTE[0]);
  const [isPainting, setIsPainting] = useState(false);
  const [hoverCell, setHoverCell] = useState(null);
  const svgRef = useRef(null);

  const { linkPortal, connections } = usePortalStore();

  const {
    rows,
    cols,
    tiles,
    entities,
    setTile,
    toggleEntity,
    clearCell,
    movePlayer,
    importJSONBoard,
    reset,
  } = useBoardStore();

  const { subtract } = useStatsStore();

  const processInput = e => {
    if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
      subtract('moves');
      let dx = 0,
        dy = 0;
      if (e.key === 'w') dy = -1;
      if (e.key === 'a') dx = -1;
      if (e.key === 's') dy = 1;
      if (e.key === 'd') dx = 1;

      movePlayer(dx, dy);
    }
  };

  useEffect(() => {
    window.addEventListener('keyup', processInput);
    return () => window.removeEventListener('keyup', processInput);
  }, []);

  const size = useMemo(() => ({ width: cols * CELL, height: rows * CELL }), [cols, rows]);

  function applyBrush(r, c, currentBrush = brush) {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return;
    if (currentBrush.kind === 'tile') {
      setTile(r, c, currentBrush.type);
    } else if (currentBrush.kind === 'entity') {
      toggleEntity(r, c, currentBrush.type);
    } else if (currentBrush.kind === 'eraser') {
      clearCell(r, c);
    }
  }

  function CellHit({ r, c }) {
    const x = c * CELL;
    const y = r * CELL;
    // Check if another portal exists
    const otherPortals = [];
    for (let rr = 0; rr < rows; rr++) {
      for (let cc = 0; cc < cols; cc++) {
        if ((rr !== r || cc !== c) && tiles[rr][cc] === 'enterPortal') {
          otherPortals.push({ r: rr, c: cc });
        }
      }
    }
    return (
      <rect
        x={x}
        y={y}
        width={CELL}
        height={CELL}
        fill="transparent"
        onMouseDown={e => {
          e.preventDefault();
          // If clicking an enterPortal and another portal exists, prompt for link
          if (tiles[r][c] === 'enterPortal' && otherPortals.length > 0) {
            const coords = window.prompt(
              `Link this portal to which coordinates? (format: row,col)\nAvailable: ${otherPortals.map(p => `${p.r},${p.c}`).join(' | ')}`
            );
            // You can add logic here to store the link, e.g. in a portalLinks state or on the board
            // For now, just log the result
            if (coords) {
              console.log(`Portal at (${r},${c}) linked to:`, coords);
              linkPortal(
                { r, c },
                {
                  r: parseInt(coords.split(',')[0], 10),
                  c: parseInt(coords.split(',')[1], 10),
                }
              );
            }
          } else {
            setIsPainting(true);
            applyBrush(r, c);
          }
        }}
        onMouseEnter={() => setHoverCell({ r, c })}
        onMouseMove={e => {
          if (isPainting) applyBrush(r, c);
        }}
        onMouseUp={() => setIsPainting(false)}
        onContextMenu={e => {
          e.preventDefault();
          applyBrush(r, c, { kind: 'eraser', type: 'eraser' });
        }}
        style={{ cursor: 'crosshair' }}
      />
    );
  }

  useEffect(() => {
    const up = () => setIsPainting(false);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const [rowsInput, setRowsInput] = useState(rows);
  const [colsInput, setColsInput] = useState(cols);
  function resizeBoard() {
    const r = Math.max(1, parseInt(rowsInput || 1, 10));
    const c = Math.max(1, parseInt(colsInput || 1, 10));
    reset(r, c);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ rows, cols, tiles, entities }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'board.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  const COLORS = {
    bg: '#3f5172',
    border: '#2b3b5a',
    grid: '#2b3b5a',
    wall: '#233553',
    spawn: '#9BE7C5',
    hover: 'rgba(255,255,255,0.2)',
    smallDot: '#7DD6A1',
    bigDot: '#7DF6A0',
    player: '#C293F2',
    enemy: '#FF9DB4',
    exit: '#FF2AA1',
    enterPortal: '#FFB74D',
    exitPortal: '#FF6F40',
  };

  const hoverRect =
    hoverCell && !isPainting ? (
      <rect
        x={hoverCell.c * CELL}
        y={hoverCell.r * CELL}
        width={CELL}
        height={CELL}
        fill={COLORS.hover}
        pointerEvents="none"
      />
    ) : null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 2fr 300px',
        gap: 0,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI',
        color: '#e8eefc',
      }}
    >
      <div
        style={{
          background: '#2d3d5b',
          border: '1px solid #22324e',
          borderRadius: 8,
          padding: 12,
        }}
      >
        <h3 style={{ margin: '4px 0 12px' }}>Board Editor</h3>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, opacity: 0.9 }}>
            Grid Size
          </label>
          <div style={{ marginTop: 6 }}>
            <input
              value={colsInput}
              onChange={e => setColsInput(e.target.value)}
              type="number"
              min={1}
              style={inputStyle}
              placeholder="cols"
            />
            <input
              value={rowsInput}
              onChange={e => setRowsInput(e.target.value)}
              type="number"
              min={1}
              style={inputStyle}
              placeholder="rows"
            />
            <button style={btnStyle} onClick={resizeBoard}>
              Resize
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, opacity: 0.9 }}>Brush</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
              marginTop: 6,
            }}
          >
            {PALETTE.map(p => {
              const active =
                brush.kind === p.kind && brush.type === p.type
                  ? { outline: '2px solid #9BE7C5' }
                  : {};
              return (
                <button
                  key={`${p.kind}:${p.type}`}
                  style={{ ...btnStyle, ...active, display: 'flex', gap: 8 }}
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

        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnStyle} onClick={exportJSON}>
            Save
          </button>
          <label style={{ ...btnStyle, cursor: 'pointer' }}>
            Import
            <input
              type="file"
              accept="application/json"
              onChange={importJSONBoard}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <p style={{ fontSize: 12, opacity: 0.8, marginTop: 12, lineHeight: 1.4 }}>
          Tips: Click or click-drag to paint. Right-click to erase. Entities toggle on the
          same cell.
        </p>
      </div>

      <div
        className="container"
        style={{
          background: '#2d3d5b',
          border: '1px solid #22324e',
          borderRadius: 8,
          padding: 12,
          overflow: 'scroll',
          minHeight: 600,
          maxHeight: 600,
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
            display: 'block',
          }}
          onMouseLeave={() => setHoverCell(null)}
        >
          <defs>
            <linearGradient id="spawnGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.spawn} stopOpacity="0.85" />
              <stop offset="100%" stopColor={COLORS.spawn} stopOpacity="0.25" />
            </linearGradient>
            <linearGradient id="exitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.exit} stopOpacity="0.85" />
              <stop offset="100%" stopColor={COLORS.exit} stopOpacity="0.25" />
            </linearGradient>
            <linearGradient id="exitPortalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.exitPortal} stopOpacity="0.85" />
              <stop offset="100%" stopColor={COLORS.exitPortal} stopOpacity="0.25" />
            </linearGradient>
            <linearGradient id="enterPortalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.enterPortal} stopOpacity="0.85" />
              <stop offset="100%" stopColor={COLORS.enterPortal} stopOpacity="0.25" />
            </linearGradient>
          </defs>

          <g stroke={COLORS.grid} strokeWidth="1">
            {Array.from({ length: cols + 1 }, (_, i) => (
              <line key={`v-${i}`} x1={i * CELL} y1={0} x2={i * CELL} y2={size.height} />
            ))}
            {Array.from({ length: rows + 1 }, (_, i) => (
              <line key={`h-${i}`} x1={0} y1={i * CELL} x2={size.width} y2={i * CELL} />
            ))}
          </g>

          <g>
            {tiles.map((row, r) =>
              row.map((type, c) => {
                if (type === 'empty') return null;
                const x = c * CELL;
                const y = r * CELL;
                const getCellFill = type => {
                  if (type === 'wall') return COLORS.wall;
                  if (type === 'spawn') return 'url(#spawnGrad)';
                  if (type === 'exit') return 'url(#exitGrad)';
                  if (type === 'enterPortal') return 'url(#enterPortalGrad)';
                  if (type === 'exitPortal') return 'url(#exitPortalGrad)';
                  return 'transparent';
                };
                const fill = getCellFill(type);
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

          <g>
            {entities.map((e, i) => {
              const cx = e.c * CELL + CELL / 2;
              const cy = e.r * CELL + CELL / 2;
              switch (e.type) {
                case 'smallDot':
                  return (
                    <circle
                      key={`e-${i}`}
                      cx={cx}
                      cy={cy}
                      r={Math.max(3, CELL * 0.08)}
                      fill={COLORS.smallDot}
                    />
                  );
                case 'bigDot':
                  return (
                    <circle
                      key={`e-${i}`}
                      cx={cx}
                      cy={cy}
                      r={CELL * 0.28}
                      fill={COLORS.bigDot}
                    />
                  );
                case 'player':
                  return (
                    <circle
                      key={`e-${i}`}
                      cx={cx}
                      cy={cy}
                      r={CELL * 0.26}
                      fill={COLORS.player}
                    />
                  );
                case 'enemy':
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

          {hoverRect}

          <g>
            {Array.from({ length: rows }).map((_, r) =>
              Array.from({ length: cols }).map((_, c) => (
                <CellHit key={`hit-${r}-${c}`} r={r} c={c} />
              ))
            )}
          </g>
        </svg>
      </div>
      <AllocationBar width={270} />
    </div>
  );
}

function Swatch({ kind, type, colors }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" style={{ flexShrink: 0 }}>
      <rect
        x="1"
        y="1"
        width="20"
        height="20"
        rx="3"
        ry="3"
        fill="#2b3b5a"
        stroke="#1f2c45"
      />
      {kind === 'tile' && type === 'wall' && (
        <rect x="3" y="3" width="16" height="16" fill={colors.wall} />
      )}
      {kind === 'tile' && type === 'spawn' && (
        <rect x="3" y="3" width="16" height="16" fill="url(#swatchSpawn)" />
      )}
      {kind === 'tile' && type === 'exit' && (
        <rect x="3" y="3" width="16" height="16" fill="url(#swatchExit)" />
      )}
      {kind === 'tile' && type === 'exitPortal' && (
        <rect x="3" y="3" width="16" height="16" fill="url(#swatchPortalExit)" />
      )}
      {kind === 'tile' && type === 'enterPortal' && (
        <rect x="3" y="3" width="16" height="16" fill="url(#swatchPortalEnter)" />
      )}
      {kind === 'tile' && type === 'empty' && (
        <g stroke="#445a84" strokeWidth="1">
          <line x1="3" y1="7" x2="19" y2="7" />
          <line x1="3" y1="11" x2="19" y2="11" />
          <line x1="3" y1="15" x2="19" y2="15" />
        </g>
      )}
      {kind === 'entity' && type === 'smallDot' && (
        <circle cx="11" cy="11" r="2.8" fill={colors.smallDot} />
      )}
      {kind === 'entity' && type === 'bigDot' && (
        <circle cx="11" cy="11" r="6" fill={colors.bigDot} />
      )}
      {kind === 'entity' && type === 'player' && (
        <circle cx="11" cy="11" r="6" fill={colors.player} />
      )}
      {kind === 'entity' && type === 'enemy' && (
        <circle cx="11" cy="11" r="6" fill={colors.enemy} />
      )}
      {kind === 'eraser' && (
        <g stroke="#e8eefc" strokeWidth="2">
          <line x1="5" y1="5" x2="17" y2="17" />
          <line x1="17" y1="5" x2="5" y2="17" />
        </g>
      )}
      <defs>
        <linearGradient id="swatchSpawn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.spawn} stopOpacity="0.9" />
          <stop offset="100%" stopColor={colors.spawn} stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="swatchExit" x1="1" y1="1" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.exit} stopOpacity="0.9" />
          <stop offset="100%" stopColor={colors.exit} stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="swatchPortalEnter" x1="1" y1="1" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.enterPortal} stopOpacity="0.9" />
          <stop offset="100%" stopColor={colors.enterPortal} stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="swatchPortalExit" x1="1" y1="1" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.exitPortal} stopOpacity="0.9" />
          <stop offset="100%" stopColor={colors.exitPortal} stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const btnStyle = {
  background: '#3a4b6e',
  color: '#e8eefc',
  border: '1px solid #22324e',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 13,
};

const inputStyle = {
  background: '#3a4b6e',
  color: '#e8eefc',
  border: '1px solid #22324e',
  borderRadius: 6,
  padding: '8px 10px',
  width: 80,
  fontSize: 13,
};
