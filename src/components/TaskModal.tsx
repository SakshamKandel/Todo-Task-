import { useState, useEffect } from 'react';
import { useTaskStore, useProjectStore, useTagStore, useUIStore, createEmptyTask } from '../store';
import type { Task, Priority, RecurrenceType, AmazonTaskItem } from '../types';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import FileUpload from './FileUpload';
import TaskComments from './TaskComments';
import AmazonTaskSelector from './AmazonTaskSelector';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Team, Profile } from '../lib/database.types';

export function TaskModal() {
  const { taskModalOpen, closeTaskModal, editingTaskId } = useUIStore();
  const tasks = useTaskStore((state) => state.tasks);
  const { addTask, updateTask, addSubtask, deleteSubtask } = useTaskStore();
  const projects = useProjectStore((state) => state.projects);
  const tags = useTagStore((state) => state.tags);
  const { user, isRole } = useAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);

  const editingTask = editingTaskId ? tasks.find((t) => t.id === editingTaskId) : null;
  const [draftId, setDraftId] = useState(() => uuidv4());

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
        teamId: editingTask.teamId || null,
        assignedTo: editingTask.assignedTo || null,
        createdBy: editingTask.createdBy || null,
        isAmazon: editingTask.isAmazon || false,
        amazonTasks: editingTask.amazonTasks || [],
      });
    } else {
      setFormData(createEmptyTask());
      setDraftId(uuidv4());
      setTeamMembers([]);
    }
  }, [taskModalOpen, editingTask]);

  useEffect(() => {
    if (user && (isRole('admin') || isRole('superadmin'))) {
      supabase.from('teams').select('*').then(({ data }) => {
        if (data) setTeams(data);
      });
    }
  }, [user, isRole]);

  const loadTeamMembers = async (teamId: string) => {
    const { data } = await supabase
      .from('team_members')
      .select('user_id, profile:profiles(*)')
      .eq('team_id', teamId);

    if (data) {
      const members = data.map((m: any) => m.profile).filter(Boolean) as Profile[];
      setTeamMembers(members);
    }
  };

  useEffect(() => {
    if (editingTask?.teamId) {
      loadTeamMembers(editingTask.teamId);
    }
  }, [editingTask]);

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
        await addTask({ ...formData, id: draftId });
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



  const toggleTag = (tagId: string) => {
    setFormData({
      ...formData,
      tagIds: formData.tagIds.includes(tagId)
        ? formData.tagIds.filter((id) => id !== tagId)
        : [...formData.tagIds, tagId],
    });
  };

  console.log("TaskModal Rendering - Attachments:", formData.attachments);

  if (!taskModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9998]">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white px-8 py-6 border-b border-zinc-100 flex justify-between items-center z-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-1">
              {editingTask ? 'Editing' : 'Create'}
            </p>
            <h2 className="text-3xl font-bold text-zinc-900 uppercase tracking-tight">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h2>
          </div>
          <button
            onClick={closeTaskModal}
            className="w-12 h-12 flex items-center justify-center bg-zinc-100 text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-zinc-50">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-white border-l-4 border-l-transparent focus:border-l-orange-500 border border-zinc-200 text-base font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all"
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-white border-l-4 border-l-transparent focus:border-l-orange-500 border border-zinc-200 text-base font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all min-h-[100px] resize-y"
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

          {/* Team Assignment Section */}
          {(isRole('superadmin') || isRole('admin')) && teams.length > 0 && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <div>
                <label className="text-xs font-bold text-blue-600 uppercase tracking-wider pl-1 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Team
                </label>
                <div className="relative mt-2">
                  <select
                    value={formData.teamId || ''}
                    onChange={(e) => {
                      const teamId = e.target.value || null;
                      setFormData({ ...formData, teamId, assignedTo: null });
                      if (teamId) loadTeamMembers(teamId);
                      else setTeamMembers([]);
                    }}
                    className="input appearance-none cursor-pointer hover:ring-1 hover:ring-blue-200 pl-4 pr-10 bg-white"
                  >
                    <option value="">No Team</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-blue-600 uppercase tracking-wider pl-1 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Assign To
                </label>
                <div className="relative mt-2">
                  <select
                    value={formData.assignedTo || ''}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value || null })}
                    className="input appearance-none cursor-pointer hover:ring-1 hover:ring-blue-200 pl-4 pr-10 bg-white"
                    disabled={!formData.teamId}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`tag transition-all ${formData.tagIds.includes(tag.id) ? 'ring-2 ring-offset-1' : ''
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

          {/* Amazon Task Selector */}
          <div className="border-t border-gray-100 pt-6">
            <AmazonTaskSelector
              isAmazon={formData.isAmazon || false}
              amazonTasks={formData.amazonTasks || []}
              onAmazonChange={(isAmazon) => setFormData(prev => ({ ...prev, isAmazon }))}
              onTasksChange={(amazonTasks) => setFormData(prev => ({ ...prev, amazonTasks }))}
            />
          </div>

          {/* Files & Links */}
          <div className="space-y-6">
            <FileUpload
              taskId={editingTask ? editingTask.id : draftId}
              attachments={formData.attachments.filter(a => a.includes('task-attachments') || !a.startsWith('http'))}

              onAttachmentsChange={(newFiles) => {
                const otherLinks = formData.attachments.filter(a => a.startsWith('http') && !a.includes('task-attachments'));
                setFormData({ ...formData, attachments: [...otherLinks, ...newFiles] });
              }}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">External Links</label>
              <div className="space-y-2 mb-2">
                {formData.attachments
                  .filter(a => a.startsWith('http') && !a.includes('task-attachments'))
                  .map((url, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
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
                        onClick={() => {
                          const newAttachments = formData.attachments.filter(a => a !== url);
                          setFormData({ ...formData, attachments: newAttachments });
                        }}
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
                  Add Link
                </button>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          {editingTask && (
            <div className="pt-4 border-t border-gray-200">
              <TaskComments taskId={editingTask.id} />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t border-zinc-200 bg-white -mx-8 px-8 -mb-8 pb-8 mt-8">
            <button type="button" onClick={closeTaskModal} className="h-12 px-6 bg-zinc-100 text-zinc-700 font-bold text-sm uppercase tracking-wider hover:bg-zinc-200 transition-all">
              Cancel
            </button>
            <button type="submit" className="h-12 px-8 bg-zinc-900 text-white font-bold text-sm uppercase tracking-wider hover:bg-orange-500 transition-all">
              {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
