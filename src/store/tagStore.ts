import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Tag } from '../types';
import { tagDb } from '../db';

const TAG_COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B',
  '#06B6D4', '#6366F1', '#EF4444', '#84CC16', '#FF7A00',
];

interface TagState {
  tags: Tag[];
  loading: boolean;
  initialized: boolean;

  loadTags: () => Promise<void>;
  addTag: (name: string, color?: string) => Promise<Tag>;
  updateTag: (id: string, updates: Partial<Tag>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  loading: false,
  initialized: false,

  loadTags: async () => {
    set({ loading: true });
    try {
      const tags = await tagDb.getAll();
      set({ tags, initialized: true });
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      set({ loading: false });
    }
  },

  addTag: async (name, color) => {
    const { tags } = get();
    const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

    const newTag: Tag = {
      id: uuidv4(),
      name,
      color: color || randomColor,
      createdAt: new Date().toISOString(),
    };

    await tagDb.add(newTag);
    set({ tags: [...tags, newTag] });
    return newTag;
  },

  updateTag: async (id, updates) => {
    const { tags } = get();
    await tagDb.update(id, updates);
    set({
      tags: tags.map((tag) => (tag.id === id ? { ...tag, ...updates } : tag)),
    });
  },

  deleteTag: async (id) => {
    const { tags } = get();
    await tagDb.delete(id);
    set({ tags: tags.filter((tag) => tag.id !== id) });
  },
}));
