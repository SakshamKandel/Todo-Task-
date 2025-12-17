import { useState, useEffect } from 'react';
import { useTaskStore, useProjectStore, useTagStore, useUIStore, createEmptyTask } from '../store';
import type { Task, Priority, RecurrenceType } from '../types';
import toast from 'react-hot-toast';

export function TaskModal() {
  const { taskModalOpen, closeTaskModal, editingTaskId } = useUIStore();
  const tasks = useTaskStore((state) => state.tasks);
  const { addTask, updateTask, addSubtask, deleteSubtask } = useTaskStore();
  const projects = useProjectStore((state) => state.projects);
  const tags = useTagStore((state) => state.tags);

  const editingTask = editingTaskId ? tasks.find((t) => t.id === editingTaskId) : null;

  const [formData, setFormData] = useState<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>>(createEmptyTask());
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');

  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title,
        notes: editingTask.notes,
        projectId: editingTask.projectId,
        tagIds: editingTask.tagIds,
        priority: editingTask.priority,
        dueDate: editingTask.dueDate,
        status: editingTask.status,
        subtasks: editingTask.subtasks,
        attachments: editingTask.attachments,
        recurrence: editingTask.recurrence,
        completedAt: editingTask.completedAt,
      });
    } else {
      setFormData(createEmptyTask());
    }
  }, [editingTask, taskModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    try {
      if (editingTask) {
        await updateTask(editingTask.id, formData);
        toast.success('Task updated!');
      } else {
        await addTask(formData);
        toast.success('Task created!');
      }
      closeTaskModal();
    } catch (error) {
      toast.error('Failed to save task');
    }
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      if (editingTask) {
        addSubtask(editingTask.id, newSubtaskTitle.trim());
      } else {
        setFormData({
          ...formData,
          subtasks: [
            ...formData.subtasks,
            { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false },
          ],
        });
      }
      setNewSubtaskTitle('');
    }
  };

  const handleRemoveSubtask = (subtaskId: string) => {
    if (editingTask) {
      deleteSubtask(editingTask.id, subtaskId);
    } else {
      setFormData({
        ...formData,
        subtasks: formData.subtasks.filter((st) => st.id !== subtaskId),
      });
    }
  };

  const handleAddAttachment = () => {
    if (newAttachmentUrl.trim()) {
      try {
        new URL(newAttachmentUrl);
        setFormData({
          ...formData,
          attachments: [...formData.attachments, newAttachmentUrl.trim()],
        });
        setNewAttachmentUrl('');
      } catch {
        toast.error('Please enter a valid URL');
      }
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

  const toggleTag = (tagId: string) => {
    setFormData({
      ...formData,
      tagIds: formData.tagIds.includes(tagId)
        ? formData.tagIds.filter((id) => id !== tagId)
        : [...formData.tagIds, tagId],
    });
  };

  if (!taskModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h2>
            <button
              onClick={closeTaskModal}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input min-h-[100px] resize-y"
              placeholder="Add more details..."
            />
          </div>

          {/* Project & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                value={formData.projectId || ''}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value || null })}
                className="input"
              >
                <option value="">No Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                className="input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Due Date & Recurrence Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.dueDate ? formData.dueDate.split('T')[0] : ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dueDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
              <select
                value={formData.recurrence}
                onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as RecurrenceType })}
                className="input"
              >
                <option value="none">No Repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`tag transition-all ${
                    formData.tagIds.includes(tag.id) ? 'ring-2 ring-offset-1' : ''
                  }`}
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </button>
              ))}
              {tags.length === 0 && (
                <span className="text-sm text-gray-400">No tags yet. Create tags from the sidebar.</span>
              )}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subtasks</label>
            <div className="space-y-2 mb-2">
              {formData.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className="flex-1 text-sm">{subtask.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(subtask.id)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                className="input flex-1"
                placeholder="Add a subtask..."
              />
              <button type="button" onClick={handleAddSubtask} className="btn-secondary">
                Add
              </button>
            </div>
          </div>

          {/* Attachments (URLs) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attachments (URLs)</label>
            <div className="space-y-2 mb-2">
              {formData.attachments.map((url, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-primary-600 hover:underline truncate"
                  >
                    {url}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(index)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={newAttachmentUrl}
                onChange={(e) => setNewAttachmentUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttachment())}
                className="input flex-1"
                placeholder="https://..."
              />
              <button type="button" onClick={handleAddAttachment} className="btn-secondary">
                Add
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={closeTaskModal} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
