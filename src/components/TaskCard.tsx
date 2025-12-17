import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import type { Task } from '../types';
import { useTaskStore, useProjectStore, useTagStore, useUIStore } from '../store';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

export function TaskCard({ task, isDragging }: TaskCardProps) {
  const { toggleTaskStatus, deleteTask, toggleSubtask } = useTaskStore();
  const projects = useProjectStore((state) => state.projects);
  const tags = useTagStore((state) => state.tags);
  const { openTaskModal } = useUIStore();

  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
  const taskTags = tags.filter((t) => task.tagIds.includes(t.id));

  const isOverdue =
    task.dueDate &&
    task.status === 'pending' &&
    isBefore(parseISO(task.dueDate), startOfDay(new Date()));

  const completedSubtasks = task.subtasks.filter((st) => st.completed).length;
  const totalSubtasks = task.subtasks.length;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    low: 'priority-low',
    medium: 'priority-medium',
    high: 'priority-high',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card p-4 hover:shadow-md transition-all ${
        task.status === 'completed' ? 'opacity-60' : ''
      } ${isDragging ? 'shadow-lg ring-2 ring-primary-500' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing mt-0.5"
        >
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM16 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM16 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </button>

        {/* Checkbox */}
        <button
          onClick={() => toggleTaskStatus(task.id)}
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
            task.status === 'completed'
              ? 'bg-primary-500 border-primary-500'
              : 'border-gray-300 hover:border-primary-500'
          }`}
        >
          {task.status === 'completed' && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`font-medium ${
                task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
            >
              {task.title}
            </h3>
            <span className={`tag ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
          </div>

          {task.notes && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.notes}</p>
          )}

          {/* Subtasks preview */}
          {totalSubtasks > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>{completedSubtasks}/{totalSubtasks} subtasks</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-primary-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                />
              </div>
              <div className="mt-2 space-y-1">
                {task.subtasks.slice(0, 3).map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 text-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSubtask(task.id, subtask.id); }}
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                        subtask.completed
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-gray-300 hover:border-primary-500'
                      }`}
                    >
                      {subtask.completed && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className={subtask.completed ? 'line-through text-gray-400' : 'text-gray-600'}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
                {totalSubtasks > 3 && (
                  <span className="text-xs text-gray-400">+{totalSubtasks - 3} more</span>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {project && (
              <span
                className="tag"
                style={{
                  backgroundColor: `${project.color}20`,
                  color: project.color,
                }}
              >
                {project.name}
              </span>
            )}
            {taskTags.map((tag) => (
              <span
                key={tag.id}
                className="tag"
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                }}
              >
                {tag.name}
              </span>
            ))}
            {task.dueDate && (
              <span
                className={`tag ${
                  isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {format(parseISO(task.dueDate), 'MMM d')}
                {isOverdue && ' (Overdue)'}
              </span>
            )}
            {task.recurrence !== 'none' && (
              <span className="tag bg-blue-100 text-blue-700">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {task.recurrence}
              </span>
            )}
            {task.attachments.length > 0 && (
              <span className="tag bg-gray-100 text-gray-600">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {task.attachments.length}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => openTaskModal(task.id)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => deleteTask(task.id)}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
