export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'completed';
export type SortOption = 'dueDate' | 'priority' | 'newest' | 'manual';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

// Amazon task types
export type AmazonTaskType = 'listing' | 'premium_a_plus' | 'basic_a_plus' | 'store_front' | 'brand_story' | 'color_variation' | 'mini_task';

export interface AmazonTaskItem {
  type: AmazonTaskType;
  quantity: number;
}

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
  // Team assignment fields
  teamId: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  // Amazon task tracking
  isAmazon: boolean;
  amazonTasks: AmazonTaskItem[];
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
