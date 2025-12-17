import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Project } from '../types';
import { projectDb } from '../db';

const PROJECT_COLORS = [
  '#FF7A00', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899',
  '#F59E0B', '#06B6D4', '#6366F1', '#EF4444', '#84CC16',
];

interface ProjectState {
  projects: Project[];
  loading: boolean;
  initialized: boolean;

  loadProjects: () => Promise<void>;
  addProject: (name: string, color?: string) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  reorderProjects: (projectIds: string[]) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  initialized: false,

  loadProjects: async () => {
    set({ loading: true });
    try {
      const projects = await projectDb.getAll();
      set({ projects, initialized: true });
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      set({ loading: false });
    }
  },

  addProject: async (name, color) => {
    const { projects } = get();
    const maxOrder = projects.length > 0 ? Math.max(...projects.map((p) => p.order)) : 0;
    const randomColor = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];

    const newProject: Project = {
      id: uuidv4(),
      name,
      color: color || randomColor,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    };

    await projectDb.add(newProject);
    set({ projects: [...projects, newProject] });
    return newProject;
  },

  updateProject: async (id, updates) => {
    const { projects } = get();
    await projectDb.update(id, updates);
    set({
      projects: projects.map((project) =>
        project.id === id ? { ...project, ...updates } : project
      ),
    });
  },

  deleteProject: async (id) => {
    const { projects } = get();
    await projectDb.delete(id);
    set({ projects: projects.filter((project) => project.id !== id) });
  },

  reorderProjects: async (projectIds) => {
    const { projects } = get();
    const reorderedProjects = projectIds.map((id, index) => {
      const project = projects.find((p) => p.id === id);
      return project ? { ...project, order: index } : null;
    }).filter(Boolean) as Project[];

    for (const project of reorderedProjects) {
      await projectDb.update(project.id, { order: project.order });
    }

    set({ projects: reorderedProjects });
  },
}));
