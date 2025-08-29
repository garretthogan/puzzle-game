import { create } from "zustand";

const useStatsStore = create((set, get) => ({
  moves: { label: "Movement", value: 5, color: "#89CFF0", id: "moves" },
  attack: { label: "Attack", value: 5, color: "#FF9DB4", id: "attack" },
  defense: { label: "Defense", value: 5, color: "#7DD6A1", id: "defense" },
  magic: { label: "Magic", value: 5, color: "#C293F2", id: "magic" },
  total: { label: "Total", value: 20, color: "#FFFFFF", id: "total" },
  statsArr: () => [get().moves, get().attack, get().defense, get().magic],

  setStat: (key, value) => {
    set({ [key]: { value, ...get()[key] } });
  },

  add: (key, delta = 1) =>
    set((s) => ({
      [key]: { ...s[key], value: Math.max(0, s[key].value + delta) },
    })),

  subtract: (key, delta = 1) =>
    set((s) => ({
      [key]: { ...s[key], value: Math.max(0, s[key].value - delta) },
    })),

  spendMove: () =>
    set((s) => ({ moves: { value: Math.max(0, s.moves - 1), ...s["moves"] } })),

  reset: () => set({ moves: 5, attack: 5, defense: 5, magic: 5 }),
}));

export default useStatsStore;
