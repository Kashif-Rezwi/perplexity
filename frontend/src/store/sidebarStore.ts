import { create } from 'zustand';

type SidebarStore = {
  isOpen: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
};

export const useSidebarStore = create<SidebarStore>((set) => ({
  isOpen: true,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  setOpen: (open) => set({ isOpen: open }),
}));
