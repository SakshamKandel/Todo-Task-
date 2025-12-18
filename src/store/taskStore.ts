import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Task, Subtask, Priority, TaskStatus, RecurrenceType } from '../types';
import { supabase } from '../lib/supabase';
import { addDays, addWeeks, addMonths } from 'date-fns';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  initialized: boolean;

  // Actions
  loadTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'> & { id?: string }) => Promise<Task>;
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

// Convert Supabase task to app Task format
const mapSupabaseTask = (t: any): Task => ({
  id: t.id,
  title: t.title,
  notes: t.notes || '',
  projectId: t.project_id,
  tagIds: [], // Tags handled separately
  priority: t.priority as Priority,
  dueDate: t.due_date,
  order: t.order || 0,
  status: t.status as TaskStatus,
  subtasks: t.subtasks || [],
  attachments: t.attachments || [],
  recurrence: (t.recurrence || 'none') as RecurrenceType,
  createdAt: t.created_at,
  updatedAt: t.created_at,
  completedAt: t.completed_at,
  teamId: t.team_id,
  assignedTo: t.assigned_to,
  createdBy: t.created_by,
  // Amazon fields
  isAmazon: t.is_amazon || false,
  amazonTasks: t.amazon_tasks || [],
});

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  initialized: false,

  loadTasks: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;

      const tasks = (data || []).map(mapSupabaseTask);
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

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        notes: taskData.notes,
        status: taskData.status,
        priority: taskData.priority,
        due_date: taskData.dueDate ? taskData.dueDate.split('T')[0] : null,
        created_by: userId,
        assigned_to: taskData.assignedTo,
        team_id: taskData.teamId || null,
        project_id: (() => { console.log('PROJECT ID BEING SENT:', taskData.projectId); return null; })(),
        order: maxOrder + 1,
        subtasks: taskData.subtasks,
        attachments: taskData.attachments,
        recurrence: taskData.recurrence === 'none' ? null : taskData.recurrence,
        is_amazon: taskData.isAmazon || false,
        amazon_tasks: taskData.amazonTasks || [],
      } as any)
      .select()
      .single();

    if (error) {
      console.error('SUPABASE INSERT ERROR:', error);
      console.error('Error Code:', error.code);
      console.error('Error Message:', error.message);
      console.error('Error Details:', error.details);
      throw error;
    }

    const newTask: Task = mapSupabaseTask(data);
    set({ tasks: [...tasks, newTask] });
    return newTask;
  },

  updateTask: async (id, updates) => {
    const { tasks } = get();

    const supabaseUpdates: any = {};
    if (updates.title !== undefined) supabaseUpdates.title = updates.title;
    if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes;
    if (updates.status !== undefined) supabaseUpdates.status = updates.status;
    if (updates.priority !== undefined) supabaseUpdates.priority = updates.priority;
    if (updates.dueDate !== undefined) supabaseUpdates.due_date = updates.dueDate ? updates.dueDate.split('T')[0] : null;
    if (updates.projectId !== undefined) supabaseUpdates.project_id = updates.projectId;
    if (updates.teamId !== undefined) supabaseUpdates.team_id = updates.teamId;
    if (updates.assignedTo !== undefined) supabaseUpdates.assigned_to = updates.assignedTo;
    if (updates.subtasks !== undefined) supabaseUpdates.subtasks = updates.subtasks;
    if (updates.attachments !== undefined) supabaseUpdates.attachments = updates.attachments;
    if (updates.recurrence !== undefined) supabaseUpdates.recurrence = updates.recurrence;
    if (updates.completedAt !== undefined) supabaseUpdates.completed_at = updates.completedAt;
    if (updates.order !== undefined) supabaseUpdates.order = updates.order;
    if (updates.isAmazon !== undefined) supabaseUpdates.is_amazon = updates.isAmazon;
    if (updates.amazonTasks !== undefined) supabaseUpdates.amazon_tasks = updates.amazonTasks;

    const client = supabase as any;
    const { error } = await client
      .from('tasks')
      .update(supabaseUpdates)
      .eq('id', id);

    if (error) throw error;

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

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    set({ tasks: tasks.filter((task) => task.id !== id) });
  },

  toggleTaskStatus: async (id) => {
    const { tasks, addTask } = get();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus: TaskStatus = task.status === 'pending' ? 'completed' : 'pending';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    const statusClient = supabase as any;
    const { error } = await statusClient
      .from('tasks')
      .update({ status: newStatus, completed_at: completedAt })
      .eq('id', id);

    if (error) throw error;

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
        teamId: task.teamId || null,
        assignedTo: task.assignedTo || null,
        createdBy: task.createdBy || null,
        isAmazon: task.isAmazon || false,
        amazonTasks: task.amazonTasks || [],
      });
    }
  },

  reorderTasks: async (taskIds) => {
    const { tasks } = get();
    const reorderedTasks = taskIds.map((id, index) => {
      const task = tasks.find((t) => t.id === id);
      return task ? { ...task, order: index } : null;
    }).filter(Boolean) as Task[];

    // Update all tasks order in Supabase
    const orderClient = supabase as any;
    for (const task of reorderedTasks) {
      await orderClient
        .from('tasks')
        .update({ order: task.order })
        .eq('id', task.id);
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

    const subtaskClient = supabase as any;
    await subtaskClient
      .from('tasks')
      .update({ subtasks: updatedSubtasks })
      .eq('id', taskId);

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

    const updateClient1 = supabase as any;
    await updateClient1
      .from('tasks')
      .update({ subtasks: updatedSubtasks })
      .eq('id', taskId);

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

    const deleteClient = supabase as any;
    await deleteClient
      .from('tasks')
      .update({ subtasks: updatedSubtasks })
      .eq('id', taskId);

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

    const toggleClient = supabase as any;
    await toggleClient
      .from('tasks')
      .update({ subtasks: updatedSubtasks })
      .eq('id', taskId);

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
  teamId: null,
  assignedTo: null,
  createdBy: null,
  // Amazon fields
  isAmazon: false,
  amazonTasks: [],
});
