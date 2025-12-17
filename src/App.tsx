import { useEffect, useState, useMemo } from 'react';
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
  createEmptyTask,
} from './store';
import { exportData, importData, clearAllData } from './db';
import type { Task, Priority, RecurrenceType } from './types';

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

// Draggable Task Card
function DraggableTaskCard({ task, onEdit, onDelete, projects, tags }: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  projects: { id: string; name: string; color: string }[];
  tags: { id: string; name: string; color: string }[];
}) {
  const { toggleSubtask } = useTaskStore();
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
    transition,
  };

  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
  const taskTags = tags.filter((t) => task.tagIds.includes(t.id));
  const isOverdue = task.dueDate && task.status === 'pending' && isBefore(parseISO(task.dueDate), startOfDay(new Date()));
  const completedSubtasks = task.subtasks.filter((st) => st.completed).length;
  const totalSubtasks = task.subtasks.length;

  const priorityStyles = {
    low: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    medium: 'bg-amber-50 text-amber-600 border-amber-200',
    high: 'bg-rose-50 text-rose-600 border-rose-200',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-2xl p-4 transition-all duration-200 stagger-item bg-white border border-gray-100 ${
        isDragging ? 'opacity-90 scale-[1.02] z-50 rotate-1 shadow-xl border-primary-300' : 'hover:shadow-lg hover:border-gray-200'
      } ${task.status === 'completed' ? 'opacity-60' : ''} ${
        isOverdue && task.status !== 'completed' 
          ? '!bg-gradient-to-br !from-rose-50 !to-red-50/80 !border-rose-200 overdue-pulse' 
          : ''
      }`}
    >
      <div className="flex gap-2 sm:gap-3">
        {/* Drag Handle - always visible on mobile for touch */}
        <button
          {...attributes}
          {...listeners}
          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing transition-all p-1 -ml-1 touch-manipulation"
          style={{ touchAction: 'none' }}
        >
          <Icons.Grip />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''} ${isOverdue ? 'text-rose-700' : 'text-gray-900'}`}>
              {task.title}
            </h3>
            <span className={`tag text-xs border ${priorityStyles[task.priority]}`}>
              {task.priority}
            </span>
          </div>

          {task.notes && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.notes}</p>
          )}

          {/* Subtasks Progress */}
          {totalSubtasks > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-500"
                    style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">{completedSubtasks}/{totalSubtasks}</span>
              </div>
              <div className="space-y-1">
                {task.subtasks.slice(0, 2).map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 text-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSubtask(task.id, subtask.id); }}
                      className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                        subtask.completed ? 'bg-primary-500 border-primary-500' : 'border-gray-300 hover:border-primary-400'
                      }`}
                    >
                      {subtask.completed && (
                        <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className={subtask.completed ? 'line-through text-gray-400' : 'text-gray-600'}>{subtask.title}</span>
                  </div>
                ))}
                {totalSubtasks > 2 && <span className="text-xs text-gray-400 ml-5">+{totalSubtasks - 2} more</span>}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {project && (
              <span className="tag text-xs" style={{ backgroundColor: `${project.color}15`, color: project.color }}>
                {project.name}
              </span>
            )}
            {taskTags.slice(0, 2).map((tag) => (
              <span key={tag.id} className="tag text-xs" style={{ backgroundColor: `${tag.color}15`, color: tag.color }}>
                {tag.name}
              </span>
            ))}
            {taskTags.length > 2 && <span className="text-xs text-gray-400">+{taskTags.length - 2}</span>}
            {task.dueDate && (
              <span className={`tag text-xs border ${isOverdue ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                <Icons.Calendar />
                <span className="ml-1">{format(parseISO(task.dueDate), 'MMM d')}</span>
              </span>
            )}
            {task.recurrence !== 'none' && (
              <span className="tag text-xs bg-blue-50 text-blue-600 border border-blue-200">
                <Icons.Repeat />
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(task)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <Icons.Edit />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors">
            <Icons.Trash />
          </button>
        </div>
      </div>
    </div>
  );
}

// Droppable Column
function DroppableColumn({ id, title, icon, count, children, isOver }: {
  id: string;
  title: string;
  icon: React.ReactNode;
  count: number;
  color?: string;
  children: React.ReactNode;
  isOver?: boolean;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column flex-1 min-w-0 sm:min-w-[300px] lg:min-w-[340px] max-w-full sm:max-w-[520px] ${isOver ? 'drop-active' : ''}`}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-transform duration-200 hover:scale-105 ${
          id === 'pending' 
            ? 'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600' 
            : 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600'
        }`}>
          {icon}
        </div>
        <div>
          <h2 className="font-semibold text-gray-800 text-[15px]">{title}</h2>
          <p className="text-[11px] text-gray-400">{count} {count === 1 ? 'task' : 'tasks'}</p>
        </div>
        <div className={`ml-auto w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
          id === 'pending' 
            ? 'bg-amber-500/10 text-amber-600' 
            : 'bg-emerald-500/10 text-emerald-600'
        } ${count > 0 ? 'animate-pop' : ''}`}>
          {count}
        </div>
      </div>
      <div className="space-y-3 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}

function App() {
  const { tasks, loadTasks, addTask, updateTask, deleteTask, toggleTaskStatus, reorderTasks } = useTaskStore();
  const { projects, loadProjects, addProject, deleteProject } = useProjectStore();
  const { tags, loadTags, addTag, deleteTag } = useTagStore();
  const { searchQuery, setSearchQuery, projectId, setProjectId, tagIds, toggleTagId, priority, setPriority, resetFilters } = useFilterStore();

  const [initialized, setInitialized] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newTagName, setNewTagName] = useState('');

  // Task Form State
  const [formData, setFormData] = useState(createEmptyTask());
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');

  useEffect(() => {
    Promise.all([loadTasks(), loadProjects(), loadTags()]).then(() => setInitialized(true));
  }, [loadTasks, loadProjects, loadTags]);

  // Filter tasks (without status filter - we show both columns)
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

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
  }, [tasks, projectId, tagIds, priority, searchQuery]);

  const pendingTasks = useMemo(() => filteredTasks.filter((t) => t.status === 'pending'), [filteredTasks]);
  const completedTasks = useMemo(() => filteredTasks.filter((t) => t.status === 'completed'), [filteredTasks]);

  // Drag and drop sensors - includes touch for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
      toast.success(targetStatus === 'completed' ? '✓ Task completed!' : 'Task moved to pending');
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
    setEditingTask(null);
    setFormData(createEmptyTask());
    setShowTaskModal(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      notes: task.notes,
      projectId: task.projectId,
      tagIds: task.tagIds,
      priority: task.priority,
      dueDate: task.dueDate,
      status: task.status,
      subtasks: task.subtasks,
      attachments: task.attachments,
      recurrence: task.recurrence,
      completedAt: task.completedAt,
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }
    if (editingTask) {
      await updateTask(editingTask.id, formData);
      toast.success('Task updated!');
    } else {
      await addTask(formData);
      toast.success('Task created!');
    }
    setShowTaskModal(false);
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      setFormData({
        ...formData,
        subtasks: [...formData.subtasks, { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false }],
      });
      setNewSubtaskTitle('');
    }
  };

  const handleAddAttachment = () => {
    if (newAttachmentUrl.trim()) {
      try {
        new URL(newAttachmentUrl);
        setFormData({ ...formData, attachments: [...formData.attachments, newAttachmentUrl.trim()] });
        setNewAttachmentUrl('');
      } catch {
        toast.error('Please enter a valid URL');
      }
    }
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-600 font-medium">Loading your tasks</p>
            <div className="flex justify-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '0s'}} />
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 2000,
          style: { background: '#1f2937', color: '#fff', borderRadius: '16px', padding: '12px 24px', fontWeight: 500 },
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3 sm:gap-6">
            <div className="flex items-center">
              <img src="/Logo.avif" alt="Logo" className="h-9 sm:h-11 w-auto object-contain logo-float" />
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md hidden sm:block">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary-500">
                  <Icons.Search />
                </div>
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-12 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setShowSettingsModal(true)} 
                className="p-2.5 hover:bg-gray-100/80 rounded-xl transition-all duration-200 text-gray-500 hover:text-gray-700 hover:scale-105 active:scale-95"
              >
                <Icons.Settings />
              </button>
              <button onClick={openNewTask} className="btn-primary btn-ripple flex items-center gap-2 py-2.5 text-sm">
                <Icons.Plus />
                <span className="hidden sm:inline">Add Task</span>
              </button>
            </div>
          </div>
          
          {/* Mobile Search */}
          <div className="sm:hidden mt-3">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary-500">
                <Icons.Search />
              </div>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-12 py-2.5 text-sm w-full"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Quick Stats */}
        {(todayCount > 0 || overdueCount > 0) && (
          <div className="flex gap-3 mb-6 overflow-x-auto pb-2 animate-fade-in">
            {todayCount > 0 && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-blue-50/50 text-blue-700 rounded-2xl whitespace-nowrap border border-blue-100/50 hover-bounce cursor-default">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Icons.Calendar />
                </div>
                <span className="text-sm font-semibold">{todayCount}</span>
                <span className="text-sm text-blue-600/80">due today</span>
              </div>
            )}
            {overdueCount > 0 && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-rose-50 to-rose-50/50 text-rose-700 rounded-2xl whitespace-nowrap border border-rose-100/50 hover-bounce cursor-default">
                <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Icons.Clock />
                </div>
                <span className="text-sm font-semibold">{overdueCount}</span>
                <span className="text-sm text-rose-600/80">overdue</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block w-60 flex-shrink-0 space-y-4">
            {/* Filters */}
            <div className="card p-4 space-y-3">
              <h3 className="section-title px-1">Priority</h3>
              <div className="space-y-0.5">
                {['high', 'medium', 'low'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(priority === p ? null : (p as Priority))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[13px] font-medium transition-all duration-200 ${
                      priority === p 
                        ? 'bg-primary-50/80 text-primary-600 shadow-sm' 
                        : 'hover:bg-gray-50/80 text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full transition-transform duration-200 ${
                      priority === p ? 'scale-125' : ''
                    } ${
                      p === 'high' ? 'bg-rose-500' : p === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <span className="capitalize">{p}</span>
                    {priority === p && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
                    )}
                  </button>
                ))}
              </div>
              <button 
                onClick={resetFilters} 
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1 hover:underline"
              >
                Clear all
              </button>
            </div>

            {/* Projects */}
            <div className="card p-4">
              <h3 className="section-title px-1 mb-3">Projects</h3>
              <div className="space-y-0.5 mb-3">
                <button
                  onClick={() => setProjectId(null)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[13px] font-medium transition-all duration-200 ${
                    !projectId ? 'bg-primary-50/80 text-primary-600 shadow-sm' : 'hover:bg-gray-50/80 text-gray-600'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-gradient-to-br from-gray-400 to-gray-500" />
                  <span>All Projects</span>
                </button>
                {projects.map((project) => (
                  <div key={project.id} className="group flex items-center">
                    <button
                      onClick={() => setProjectId(project.id)}
                      className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[13px] font-medium transition-all duration-200 ${
                        projectId === project.id ? 'bg-primary-50/80 text-primary-600 shadow-sm' : 'hover:bg-gray-50/80 text-gray-600'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: project.color }} />
                      <span className="truncate">{project.name}</span>
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-rose-400 hover:text-rose-500 rounded-lg transition-all duration-200"
                    >
                      <Icons.Close />
                    </button>
                  </div>
                ))}
              </div>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProjectName.trim()) {
                    addProject(newProjectName.trim());
                    setNewProjectName('');
                  }
                }}
                placeholder="+ Add project"
                className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl border-0 focus:bg-white focus:ring-2 focus:ring-primary-400 transition-all"
              />
            </div>

            {/* Tags */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTagId(tag.id)}
                    className={`tag text-xs transition-all ${tagIds.includes(tag.id) ? 'ring-2 ring-offset-1 ring-primary-400' : ''}`}
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTagName.trim()) {
                    addTag(newTagName.trim());
                    setNewTagName('');
                  }
                }}
                placeholder="+ Add tag"
                className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl border-0 focus:bg-white focus:ring-2 focus:ring-primary-400 transition-all"
              />
            </div>
          </aside>

          {/* Kanban Columns */}
          <div className="flex-1 flex flex-col sm:flex-row gap-4 sm:gap-6 overflow-x-auto pb-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {/* Pending Column */}
              <DroppableColumn
                id="pending"
                title="To Do"
                icon={<Icons.Clock />}
                count={pendingTasks.length}
                color="amber"
                isOver={overColumn === 'pending'}
              >
                <SortableContext items={pendingTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {pendingTasks.length === 0 ? (
                    <div className="text-center py-16 animate-fade-in">
                      <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-1">No tasks yet</p>
                      <p className="text-xs text-gray-400 mb-4">Create your first task to get started</p>
                      <button 
                        onClick={openNewTask} 
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
                      >
                        <Icons.Plus />
                        <span>Add task</span>
                      </button>
                    </div>
                  ) : (
                    pendingTasks.map((task) => (
                      <DraggableTaskCard
                        key={task.id}
                        task={task}
                        onEdit={openEditTask}
                        onDelete={deleteTask}
                        projects={projects}
                        tags={tags}
                      />
                    ))
                  )}
                </SortableContext>
              </DroppableColumn>

              {/* Completed Column */}
              <DroppableColumn
                id="completed"
                title="Done"
                icon={<Icons.CheckCircle />}
                count={completedTasks.length}
                color="emerald"
                isOver={overColumn === 'completed'}
              >
                <SortableContext items={completedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {completedTasks.length === 0 ? (
                    <div className="text-center py-16 animate-fade-in">
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-100/50 to-emerald-50/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400">
                        <Icons.CheckCircle />
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Nothing completed</p>
                      <p className="text-xs text-gray-400">Drag tasks here when done</p>
                    </div>
                  ) : (
                    completedTasks.map((task) => (
                      <DraggableTaskCard
                        key={task.id}
                        task={task}
                        onEdit={openEditTask}
                        onDelete={deleteTask}
                        projects={projects}
                        tags={tags}
                      />
                    ))
                  )}
                </SortableContext>
              </DroppableColumn>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeTask && (
                  <div className="drag-overlay">
                    <h3 className="font-semibold text-gray-900 text-[15px]">{activeTask.title}</h3>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <span>Drop to {activeTask.status === 'pending' ? 'complete' : 'reopen'}</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </p>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </main>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md modal-backdrop" onClick={() => setShowTaskModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto modal-content">
            <div className="sticky top-0 glass-subtle p-5 border-b border-gray-100/50 rounded-t-3xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="/Logo.avif" alt="" className="w-8 h-8 object-contain" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{editingTask ? 'Edit Task' : 'New Task'}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Fill in the details below</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTaskModal(false)} 
                  className="p-1.5 hover:bg-gray-100/80 rounded-xl transition-all duration-200 hover:scale-110 hover:rotate-12"
                >
                  <img src="/Logo.avif" alt="Close" className="w-6 h-6 object-contain" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="section-title">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input mt-2 text-base font-medium"
                  placeholder="What needs to be done?"
                  autoFocus
                />
              </div>

              <div>
                <label className="section-title">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input mt-2 min-h-[80px] resize-y text-sm"
                  placeholder="Add details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-title">Project</label>
                  <select
                    value={formData.projectId || ''}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value || null })}
                    className="input mt-2 text-sm"
                  >
                    <option value="">No Project</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="section-title">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                    className="input mt-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate ? formData.dueDate.split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="input mt-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recurrence</label>
                  <select
                    value={formData.recurrence}
                    onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as RecurrenceType })}
                    className="input mt-2"
                  >
                    <option value="none">No Repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tags</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        tagIds: formData.tagIds.includes(tag.id)
                          ? formData.tagIds.filter((id) => id !== tag.id)
                          : [...formData.tagIds, tag.id],
                      })}
                      className={`tag transition-all ${formData.tagIds.includes(tag.id) ? 'ring-2 ring-offset-1' : ''}`}
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Subtasks</label>
                <div className="space-y-2 mt-2">
                  {formData.subtasks.map((st) => (
                    <div key={st.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                      <span className="flex-1 text-sm">{st.title}</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, subtasks: formData.subtasks.filter((s) => s.id !== st.id) })}
                        className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-colors"
                      >
                        <Icons.Close />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                    className="input flex-1"
                    placeholder="Add subtask..."
                  />
                  <button type="button" onClick={handleAddSubtask} className="btn-secondary">Add</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Attachments (URLs)</label>
                <div className="space-y-2 mt-2">
                  {formData.attachments.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                      <Icons.Link />
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-primary-600 hover:underline truncate">{url}</a>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, attachments: formData.attachments.filter((_, idx) => idx !== i) })}
                        className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-colors"
                      >
                        <Icons.Close />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="url"
                    value={newAttachmentUrl}
                    onChange={(e) => setNewAttachmentUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttachment())}
                    className="input flex-1"
                    placeholder="https://..."
                  />
                  <button type="button" onClick={handleAddAttachment} className="btn-secondary">Add</button>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl p-6 border-t border-gray-100 rounded-b-3xl">
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowTaskModal(false)} className="btn-secondary text-sm py-2.5">Cancel</button>
                <button onClick={handleSaveTask} className="btn-primary btn-ripple text-sm py-2.5">
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md modal-backdrop" onClick={() => setShowSettingsModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full modal-content">
            <div className="p-5 border-b border-gray-100/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="/Logo.avif" alt="" className="w-8 h-8 object-contain" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Manage your data</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettingsModal(false)} 
                  className="p-1.5 hover:bg-gray-100/80 rounded-xl transition-all duration-200 hover:scale-110 hover:rotate-12"
                >
                  <img src="/Logo.avif" alt="Close" className="w-6 h-6 object-contain" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-400 mb-4">Your data is stored locally on this device.</p>

              <button
                onClick={handleExport}
                className="w-full flex items-center gap-3 p-3.5 card hover:bg-gray-50/80 transition-all duration-200 group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                  <Icons.Download />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-sm text-gray-800">Export Data</div>
                  <div className="text-xs text-gray-400">Download as JSON</div>
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <label className="w-full flex items-center gap-3 p-3.5 card hover:bg-gray-50/80 transition-all duration-200 cursor-pointer group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                  <Icons.Upload />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-sm text-gray-800">Import Data</div>
                  <div className="text-xs text-gray-400">Restore from backup</div>
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>

              <div className="pt-2">
                <button
                  onClick={async () => {
                    if (confirm('Delete all data? This cannot be undone.')) {
                      await clearAllData();
                      toast.success('All data cleared!');
                      setTimeout(() => window.location.reload(), 1000);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-rose-100 hover:bg-rose-50/50 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-rose-100 to-rose-50 rounded-xl flex items-center justify-center text-rose-500 group-hover:scale-105 transition-transform">
                    <Icons.Trash />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium text-sm text-rose-600">Clear All Data</div>
                    <div className="text-xs text-gray-400">Delete everything</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100/50 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">TaskFlow • Local Storage</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
