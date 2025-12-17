import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Task, Subtask, Priority, TaskStatus, RecurrenceType } from '../types';
import { taskDb } from '../db';
import { addDays, addWeeks, addMonths } from 'date-fns';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  initialized: boolean;

  // Actions
  loadTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;
  reorderTasks: (taskIds: string[]) => Promise<void>;

  // Subtask actions
  addSubtask: (taskId: string, title: string) => Promise<void>;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  initialized: false,

  loadTasks: async () => {
    set({ loading: true });
    try {
      const tasks = await taskDb.getAll();
      set({ tasks, initialized: true });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      set({ loading: false });
    }
  },

  addTask: async (taskData) => {
    const { tasks } = get();
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.order)) : 0;

    const newTask: Task = {
      ...taskData,
      id: uuidv4(),
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await taskDb.add(newTask);
    set({ tasks: [...tasks, newTask] });
    return newTask;
  },

  updateTask: async (id, updates) => {
    const { tasks } = get();
    await taskDb.update(id, updates);
    set({
      tasks: tasks.map((task) =>
        task.id === id
          ? { ...task, ...updates, updatedAt: new Date().toISOString() }
          : task
      ),
    });
  },

  deleteTask: async (id) => {
    const { tasks } = get();
    await taskDb.delete(id);
    set({ tasks: tasks.filter((task) => task.id !== id) });
  },

  toggleTaskStatus: async (id) => {
    const { tasks, addTask } = get();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus: TaskStatus = task.status === 'pending' ? 'completed' : 'pending';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    await taskDb.update(id, { status: newStatus, completedAt });
    set({
      tasks: tasks.map((t) =>
        t.id === id
          ? { ...t, status: newStatus, completedAt, updatedAt: new Date().toISOString() }
          : t
      ),
    });

    // Handle recurring tasks
    if (newStatus === 'completed' && task.recurrence !== 'none' && task.dueDate) {
      let newDueDate: Date;
      const currentDueDate = new Date(task.dueDate);

      switch (task.recurrence) {
        case 'daily':
          newDueDate = addDays(currentDueDate, 1);
          break;
        case 'weekly':
          newDueDate = addWeeks(currentDueDate, 1);
          break;
        case 'monthly':
          newDueDate = addMonths(currentDueDate, 1);
          break;
        default:
          return;
      }

      // Create new recurring task
      await addTask({
        title: task.title,
        notes: task.notes,
        projectId: task.projectId,
        tagIds: task.tagIds,
        priority: task.priority,
        dueDate: newDueDate.toISOString(),
        status: 'pending',
        subtasks: task.subtasks.map((st) => ({ ...st, id: uuidv4(), completed: false })),
        attachments: task.attachments,
        recurrence: task.recurrence,
        completedAt: null,
      });
    }
  },

  reorderTasks: async (taskIds) => {
    const { tasks } = get();
    const reorderedTasks = taskIds.map((id, index) => {
      const task = tasks.find((t) => t.id === id);
      return task ? { ...task, order: index } : null;
    }).filter(Boolean) as Task[];

    // Update all tasks order in DB
    for (const task of reorderedTasks) {
      await taskDb.update(task.id, { order: task.order });
    }

    set({ tasks: reorderedTasks });
  },

  addSubtask: async (taskId, title) => {
    const { tasks } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newSubtask: Subtask = {
      id: uuidv4(),
      title,
      completed: false,
    };

    const updatedSubtasks = [...task.subtasks, newSubtask];
    await taskDb.update(taskId, { subtasks: updatedSubtasks });
    set({
      tasks: tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
          : t
      ),
    });
  },

  updateSubtask: async (taskId, subtaskId, updates) => {
    const { tasks } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, ...updates } : st
    );
    await taskDb.update(taskId, { subtasks: updatedSubtasks });
    set({
      tasks: tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
          : t
      ),
    });
  },

  deleteSubtask: async (taskId, subtaskId) => {
    const { tasks } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.filter((st) => st.id !== subtaskId);
    await taskDb.update(taskId, { subtasks: updatedSubtasks });
    set({
      tasks: tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
          : t
      ),
    });
  },

  toggleSubtask: async (taskId, subtaskId) => {
    const { tasks } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    await taskDb.update(taskId, { subtasks: updatedSubtasks });
    set({
      tasks: tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() }
          : t
      ),
    });
  },
}));

// Helper function to create empty task
export const createEmptyTask = (): Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'> => ({
  title: '',
  notes: '',
  projectId: null,
  tagIds: [],
  priority: 'medium' as Priority,
  dueDate: null,
  status: 'pending' as TaskStatus,
  subtasks: [],
  attachments: [],
  recurrence: 'none' as RecurrenceType,
  completedAt: null,
});
