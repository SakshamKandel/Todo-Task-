import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  taskModalOpen: boolean;
  settingsModalOpen: boolean;
  editingTaskId: string | null;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openTaskModal: (taskId?: string) => void;
  closeTaskModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  taskModalOpen: false,
  settingsModalOpen: false,
  editingTaskId: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openTaskModal: (taskId) => set({ taskModalOpen: true, editingTaskId: taskId || null }),
  closeTaskModal: () => set({ taskModalOpen: false, editingTaskId: null }),
  openSettingsModal: () => set({ settingsModalOpen: true }),
  closeSettingsModal: () => set({ settingsModalOpen: false }),
}));
