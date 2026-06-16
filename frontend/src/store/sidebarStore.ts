import { create } from 'zustand';

type SidebarStore = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
};

export const useSidebarStore = create<SidebarStore>((set) => ({
  isOpen: true,
  setOpen: (open) => set({ isOpen: open }),
}));
