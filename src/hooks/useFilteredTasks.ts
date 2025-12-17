import { useMemo } from 'react';
import { useTaskStore, useFilterStore } from '../store';
import type { Task } from '../types';
import { isToday, isThisWeek, isBefore, startOfDay, parseISO } from 'date-fns';

export function useFilteredTasks(): Task[] {
  const tasks = useTaskStore((state) => state.tasks);
  const {
    status,
    projectId,
    tagIds,
    priority,
    dueDateFilter,
    searchQuery,
    sortBy,
  } = useFilterStore();

  return useMemo(() => {
    let filtered = [...tasks];

    // Filter by status
    if (status !== 'all') {
      filtered = filtered.filter((task) => task.status === status);
    }

    // Filter by project
    if (projectId) {
      filtered = filtered.filter((task) => task.projectId === projectId);
    }

    // Filter by tags
    if (tagIds.length > 0) {
      filtered = filtered.filter((task) =>
        tagIds.some((tagId) => task.tagIds.includes(tagId))
      );
    }

    // Filter by priority
    if (priority) {
      filtered = filtered.filter((task) => task.priority === priority);
    }

    // Filter by due date
    if (dueDateFilter !== 'all') {
      const today = startOfDay(new Date());
      filtered = filtered.filter((task) => {
        if (!task.dueDate) {
          return dueDateFilter === 'noDate';
        }
        const dueDate = parseISO(task.dueDate);
        switch (dueDateFilter) {
          case 'today':
            return isToday(dueDate);
          case 'week':
            return isThisWeek(dueDate, { weekStartsOn: 1 });
          case 'overdue':
            return isBefore(dueDate, today) && task.status === 'pending';
          case 'noDate':
            return false;
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.notes.toLowerCase().includes(query)
      );
    }

    // Sort tasks
    switch (sortBy) {
      case 'dueDate':
        filtered.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
      case 'priority':
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        break;
      case 'newest':
        filtered.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'manual':
      default:
        filtered.sort((a, b) => a.order - b.order);
        break;
    }

    return filtered;
  }, [tasks, status, projectId, tagIds, priority, dueDateFilter, searchQuery, sortBy]);
}
