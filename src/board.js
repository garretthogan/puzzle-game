import { create } from 'zustand';
import usePortalStore from './portals';

function createEmptyBoard(rows, cols) {
  return {
    rows,
    cols,
    tiles: Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => 'empty')
    ),
    entities: [],
  };
}

function cloneBoard(board) {
  return {
    rows: board.rows,
    cols: board.cols,
    tiles: board.tiles.map(row => row.slice()),
    entities: board.entities.map(e => ({ ...e })),
  };
}

const useBoardStore = create(set => ({
  ...createEmptyBoard(9, 9),
  importJSONBoard: e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (
          typeof obj?.rows === 'number' &&
          typeof obj?.cols === 'number' &&
          Array.isArray(obj?.tiles) &&
          Array.isArray(obj?.entities)
        ) {
          console.log('Imported board:', obj);
          set({
            cols: obj.cols,
            rows: obj.rows,
            tiles: obj.tiles,
            entities: obj.entities,
          });
        } else {
          alert('Invalid board JSON.');
        }
      } catch {
        alert('Failed to parse JSON.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  },
  reset: (width, height) => set({ ...createEmptyBoard(width, height) }),
  setTile: (x, y, type) => {
    set(state => {
      const newBoard = cloneBoard(state);
      newBoard.tiles[x][y] = type;
      return { ...newBoard };
    });
  },
  toggleEntity: (x, y, type) => {
    set(state => {
      const next = cloneBoard(state);
      const idx = next.entities.findIndex(e => e.r === x && e.c === y && e.type === type);
      if (idx !== -1) {
        next.entities.splice(idx, 1);
      } else {
        next.entities.push({ r: x, c: y, type });
      }
      return { ...next };
    });
  },
  clearCell: (x, y) => {
    set(state => {
      const next = cloneBoard(state);
      next.tiles[x][y] = 'empty';
      next.entities = next.entities.filter(e => !(e.r === x && e.c === y));
      return { ...next };
    });
  },
  // --- Helper functions ---
  getSpawnTile: tiles => {
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < tiles[r].length; c++) {
        if (tiles[r][c] === 'spawn') return { r, c };
      }
    }
    return null;
  },
  moveEntity: (entities, entity, r, c) => {
    return [...entities.filter(e => e !== entity), { ...entity, r, c }];
  },
  getEnemyMove: (enemy, player, rows, cols) => {
    const dr = player.r - enemy.r;
    const dc = player.c - enemy.c;
    let moveR = 0,
      moveC = 0;
    if (Math.abs(dr) <= 1 || Math.abs(dc) <= 1) {
      // 100% chance to move towards player
      const towardsChance = 1.0;
      if (Math.random() < towardsChance) {
        moveR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
        moveC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
      } else {
        moveR = dr === 0 ? 0 : dr > 0 ? -1 : 1;
        moveC = dc === 0 ? 0 : dc > 0 ? -1 : 1;
      }
    } else {
      // Move away from player more often
      const seed = Math.random();
      const awayChance = 0.7; // 70% chance to move away
      if (seed < awayChance) {
        // Move away from player
        if (Math.abs(dr) > Math.abs(dc)) {
          moveR = dr === 0 ? 0 : dr > 0 ? -1 : 1;
          moveC = Math.random() > 0.5 ? (dc === 0 ? 0 : dc > 0 ? -1 : 1) : 0;
        } else {
          moveC = dc === 0 ? 0 : dc > 0 ? -1 : 1;
          moveR = Math.random() > 0.5 ? (dr === 0 ? 0 : dr > 0 ? -1 : 1) : 0;
        }
      } else {
        // Sometimes move towards player
        if (Math.abs(dr) > Math.abs(dc)) {
          moveR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
          moveC = Math.random() > 0.5 ? (dc === 0 ? 0 : dc > 0 ? 1 : -1) : 0;
        } else {
          moveC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
          moveR = Math.random() > 0.5 ? (dr === 0 ? 0 : dr > 0 ? 1 : -1) : 0;
        }
      }
    }
    let newR = enemy.r + moveR;
    let newC = enemy.c + moveC;
    if (newR < 0 || newR >= rows || newC < 0 || newC >= cols) {
      newR = enemy.r;
      newC = enemy.c;
    }
    return { r: newR, c: newC };
  },
  // --- Main movePlayer ---
  movePlayer: (dx, dy) => {
    set(state => {
      const next = cloneBoard(state);
      const player = next.entities.find(e => e.type === 'player');
      if (!player) return { ...next };
      const rows = next.rows;
      const cols = next.cols;
      const newR = player.r + dy;
      const newC = player.c + dx;
      const spawn = useBoardStore.getState().getSpawnTile(next.tiles);
      let playerShouldReset = false;
      let entities = next.entities;
      // Move enemies
      const newEnemies = entities.map(e => {
        if (e.type !== 'enemy') return e;
        const move = useBoardStore.getState().getEnemyMove(e, player, rows, cols);
        // If enemy would overlap player, set flag to reset player
        if (move.r === player.r && move.c === player.c) {
          playerShouldReset = true;
        }
        return { ...e, r: move.r, c: move.c };
      });
      next.entities = newEnemies;
      // Actually reset player if needed
      if (playerShouldReset && spawn) {
        next.entities = next.entities.filter(e => e.type !== 'player');
        next.entities.push({ ...player, r: spawn.r, c: spawn.c });
      } else if (
        !playerShouldReset &&
        newR >= 0 &&
        newR < rows &&
        newC >= 0 &&
        newC < cols &&
        (next.tiles[newR][newC] === 'empty' || next.tiles[newR][newC] === 'enterPortal')
      ) {
        // If stepping onto an enterPortal, check for linked portal
        if (next.tiles[newR][newC] === 'enterPortal') {
          try {
            // const usePortalStore = require('./portals').default;
            const { connections } = usePortalStore.getState();

            if (connections) {
              const [linkR, linkC] = connections[`${newR},${newC}`]
                .split(',')
                .map(Number);
              next.entities = next.entities.filter(e => e !== player);
              next.entities.push({ ...player, r: linkR, c: linkC });
              return { ...next };
            }
          } catch (err) {
            console.error('Error getting linked portal:', err);
            // fallback: just move to portal
          }
        }
        next.entities = next.entities.filter(e => e !== player);
        next.entities.push({ ...player, r: newR, c: newC });
      }
      return { ...next };
    });
  },
}));

export default useBoardStore;
