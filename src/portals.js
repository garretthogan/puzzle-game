import { create } from 'zustand';

// Each portal is identified by its coordinates: { r, c }
// The store keeps a map: { 'r,c': 'r2,c2' }

const usePortalStore = create(set => ({
  // connections: { ["r,c"]: "r2,c2" }
  connections: {},

  // Link one portal to another
  linkPortal: (from, to) =>
    set(state => ({
      connections: {
        ...state.connections,
        [`${from.r},${from.c}`]: `${to.r},${to.c}`,
      },
    })),

  // Unlink a portal
  unlinkPortal: from =>
    set(state => {
      const newConnections = { ...state.connections };
      delete newConnections[`${from.r},${from.c}`];
      return { connections: newConnections };
    }),

  // Get the linked portal for a given portal
  getLinkedPortal: from => get().connections[`${from.r},${from.c}`] || null,

  // Clear all connections
  clearConnections: () => set({ connections: {} }),
}));

export default usePortalStore;
