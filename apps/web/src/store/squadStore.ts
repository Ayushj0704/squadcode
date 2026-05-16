import { create } from "zustand";
import { persist } from "zustand/middleware";

type SquadState = {
  activeSquadId: string | null;
  setActiveSquadId: (id: string | null) => void;
};

export const useSquadStore = create<SquadState>()(
  persist(
    (set) => ({
      activeSquadId: null,
      setActiveSquadId: (id) => set({ activeSquadId: id })
    }),
    { name: "squadcode" }
  )
);

