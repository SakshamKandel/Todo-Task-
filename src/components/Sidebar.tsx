import { useState } from 'react';
import { useProjectStore, useTagStore, useFilterStore, useUIStore, useTaskStore } from '../store';
import { isToday, isBefore, startOfDay, parseISO, isThisWeek } from 'date-fns';

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, openLeaderboard } = useUIStore();
  const projects = useProjectStore((state) => state.projects);
  const { addProject, deleteProject } = useProjectStore();
  const tags = useTagStore((state) => state.tags);
  const { addTag, deleteTag } = useTagStore();
  const tasks = useTaskStore((state) => state.tasks);

  const {
    status,
    setStatus,
    projectId,
    setProjectId,
    tagIds,
    toggleTagId,
    dueDateFilter,
    setDueDateFilter,
    resetFilters,
  } = useFilterStore();

  const [newProjectName, setNewProjectName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [showProjectInput, setShowProjectInput] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);

  // Count tasks
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const today = startOfDay(new Date());
  const todayCount = tasks.filter((t) => t.dueDate && isToday(parseISO(t.dueDate)) && t.status === 'pending').length;
  const overdueCount = tasks.filter((t) => t.dueDate && isBefore(parseISO(t.dueDate), today) && t.status === 'pending').length;
  const weekCount = tasks.filter((t) => t.dueDate && isThisWeek(parseISO(t.dueDate), { weekStartsOn: 1 }) && t.status === 'pending').length;

  const handleAddProject = async () => {
    if (newProjectName.trim()) {
      await addProject(newProjectName.trim());
      setNewProjectName('');
      setShowProjectInput(false);
    }
  };

  const handleAddTag = async () => {
    if (newTagName.trim()) {
      await addTag(newTagName.trim());
      setNewTagName('');
      setShowTagInput(false);
    }
  };

  const getTaskCountForProject = (projId: string) => {
    return tasks.filter((t) => t.projectId === projId && t.status === 'pending').length;
  };

  const getTaskCountForTag = (tId: string) => {
    return tasks.filter((t) => t.tagIds.includes(tId) && t.status === 'pending').length;
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } flex flex-col h-[calc(100vh-57px)] overflow-y-auto`}
      >
        <div className="p-4 space-y-6 flex-1">
          {/* Leaderboard Button */}
          <button
            onClick={() => { openLeaderboard(); setSidebarOpen(false); }}
            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white shadow-lg shadow-orange-200 transform transition-all hover:scale-[1.02] active:scale-95"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🏆</span>
              <span className="font-bold">Leaderboard</span>
            </div>
            <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Quick Filters */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Quick Filters
            </h3>
            <nav className="space-y-1">
              <button
                onClick={() => { resetFilters(); setSidebarOpen(false); }}
                className={`sidebar-item w-full ${status === 'all' && !projectId && dueDateFilter === 'all' ? 'active' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>All Tasks</span>
                <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">{pendingCount}</span>
              </button>

              <button
                onClick={() => { setDueDateFilter('today'); setStatus('pending'); setSidebarOpen(false); }}
                className={`sidebar-item w-full ${dueDateFilter === 'today' ? 'active' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Today</span>
                <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">{todayCount}</span>
              </button>

              <button
                onClick={() => { setDueDateFilter('week'); setStatus('pending'); setSidebarOpen(false); }}
                className={`sidebar-item w-full ${dueDateFilter === 'week' ? 'active' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>This Week</span>
                <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">{weekCount}</span>
              </button>

              <button
                onClick={() => { setDueDateFilter('overdue'); setStatus('pending'); setSidebarOpen(false); }}
                className={`sidebar-item w-full ${dueDateFilter === 'overdue' ? 'active' : ''}`}
              >
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-600">Overdue</span>
                <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{overdueCount}</span>
              </button>

              <button
                onClick={() => { setStatus('completed'); setDueDateFilter('all'); setSidebarOpen(false); }}
                className={`sidebar-item w-full ${status === 'completed' ? 'active' : ''}`}
              >
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Completed</span>
                <span className="ml-auto text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">{completedCount}</span>
              </button>
            </nav>
          </div>

          {/* Projects */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Projects
              </h3>
              <button
                onClick={() => setShowProjectInput(true)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {showProjectInput && (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
                  placeholder="Project name"
                  className="input text-sm py-1"
                  autoFocus
                />
                <button onClick={handleAddProject} className="btn-primary py-1 px-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            )}

            <nav className="space-y-1">
              {projects.map((project) => (
                <div key={project.id} className="group flex items-center">
                  <button
                    onClick={() => { setProjectId(project.id); setStatus('all'); setDueDateFilter('all'); setSidebarOpen(false); }}
                    className={`sidebar-item flex-1 ${projectId === project.id ? 'active' : ''}`}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                    <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      {getTaskCountForProject(project.id)}
                    </span>
                  </button>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-all"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </nav>
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tags
              </h3>
              <button
                onClick={() => setShowTagInput(true)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {showTagInput && (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Tag name"
                  className="input text-sm py-1"
                  autoFocus
                />
                <button onClick={handleAddTag} className="btn-primary py-1 px-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div key={tag.id} className="group flex items-center">
                  <button
                    onClick={() => toggleTagId(tag.id)}
                    className={`tag transition-all ${tagIds.includes(tag.id)
                        ? 'ring-2 ring-offset-1'
                        : ''
                      }`}
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                      borderColor: tag.color,
                    }}
                  >
                    {tag.name}
                    <span className="ml-1 text-xs opacity-70">{getTaskCountForTag(tag.id)}</span>
                  </button>
                  <button
                    onClick={() => deleteTag(tag.id)}
                    className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-all ml-1"
                  >
                    <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
