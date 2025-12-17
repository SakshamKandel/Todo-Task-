import { create } from 'zustand';
import type { FilterState, Priority, TaskStatus, SortOption } from '../types';

interface FilterStore extends FilterState {
  setStatus: (status: TaskStatus | 'all') => void;
  setProjectId: (projectId: string | null) => void;
  setTagIds: (tagIds: string[]) => void;
  toggleTagId: (tagId: string) => void;
  setPriority: (priority: Priority | null) => void;
  setDueDateFilter: (filter: FilterState['dueDateFilter']) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: SortOption) => void;
  resetFilters: () => void;
}

const initialState: FilterState = {
  status: 'all',
  projectId: null,
  tagIds: [],
  priority: null,
  dueDateFilter: 'all',
  searchQuery: '',
  sortBy: 'manual',
};

export const useFilterStore = create<FilterStore>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setProjectId: (projectId) => set({ projectId }),
  setTagIds: (tagIds) => set({ tagIds }),
  toggleTagId: (tagId) =>
    set((state) => ({
      tagIds: state.tagIds.includes(tagId)
        ? state.tagIds.filter((id) => id !== tagId)
        : [...state.tagIds, tagId],
    })),
  setPriority: (priority) => set({ priority }),
  setDueDateFilter: (dueDateFilter) => set({ dueDateFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSortBy: (sortBy) => set({ sortBy }),
  resetFilters: () => set(initialState),
}));
