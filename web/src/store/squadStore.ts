import { create } from "zustand";

const STORAGE_KEY = "squadcode_selected_squad";

type SquadState = {
  selectedSquadId: string | null;
  setSelectedSquadId: (id: string | null) => void;
  mySquads: any[];
  setMySquads: (squads: any[]) => void;
};

function initialSelectedSquadId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export const useSquadStore = create<SquadState>((set) => ({
  selectedSquadId: initialSelectedSquadId(),
  setSelectedSquadId: (id) => {
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    set({ selectedSquadId: id });
  },
  mySquads: [],
  setMySquads: (squads) => set({ mySquads: squads })
}));
