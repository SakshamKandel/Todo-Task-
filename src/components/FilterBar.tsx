import { useFilterStore } from '../store';
import type { SortOption, Priority } from '../types';

export function FilterBar() {
  const {
    status,
    setStatus,
    priority,
    setPriority,
    sortBy,
    setSortBy,
    resetFilters,
  } = useFilterStore();

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white border-b border-gray-200">
      {/* Status filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Status:</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'all' | 'pending' | 'completed')}
          className="input py-1 px-2 w-auto text-sm"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Priority filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Priority:</label>
        <select
          value={priority || ''}
          onChange={(e) => setPriority(e.target.value ? (e.target.value as Priority) : null)}
          className="input py-1 px-2 w-auto text-sm"
        >
          <option value="">All</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Sort:</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="input py-1 px-2 w-auto text-sm"
        >
          <option value="manual">Manual</option>
          <option value="dueDate">Due Date</option>
          <option value="priority">Priority</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* Reset */}
      <button
        onClick={resetFilters}
        className="btn-ghost py-1 px-3 text-sm"
      >
        Reset Filters
      </button>
    </div>
  );
}
