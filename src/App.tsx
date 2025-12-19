import React, { useState, useEffect, useMemo } from 'react'; // Force Update Check
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { format, isBefore, startOfDay, parseISO, isToday, isThisWeek } from 'date-fns';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useTaskStore,
  useProjectStore,
  useTagStore,
  useFilterStore,
  useUIStore,
  createEmptyTask,
} from './store';
import { TaskModal } from './components/TaskModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import StickerPeel from './components/StickerPeel';
import { exportData, importData, clearAllData } from './db';
import type { Task, Priority, RecurrenceType } from './types';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/AdminPanel';
import OrganizationPage from './pages/OrganizationPage';
import { CalendarView } from './pages/CalendarView';
import { Dashboard } from './pages/Dashboard';
import LeaderboardModal from './components/LeaderboardModal';
import { SettingsModal } from './components/SettingsModal';
import StaggeredMenu from './components/StaggeredMenu';
import { CommandPalette, useCommandPalette } from './components/CommandPalette';
import { PomodoroTimer } from './components/PomodoroTimer';
import { BulkActionsBar } from './components/BulkActionsBar';
import { useTaskAssignmentNotification } from './hooks/useTaskAssignmentNotification';
import { supabase } from './lib/supabase';
import type { Team, Profile } from './lib/database.types';

// Icons
const Icons = {
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Grip: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Link: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Repeat: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Download: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Upload: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  CheckCircle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// 2D Premium Color Palette: bg-white, border-zinc-100, orange-primary
function TaskCard({
  task,
  project,
  tags,
  priorityStyles,
  isOverdue,
  completedSubtasks,
  totalSubtasks,
  onEdit,
  onDelete,
  onClick,
  style,
  dragListeners,
  dragAttributes,
  setNodeRef,
  isDragging,
  isOverlay,
  isSelected,
  onSelect,
  bulkSelectMode
}: {
  task: Task;
  project: any;
  tags: any[];
  priorityStyles: any;
  isOverdue: boolean;
  completedSubtasks: number;
  totalSubtasks: number;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onClick?: () => void;
  style?: React.CSSProperties;
  dragListeners?: any;
  dragAttributes?: any;
  setNodeRef?: (node: HTMLElement | null) => void;
  isDragging?: boolean;
  isOverlay?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  bulkSelectMode?: boolean;
}) {
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragAttributes}
      {...dragListeners}
      onClick={bulkSelectMode ? onSelect : onClick}
      className={`group relative p-6 bg-white dark:bg-zinc-800 border-l-4 transition-all duration-200 cursor-pointer
        ${isDragging || isOverlay
          ? 'shadow-xl scale-[1.02] border-l-orange-500'
          : 'hover:shadow-lg hover:-translate-y-0.5'
        } 
        ${task.status === 'completed' ? 'opacity-50' : ''}
        ${isOverdue && task.status !== 'completed' ? 'border-l-red-500 bg-red-50/30 dark:bg-red-900/20' : 'border-l-transparent hover:border-l-orange-400'}
        ${isSelected ? 'ring-2 ring-orange-500 bg-orange-50/50 dark:bg-orange-900/20' : ''}
       `}
    >
      {/* Selection Checkbox */}
      {bulkSelectMode && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
          <div
            className={`w-6 h-6 flex items-center justify-center border-2 transition-all ${isSelected
              ? 'bg-orange-500 border-orange-500 text-white'
              : 'bg-white dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600'
              }`}
          >
            {isSelected && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}
      <div className={`flex flex-col gap-4 ${bulkSelectMode ? 'pl-8' : ''}`}>
        {/* Header: Project & Priority */}
        <div className="flex items-center justify-between">
          {project ? (
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {project.name}
            </span>
          ) : (
            <div />
          )}
          {task.priority !== 'low' && (
            <span className={`text-[10px] font-black uppercase tracking-widest ${task.priority === 'high' ? 'text-red-500' : 'text-amber-500'
              }`}>
              {task.priority}
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <h3 className={`text-lg font-bold leading-tight text-zinc-900 dark:text-white ${task.status === 'completed' ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}`}>
            {task.title}
          </h3>
          {task.notes && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">{task.notes}</p>
          )}
        </div>

        {/* Footer: Date, Subtasks, Tags */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-700">
          <div className="flex items-center gap-4">
            {task.dueDate && (
              <span className={`flex items-center gap-1.5 text-xs font-semibold ${isOverdue ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
                <Icons.Calendar />
                <span>{format(parseISO(task.dueDate), 'MMM d')}</span>
              </span>
            )}

            {totalSubtasks > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                <Icons.CheckCircle />
                <span>{completedSubtasks}/{totalSubtasks}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1">
            {tags.slice(0, 3).map((tag) => (
              <div key={tag.id} className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold text-white uppercase" style={{ backgroundColor: tag.color }} title={tag.name}>
                {tag.name[0]}
              </div>
            ))}
          </div>
        </div>

        {/* Hover Actions */}
        {!isOverlay && onEdit && onDelete && (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 absolute right-4 top-4">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onEdit(task)}
              className="w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"
            >
              <Icons.Edit />
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onDelete(task.id)}
              className="w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
              <Icons.Trash />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Draggable Task Card - Premium 2D
function DraggableTaskCard({ task, onEdit, onDelete, onClick, projects, tags, isSelected, onSelect, bulkSelectMode }: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
  projects: { id: string; name: string; color: string }[];
  tags: { id: string; name: string; color: string }[];
  isSelected?: boolean;
  onSelect?: () => void;
  bulkSelectMode?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
  };

  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
  const taskTags = tags.filter((t) => task.tagIds.includes(t.id));
  const isOverdue = task.dueDate && task.status === 'pending' && isBefore(parseISO(task.dueDate), startOfDay(new Date()));
  const completedSubtasks = task.subtasks.filter((st) => st.completed).length;
  const totalSubtasks = task.subtasks.length;

  const priorityStyles = {
    low: 'bg-emerald-500/20 text-emerald-400',
    medium: 'bg-amber-500/20 text-amber-400',
    high: 'bg-rose-500/20 text-rose-400',
  };

  return (
    <TaskCard
      task={task}
      project={project}
      tags={taskTags}
      priorityStyles={priorityStyles}
      isOverdue={!!isOverdue}
      completedSubtasks={completedSubtasks}
      totalSubtasks={totalSubtasks}
      onEdit={onEdit}
      onDelete={onDelete}
      onClick={onClick}
      style={style}
      dragListeners={bulkSelectMode ? undefined : listeners}
      dragAttributes={bulkSelectMode ? undefined : attributes}
      setNodeRef={setNodeRef}
      isDragging={isDragging}
      isSelected={isSelected}
      onSelect={onSelect}
      bulkSelectMode={bulkSelectMode}
    />
  );
}

// AssignerName component - fetches and displays creator name
function AssignerName({ createdById }: { createdById: string | null }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (createdById) {
      supabase
        .from('profiles')
        .select('name')
        .eq('id', createdById)
        .single()
        .then(({ data }) => {
          if (data) setName((data as { name: string }).name);
        });
    }
  }, [createdById]);

  return (
    <p className="text-sm font-semibold text-gray-700">{name || 'Loading...'}</p>
  );
}

// AssigneeName component - fetches and displays assignee name
function AssigneeName({ assignedToId, type }: { assignedToId: string | null, type: 'name' | 'initial' }) {
  const [profile, setProfile] = useState<{ name: string | null } | null>(null);

  useEffect(() => {
    if (assignedToId) {
      supabase
        .from('profiles')
        .select('name')
        .eq('id', assignedToId)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [assignedToId]);

  if (type === 'initial') {
    return <>{profile?.name?.charAt(0).toUpperCase() || '?'}</>;
  }
  return <p className="text-sm font-semibold text-gray-700">{profile?.name || 'Loading...'}</p>;
}

// Premium Droppable Column - Modern 2D design with useDroppable
function PremiumDroppableColumn({ id, title, count, colorScheme, children, isOver }: {
  id: string;
  title: string;
  count: number;
  colorScheme: 'amber' | 'emerald';
  children: React.ReactNode;
  isOver?: boolean;
}) {
  const { setNodeRef } = useDroppable({ id });

  const badgeStyles = colorScheme === 'amber'
    ? 'bg-white text-zinc-500 border-zinc-100'
    : 'bg-emerald-50 text-emerald-600 border-emerald-100';

  return (
    <div
      ref={setNodeRef}
      className={`w-[420px] flex-shrink-0 flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-800/50 transition-all duration-300 ${isOver ? 'ring-2 ring-orange-400/50 bg-orange-50/30 dark:bg-orange-900/20' : ''}`}
    >
      <div className="py-6 px-4 border-b border-zinc-100 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight">{title}</h2>
          <span className={`px-3 py-1 text-sm font-bold uppercase ${colorScheme === 'amber' ? 'text-orange-500' : 'text-emerald-500'
            }`}>
            {String(count).padStart(2, '0')}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
        {children}
      </div>
    </div>
  );
}

function App() {
  const { user, profile, loading: authLoading, signOut, isRole } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { tasks, loadTasks, addTask, updateTask, deleteTask, toggleTaskStatus, reorderTasks } = useTaskStore();
  const { projects, loadProjects, addProject, deleteProject } = useProjectStore();
  const { tags, loadTags, addTag, deleteTag } = useTagStore();
  const { searchQuery, setSearchQuery, projectId, setProjectId, tagIds, toggleTagId, priority, setPriority, resetFilters } = useFilterStore();

  // Listen for task assignment notifications
  useTaskAssignmentNotification();
  const [initialized, setInitialized] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { openTaskModal, setEditingTaskId, openTaskDetail, openLeaderboard } = useUIStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [showAssignedToMe, setShowAssignedToMe] = useState(false);
  const [showOrganizationPage, setShowOrganizationPage] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const commandPalette = useCommandPalette();
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    if (user) {
      Promise.all([loadTasks(), loadProjects(), loadTags()]).then(() => setInitialized(true));
    }
  }, [loadTasks, loadProjects, loadTags, user]);

  // Filter tasks (without status filter - we show both columns) - MUST be before any returns
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // Show only tasks assigned to me if filter is active
    if (showAssignedToMe && user) {
      filtered = filtered.filter((task) => task.assignedTo === user.id);
    }

    if (projectId) {
      filtered = filtered.filter((task) => task.projectId === projectId);
    }
    if (tagIds.length > 0) {
      filtered = filtered.filter((task) => tagIds.some((tagId) => task.tagIds.includes(tagId)));
    }
    if (priority) {
      filtered = filtered.filter((task) => task.priority === priority);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((task) =>
        task.title.toLowerCase().includes(query) || task.notes.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => a.order - b.order);
    return filtered;
  }, [tasks, projectId, tagIds, priority, searchQuery, showAssignedToMe, user]);

  // Tasks I assigned to others - ACTIVE (pending) - sorted by date (newest first)
  const activeAssignedByMe = useMemo(() => {
    if (!user) return [];
    return tasks.filter((t) =>
      t.createdBy === user.id &&
      t.assignedTo !== null &&
      t.assignedTo !== user.id &&
      t.status !== 'completed'
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tasks, user]);

  // Tasks I assigned to others - COMPLETED (past) - sorted by date (newest first)
  const completedAssignedByMe = useMemo(() => {
    if (!user) return [];
    return tasks.filter((t) =>
      t.createdBy === user.id &&
      t.assignedTo !== null &&
      t.assignedTo !== user.id &&
      t.status === 'completed'
    ).sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());
  }, [tasks, user]);

  // My own pending tasks
  const pendingTasks = useMemo(() =>
    filteredTasks.filter((t) => t.status === 'pending'), [filteredTasks]);
  const completedTasks = useMemo(() => filteredTasks.filter((t) => t.status === 'completed'), [filteredTasks]);

  // Drag and drop sensors - includes touch for mobile (MUST be before any returns)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Show loading while checking auth (AFTER all hooks)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden">
        <div className="text-center relative z-10">
          {/* Animated Logo */}
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto">
              <img
                src="/Logo.avif"
                alt="Asinify"
                className="w-full h-full object-contain"
                style={{ animation: 'logoFloat 2s ease-in-out infinite' }}
              />
            </div>
          </div>

          {/* Loading bar */}
          <div className="w-40 h-1 bg-zinc-100 mx-auto mb-4 overflow-hidden">
            <div className="h-full w-1/3 bg-orange-500" style={{ animation: 'shimmer 1.2s ease-in-out infinite' }} />
          </div>

          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Loading</p>
        </div>

        <style>{`
          @keyframes shimmer { 0% { transform: translateX(-150%); } 100% { transform: translateX(350%); } }
          @keyframes logoFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        `}</style>
      </div>
    );
  }

  // Show login if not authenticated (AFTER all hooks)
  if (!user) {
    return <LoginPage />;
  }

  // Show organization page if toggled
  if (showOrganizationPage) {
    return <OrganizationPage onClose={() => setShowOrganizationPage(false)} />;
  }

  // Show calendar view if toggled
  if (showCalendarView) {
    return (
      <CalendarView
        onClose={() => setShowCalendarView(false)}
        onTaskClick={(task) => {
          setShowCalendarView(false);
          openTaskDetail(task.id);
        }}
      />
    );
  }

  // Show dashboard if toggled
  if (showDashboard) {
    return (
      <Dashboard
        onClose={() => setShowDashboard(false)}
      />
    );
  }

  // Bulk Actions Handlers
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const selectAllTasks = () => {
    const pendingTaskIds = tasks.filter(t => t.status === 'pending').map(t => t.id);
    setSelectedTaskIds(new Set(pendingTaskIds));
  };

  const selectNoneTasks = () => {
    setSelectedTaskIds(new Set());
  };

  const bulkDeleteTasks = async () => {
    const toDelete = Array.from(selectedTaskIds);
    for (const id of toDelete) {
      await deleteTask(id);
    }
    toast.success(`Deleted ${toDelete.length} task${toDelete.length !== 1 ? 's' : ''}`);
    setSelectedTaskIds(new Set());
    setBulkSelectMode(false);
  };

  const bulkToggleStatus = async () => {
    const toToggle = Array.from(selectedTaskIds);
    const hasCompleted = toToggle.some(id => {
      const task = tasks.find(t => t.id === id);
      return task?.status === 'completed';
    });

    for (const id of toToggle) {
      await toggleTaskStatus(id);
    }

    const message = hasCompleted
      ? `Marked ${toToggle.length} task${toToggle.length !== 1 ? 's' : ''} as pending`
      : `Completed ${toToggle.length} task${toToggle.length !== 1 ? 's' : ''}`;
    toast.success(message);
    setSelectedTaskIds(new Set());
    setBulkSelectMode(false);
  };

  const bulkMoveToProject = async (projectId: string | null) => {
    const toMove = Array.from(selectedTaskIds);
    for (const id of toMove) {
      const task = tasks.find(t => t.id === id);
      if (task) {
        await updateTask(id, { projectId });
      }
    }
    const projectName = projectId ? projects.find(p => p.id === projectId)?.name : 'No Project';
    toast.success(`Moved ${toMove.length} task${toMove.length !== 1 ? 's' : ''} to ${projectName}`);
    setSelectedTaskIds(new Set());
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const overId = over.id as string;
      if (overId === 'pending' || overId === 'completed') {
        setOverColumn(overId);
      } else {
        // Dropping over a task - determine which column
        const overTask = tasks.find((t) => t.id === overId);
        if (overTask) {
          setOverColumn(overTask.status);
        }
      }
    } else {
      setOverColumn(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumn(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTaskData = tasks.find((t) => t.id === activeId);

    if (!activeTaskData) return;

    // Determine target status
    let targetStatus: 'pending' | 'completed';
    if (overId === 'pending' || overId === 'completed') {
      targetStatus = overId;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      targetStatus = overTask?.status || activeTaskData.status;
    }

    // If status changed, update the task
    if (activeTaskData.status !== targetStatus) {
      const completedAt = targetStatus === 'completed' ? new Date().toISOString() : null;
      await updateTask(activeId, { status: targetStatus, completedAt });
      toast.success(targetStatus === 'completed' ? 'âœ“ Task completed!' : 'Task moved to pending');
    }

    // Handle reordering within same column
    if (overId !== 'pending' && overId !== 'completed' && activeId !== overId) {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask && activeTaskData.status === overTask.status) {
        const columnTasks = activeTaskData.status === 'pending' ? pendingTasks : completedTasks;
        const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
        const newIndex = columnTasks.findIndex((t) => t.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(columnTasks, oldIndex, newIndex);
          reorderTasks(reordered.map((t) => t.id));
        }
      }
    }
  };



  // Modal handlers
  const openNewTask = () => {
    setEditingTaskId(null);
    openTaskModal();
  };

  const openEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    openTaskModal();
  };



  // Export/Import
  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todo-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Data exported!');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await file.text();
      await importData(text);
      toast.success('Data imported! Refreshing...');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  // Stats
  const today = startOfDay(new Date());
  const overdueCount = tasks.filter((t) => t.dueDate && isBefore(parseISO(t.dueDate), today) && t.status === 'pending').length;
  const todayCount = tasks.filter((t) => t.dueDate && isToday(parseISO(t.dueDate)) && t.status === 'pending').length;

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden">
        <div className="text-center relative z-10">
          {/* Logo with animation */}
          <div className="relative mb-6">
            <div className="w-24 h-24 mx-auto">
              <img
                src="/Logo.avif"
                alt="Asinify"
                className="w-full h-full object-contain"
                style={{ animation: 'logoFloat 2s ease-in-out infinite' }}
              />
            </div>
          </div>

          {/* Brand name */}
          <h2 className="text-2xl font-bold text-zinc-900 uppercase tracking-widest mb-4">Asinify</h2>

          {/* Loading dots */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" style={{ animation: 'bounce 1s ease-in-out infinite' }} />
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" style={{ animation: 'bounce 1s ease-in-out infinite 0.15s' }} />
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" style={{ animation: 'bounce 1s ease-in-out infinite 0.3s' }} />
          </div>

          <p className="text-zinc-400 text-xs font-medium">Preparing your workspace...</p>
        </div>

        <style>{`
          @keyframes logoFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
          @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-900 overflow-hidden font-sans selection:bg-orange-100 selection:text-orange-900 dark:selection:bg-orange-900/30 dark:selection:text-orange-300">

      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: { background: '#18181b', color: '#fff', borderRadius: '12px', padding: '12px 24px', fontWeight: 500 },
          success: { iconTheme: { primary: '#f97316', secondary: '#fff' } }
        }}
      />

      {/* Command Palette - Cmd+K */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        onNewTask={openNewTask}
        onOpenCalendar={() => setShowCalendarView(true)}
        onOpenSettings={() => useUIStore.getState().openSettingsModal()}
        onOpenLeaderboard={openLeaderboard}
      />

      {/* Staggered Menu - Premium Navigation Overlay */}
      <StaggeredMenu
        position="right"
        items={[
          { label: 'All Tasks', ariaLabel: 'View all tasks', link: '#', onClick: () => { setPriority(null); setProjectId(null); setShowAssignedToMe(false); } },
          { label: 'My Tasks', ariaLabel: 'View tasks assigned to me', link: '#', onClick: () => setShowAssignedToMe(true) },
          { label: 'Calendar', ariaLabel: 'View calendar', link: '#', onClick: () => setShowCalendarView(true) },
          { label: 'Leaderboard', ariaLabel: 'View leaderboard', link: '#', onClick: () => openLeaderboard() },
          { label: 'Organization', ariaLabel: 'My organization', link: '#', onClick: () => setShowOrganizationPage(true) },
          { label: 'Settings', ariaLabel: 'Account settings', link: '#', onClick: () => { const { openSettingsModal } = useUIStore.getState(); openSettingsModal(); } },
          ...(isRole('admin') || isRole('superadmin') ? [{ label: 'Admin', ariaLabel: 'Admin panel', link: '#', onClick: () => setShowAdminPanel(true) }] : []),
          { label: 'Sign Out', ariaLabel: 'Sign out', link: '#', onClick: () => signOut() }
        ]}
        socialItems={[]}
        displaySocials={false}
        displayItemNumbering={true}
        menuButtonColor={isDark ? '#ffffff' : '#18181b'}
        openMenuButtonColor={isDark ? '#ffffff' : '#18181b'}
        changeMenuColorOnOpen={false}
        colors={isDark ? ['#27272a', '#3f3f46'] : ['#fef3c7', '#fed7aa']}
        logoUrl="/Logo.avif"
        accentColor="#f97316"
      />

      {/* MAIN CONTENT AREA - FULL WIDTH PREMIUM DESIGN */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white dark:bg-zinc-900">
        {/* Premium Header - Responsive */}
        <header className="px-4 sm:px-6 md:px-12 pt-16 sm:pt-20 md:pt-24 pb-4 sm:pb-6 md:pb-8 z-40 bg-white dark:bg-zinc-900 sticky top-0">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs sm:text-sm font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1 sm:mb-2">
                {(() => {
                  const today = new Date();
                  return today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                })()}
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight leading-none">
                Hello<span className="text-orange-500">,</span>
                <br />
                <span className="text-orange-500">{profile?.name?.split(' ')[0]}</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="relative group flex-1 sm:flex-none">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-48 md:w-64 px-4 sm:px-6 py-3 sm:py-4 bg-zinc-50 dark:bg-zinc-800 border-0 text-sm sm:text-base font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-orange-500/30 transition-all outline-none"
                />
              </div>
              {/* Bulk Select Toggle */}
              <button
                onClick={() => {
                  setBulkSelectMode(!bulkSelectMode);
                  if (bulkSelectMode) {
                    setSelectedTaskIds(new Set());
                  }
                }}
                className={`h-10 sm:h-12 md:h-14 px-3 sm:px-4 md:px-6 font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-1 sm:gap-2 ${bulkSelectMode
                  ? 'bg-orange-500 text-white'
                  : isDark
                    ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="hidden sm:inline">{bulkSelectMode ? 'Cancel' : 'Select'}</span>
              </button>
              <button
                onClick={openNewTask}
                className="h-10 sm:h-12 md:h-14 px-4 sm:px-6 md:px-8 bg-zinc-900 dark:bg-orange-500 text-white font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-orange-500 dark:hover:bg-orange-600 active:scale-95 transition-all flex items-center gap-2 sm:gap-3"
              >
                <Icons.Plus />
                <span className="hidden sm:inline">New Task</span>
              </button>
            </div>
          </div>
        </header>

        {/* Projects Filter Bar - Responsive */}
        <div className="px-4 sm:px-6 md:px-12 py-3 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-[120px] sm:top-[150px] md:top-[176px] z-30">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 custom-scrollbar">
            <span className="text-[10px] sm:text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mr-1 sm:mr-2 flex-shrink-0">Projects:</span>
            <button
              onClick={() => setProjectId(null)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold transition-all flex-shrink-0 ${!projectId
                ? 'bg-orange-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
            >
              All
            </button>
            {projects.map((project) => (
              <div key={project.id} className="flex items-center gap-1 flex-shrink-0 group">
                <button
                  onClick={() => setProjectId(project.id)}
                  className={`px-4 py-2 text-sm font-bold transition-all flex items-center gap-2 ${projectId === project.id
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast((t) => (
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-bold text-white">Delete "{project.name}"?</p>
                          <p className="text-zinc-400 text-sm">This cannot be undone.</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toast.dismiss(t.id)}
                            className="px-3 py-1.5 bg-zinc-700 text-white text-sm font-bold hover:bg-zinc-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              deleteProject(project.id);
                              toast.dismiss(t.id);
                              toast.success('Project deleted');
                              if (projectId === project.id) setProjectId(null);
                            }}
                            className="px-3 py-1.5 bg-red-500 text-white text-sm font-bold hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ), { duration: 10000 });
                  }}
                  className={`p-2 transition-all opacity-0 group-hover:opacity-100 ${projectId === project.id ? 'text-zinc-400 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}`}
                  title="Delete project"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* New Project Button/Form */}
            {newProjectName !== null && newProjectName !== '' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newProjectName.trim()) {
                    const colors = ['#f97316', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    addProject(newProjectName.trim(), randomColor);
                    setNewProjectName('');
                    toast.success('Project created!');
                  }
                }}
                className="flex items-center gap-2 flex-shrink-0"
              >
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  autoFocus
                  className="px-3 py-2 text-sm bg-zinc-50 border-l-4 border-l-orange-500 w-40 focus:outline-none"
                />
                <button type="submit" className="px-3 py-2 bg-zinc-900 text-white text-sm font-bold hover:bg-orange-500">
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setNewProjectName('')}
                  className="px-3 py-2 bg-zinc-100 text-zinc-600 text-sm font-bold hover:bg-zinc-200"
                >
                  ✕
                </button>
              </form>
            ) : (
              <button
                onClick={() => setNewProjectName(' ')}
                className="px-4 py-2 text-sm font-bold transition-all flex-shrink-0 bg-zinc-100 text-zinc-600 hover:bg-orange-100 hover:text-orange-600 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden px-2 sm:px-4 md:px-8 pb-4 sm:pb-6 md:pb-8 custom-scrollbar">
          <div className="h-full flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8 sm:min-w-max pb-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {/* Pending Column */}
              <PremiumDroppableColumn id="pending" title="To Do" count={pendingTasks.length} colorScheme="amber" isOver={overColumn === 'pending'}>
                <SortableContext items={pendingTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {pendingTasks.map((task) => (
                    <DraggableTaskCard
                      key={task.id}
                      task={task}
                      onEdit={openEditTask}
                      onDelete={deleteTask}
                      onClick={() => openTaskDetail(task.id)}
                      projects={projects}
                      tags={tags}
                      isSelected={selectedTaskIds.has(task.id)}
                      onSelect={() => toggleTaskSelection(task.id)}
                      bulkSelectMode={bulkSelectMode}
                    />
                  ))}
                </SortableContext>
              </PremiumDroppableColumn>

              {/* Completed Column */}
              <PremiumDroppableColumn id="completed" title="Done" count={completedTasks.length} colorScheme="emerald" isOver={overColumn === 'completed'}>
                <SortableContext items={completedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {completedTasks.map((task) => (
                    <DraggableTaskCard
                      key={task.id}
                      task={task}
                      onEdit={openEditTask}
                      onDelete={deleteTask}
                      onClick={() => openTaskDetail(task.id)}
                      projects={projects}
                      tags={tags}
                      isSelected={selectedTaskIds.has(task.id)}
                      onSelect={() => toggleTaskSelection(task.id)}
                      bulkSelectMode={bulkSelectMode}
                    />
                  ))}
                </SortableContext>
              </PremiumDroppableColumn>

              {/* Assigned to Me - Pending (visible for assigners/superadmins) */}
              {(isRole('admin') || isRole('superadmin')) && (
                <div className="w-[420px] flex-shrink-0 flex flex-col h-full bg-orange-50/30">
                  <div className="py-6 px-4 border-b border-orange-100">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-orange-600 uppercase tracking-tight">Assigned</h2>
                      <span className="text-sm font-bold text-orange-500">
                        {String(tasks.filter(t => t.createdBy === user?.id && t.assignedTo && t.assignedTo !== user?.id && t.status === 'pending').length).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                    {tasks.filter(t => t.createdBy === user?.id && t.assignedTo && t.assignedTo !== user?.id && t.status === 'pending').map((task) => {
                      const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
                      const isOverdue = task.dueDate && isBefore(parseISO(task.dueDate), startOfDay(new Date()));
                      return (
                        <div key={task.id} onClick={() => openTaskDetail(task.id)} className="p-6 bg-white border-l-4 border-l-orange-400 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5">
                          <div className="flex items-center justify-between mb-3">
                            {project && <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">{project.name}</span>}
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Assigned to: <AssigneeName assignedToId={task.assignedTo} type="name" /></span>
                          </div>
                          <h4 className="text-lg font-bold text-zinc-900">{task.title}</h4>
                          {task.dueDate && (
                            <p className={`text-xs mt-3 font-semibold ${isOverdue ? 'text-red-500' : 'text-zinc-400'}`}>
                              Due: {format(parseISO(task.dueDate), 'MMM d')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assigned to Me - Completed (visible for assigners/superadmins) */}
              {(isRole('admin') || isRole('superadmin')) && (
                <div className="w-[420px] flex-shrink-0 flex flex-col h-full bg-emerald-50/30">
                  <div className="py-6 px-4 border-b border-emerald-100">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-emerald-600 uppercase tracking-tight">Completed</h2>
                      <span className="text-sm font-bold text-emerald-500">
                        {String(tasks.filter(t => t.createdBy === user?.id && t.assignedTo && t.assignedTo !== user?.id && t.status === 'completed').length).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                    {tasks.filter(t => t.createdBy === user?.id && t.assignedTo && t.assignedTo !== user?.id && t.status === 'completed').map((task) => {
                      const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
                      return (
                        <div key={task.id} onClick={() => openTaskDetail(task.id)} className="p-6 bg-white border-l-4 border-l-emerald-400 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 opacity-70 hover:opacity-100">
                          <div className="flex items-center justify-between mb-3">
                            {project && <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">{project.name}</span>}
                            <span className="text-[10px] font-bold text-emerald-500 uppercase">Done</span>
                          </div>
                          <h4 className="text-lg font-bold text-zinc-900 line-through">{task.title}</h4>
                          {task.completedAt && (
                            <p className="text-xs mt-3 font-semibold text-emerald-500">
                              {format(parseISO(task.completedAt), 'MMM d')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <DragOverlay dropAnimation={{
                duration: 250,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
              }}>
                {activeTask ? (
                  (() => {
                    const project = activeTask.projectId ? projects.find((p) => p.id === activeTask.projectId) : null;
                    const taskTags = tags.filter((t) => activeTask.tagIds.includes(t.id));
                    const isOverdue = activeTask.dueDate && activeTask.status === 'pending' && isBefore(parseISO(activeTask.dueDate), startOfDay(new Date()));
                    const completedSubtasks = activeTask.subtasks.filter((st) => st.completed).length;
                    const totalSubtasks = activeTask.subtasks.length;
                    const priorityStyles = {
                      low: 'bg-emerald-500/20 text-emerald-400',
                      medium: 'bg-amber-500/20 text-amber-400',
                      high: 'bg-rose-500/20 text-rose-400',
                    };

                    return (
                      <StickerPeel
                        width="100%"
                        rotate={5}
                        peelBackHoverPct={20}
                        peelBackActivePct={40}
                        shadowIntensity={0.6}
                        lightingIntensity={0.1}
                        peelDirection={15}
                        isDragging={true}
                        className="w-full"
                      >
                        <TaskCard
                          task={activeTask}
                          project={project}
                          tags={taskTags}
                          priorityStyles={priorityStyles}
                          isOverdue={!!isOverdue}
                          completedSubtasks={completedSubtasks}
                          totalSubtasks={totalSubtasks}
                          isOverlay
                        />
                      </StickerPeel>
                    );
                  })()
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </main>

      {/* Task Modal */}
      <TaskModal />
      <TaskDetailModal />
      {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
      <LeaderboardModal />
      {showOrganizationPage && <OrganizationPage onClose={() => setShowOrganizationPage(false)} />}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedTaskIds.size}
        totalCount={tasks.length}
        onSelectAll={selectAllTasks}
        onSelectNone={selectNoneTasks}
        onDelete={bulkDeleteTasks}
        onToggleStatus={bulkToggleStatus}
        hasCompletedSelected={Array.from(selectedTaskIds).some(id => {
          const task = tasks.find(t => t.id === id);
          return task?.status === 'completed';
        })}
        onClose={() => {
          setSelectedTaskIds(new Set());
          setBulkSelectMode(false);
        }}
      />

      {/* Pomodoro Timer - Floating Widget */}
      <PomodoroTimer />

      {/* Settings Modal */}
      <SettingsModal />
    </div>
  );
}


export default App;
