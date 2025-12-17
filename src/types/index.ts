export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'completed';
export type SortOption = 'dueDate' | 'priority' | 'newest' | 'manual';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  projectId: string | null;
  tagIds: string[];
  priority: Priority;
  dueDate: string | null;
  order: number;
  status: TaskStatus;
  subtasks: Subtask[];
  attachments: string[]; // URLs only
  recurrence: RecurrenceType;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  order: number;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface FilterState {
  status: TaskStatus | 'all';
  projectId: string | null;
  tagIds: string[];
  priority: Priority | null;
  dueDateFilter: 'all' | 'today' | 'week' | 'overdue' | 'noDate';
  searchQuery: string;
  sortBy: SortOption;
}

export interface AppData {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  exportedAt: string;
  version: string;
}
