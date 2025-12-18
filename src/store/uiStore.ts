import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  taskModalOpen: boolean;
  settingsModalOpen: boolean;
  editingTaskId: string | null;
  taskDetailOpen: boolean;
  taskDetailId: string | null;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openTaskModal: (taskId?: string) => void;
  closeTaskModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  setEditingTaskId: (taskId: string | null) => void;
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  leaderboardOpen: boolean;
  openLeaderboard: () => void;
  closeLeaderboard: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  taskModalOpen: false,
  settingsModalOpen: false,
  editingTaskId: null,
  taskDetailOpen: false,
  taskDetailId: null,
  leaderboardOpen: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openTaskModal: (taskId) => set({ taskModalOpen: true, editingTaskId: taskId || null }),
  closeTaskModal: () => set({ taskModalOpen: false, editingTaskId: null }),
  openSettingsModal: () => set({ settingsModalOpen: true }),
  closeSettingsModal: () => set({ settingsModalOpen: false }),
  setEditingTaskId: (taskId) => set({ editingTaskId: taskId }),
  openTaskDetail: (taskId) => set({ taskDetailOpen: true, taskDetailId: taskId }),
  closeTaskDetail: () => set({ taskDetailOpen: false, taskDetailId: null }),
  openLeaderboard: () => set({ leaderboardOpen: true }),
  closeLeaderboard: () => set({ leaderboardOpen: false }),
}));

