import Dexie, { type EntityTable } from 'dexie';
import type { Task, Project, Tag } from '../types';

const db = new Dexie('TodoTaskDB') as Dexie & {
  tasks: EntityTable<Task, 'id'>;
  projects: EntityTable<Project, 'id'>;
  tags: EntityTable<Tag, 'id'>;
};

db.version(1).stores({
  tasks: 'id, projectId, status, priority, dueDate, order, createdAt',
  projects: 'id, order, createdAt',
  tags: 'id, createdAt',
});

export { db };

// Helper functions for database operations
export const taskDb = {
  async getAll(): Promise<Task[]> {
    return db.tasks.toArray();
  },

  async getById(id: string): Promise<Task | undefined> {
    return db.tasks.get(id);
  },

  async add(task: Task): Promise<string> {
    return db.tasks.add(task);
  },

  async update(id: string, updates: Partial<Task>): Promise<number> {
    return db.tasks.update(id, { ...updates, updatedAt: new Date().toISOString() });
  },

  async delete(id: string): Promise<void> {
    return db.tasks.delete(id);
  },

  async bulkAdd(tasks: Task[]): Promise<string> {
    await db.tasks.bulkAdd(tasks);
    return 'success';
  },

  async clear(): Promise<void> {
    return db.tasks.clear();
  },
};

export const projectDb = {
  async getAll(): Promise<Project[]> {
    return db.projects.orderBy('order').toArray();
  },

  async getById(id: string): Promise<Project | undefined> {
    return db.projects.get(id);
  },

  async add(project: Project): Promise<string> {
    return db.projects.add(project);
  },

  async update(id: string, updates: Partial<Project>): Promise<number> {
    return db.projects.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    // Remove project reference from tasks
    await db.tasks.where('projectId').equals(id).modify({ projectId: null });
    return db.projects.delete(id);
  },

  async bulkAdd(projects: Project[]): Promise<string> {
    await db.projects.bulkAdd(projects);
    return 'success';
  },

  async clear(): Promise<void> {
    return db.projects.clear();
  },
};

export const tagDb = {
  async getAll(): Promise<Tag[]> {
    return db.tags.toArray();
  },

  async getById(id: string): Promise<Tag | undefined> {
    return db.tags.get(id);
  },

  async add(tag: Tag): Promise<string> {
    return db.tags.add(tag);
  },

  async update(id: string, updates: Partial<Tag>): Promise<number> {
    return db.tags.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    // Remove tag reference from tasks
    const tasks = await db.tasks.toArray();
    for (const task of tasks) {
      if (task.tagIds.includes(id)) {
        await db.tasks.update(task.id, {
          tagIds: task.tagIds.filter((tagId) => tagId !== id),
        });
      }
    }
    return db.tags.delete(id);
  },

  async bulkAdd(tags: Tag[]): Promise<string> {
    await db.tags.bulkAdd(tags);
    return 'success';
  },

  async clear(): Promise<void> {
    return db.tags.clear();
  },
};

// Export/Import functions
export const exportData = async (): Promise<string> => {
  const tasks = await taskDb.getAll();
  const projects = await projectDb.getAll();
  const tags = await tagDb.getAll();

  const data = {
    tasks,
    projects,
    tags,
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
  };

  return JSON.stringify(data, null, 2);
};

export const importData = async (jsonString: string): Promise<void> => {
  const data = JSON.parse(jsonString);

  // Validate data structure
  if (!data.tasks || !data.projects || !data.tags) {
    throw new Error('Invalid data format');
  }

  // Clear existing data
  await taskDb.clear();
  await projectDb.clear();
  await tagDb.clear();

  // Import new data
  if (data.projects.length > 0) {
    await projectDb.bulkAdd(data.projects);
  }
  if (data.tags.length > 0) {
    await tagDb.bulkAdd(data.tags);
  }
  if (data.tasks.length > 0) {
    await taskDb.bulkAdd(data.tasks);
  }
};

export const clearAllData = async (): Promise<void> => {
  await taskDb.clear();
  await projectDb.clear();
  await tagDb.clear();
};
