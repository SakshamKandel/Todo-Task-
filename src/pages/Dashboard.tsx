import React, { useMemo } from 'react';
import { useTaskStore, useProjectStore } from '../store';
import { useTheme } from '../contexts/ThemeContext';
import {
    format,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    parseISO,
    isWithinInterval,
    subDays,
} from 'date-fns';

interface DashboardProps {
    onClose: () => void;
}

export function Dashboard({ onClose }: DashboardProps) {
    const { tasks } = useTaskStore();
    const { projects } = useProjectStore();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    // Calculate statistics
    const stats = useMemo(() => {
        const today = new Date();
        const weekStart = startOfWeek(today);
        const weekEnd = endOfWeek(today);
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);

        const completedTasks = tasks.filter(t => t.status === 'completed');
        const pendingTasks = tasks.filter(t => t.status === 'pending');

        // Tasks completed this week
        const completedThisWeek = completedTasks.filter(t => {
            if (!t.updatedAt) return false;
            const date = parseISO(t.updatedAt);
            return isWithinInterval(date, { start: weekStart, end: weekEnd });
        }).length;

        // Tasks completed this month
        const completedThisMonth = completedTasks.filter(t => {
            if (!t.updatedAt) return false;
            const date = parseISO(t.updatedAt);
            return isWithinInterval(date, { start: monthStart, end: monthEnd });
        }).length;

        // Overdue tasks
        const overdueTasks = pendingTasks.filter(t => {
            if (!t.dueDate) return false;
            return parseISO(t.dueDate) < today;
        }).length;

        // Completion rate
        const completionRate = tasks.length > 0
            ? Math.round((completedTasks.length / tasks.length) * 100)
            : 0;

        // Tasks by priority
        const highPriority = pendingTasks.filter(t => t.priority === 'high').length;
        const mediumPriority = pendingTasks.filter(t => t.priority === 'medium').length;
        const lowPriority = pendingTasks.filter(t => t.priority === 'low').length;

        // Daily activity for the last 7 days
        const last7Days = eachDayOfInterval({
            start: subDays(today, 6),
            end: today,
        });

        const dailyActivity = last7Days.map(day => {
            const dayStart = new Date(day.setHours(0, 0, 0, 0));
            const dayEnd = new Date(day.setHours(23, 59, 59, 999));
            const count = completedTasks.filter(t => {
                if (!t.updatedAt) return false;
                const date = parseISO(t.updatedAt);
                return isWithinInterval(date, { start: dayStart, end: dayEnd });
            }).length;
            return { day: format(day, 'EEE'), count };
        });

        // Tasks by project
        const tasksByProject = projects.map(project => ({
            name: project.name,
            color: project.color,
            count: tasks.filter(t => t.projectId === project.id).length,
            completed: tasks.filter(t => t.projectId === project.id && t.status === 'completed').length,
        }));

        return {
            total: tasks.length,
            completed: completedTasks.length,
            pending: pendingTasks.length,
            completedThisWeek,
            completedThisMonth,
            overdueTasks,
            completionRate,
            highPriority,
            mediumPriority,
            lowPriority,
            dailyActivity,
            tasksByProject,
        };
    }, [tasks, projects]);

    return (
        <div className={`min-h-screen ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
            {/* Header */}
            <header className={`sticky top-0 z-50 px-8 py-6 border-b ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={onClose}
                            className={`flex items-center gap-2 px-4 py-2 font-bold text-sm uppercase tracking-wide transition-all ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-1">Analytics</p>
                            <h1 className={`text-3xl font-bold uppercase tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                Productivity Dashboard
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {/* Total Tasks */}
                    <div className={`p-6 ${isDark ? 'bg-zinc-800' : 'bg-white'}`}>
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-2`}>Total Tasks</p>
                        <p className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{stats.total}</p>
                    </div>

                    {/* Completed */}
                    <div className={`p-6 ${isDark ? 'bg-zinc-800' : 'bg-white'} border-l-4 border-l-emerald-500`}>
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-2`}>Completed</p>
                        <p className="text-4xl font-bold text-emerald-500">{stats.completed}</p>
                    </div>

                    {/* Pending */}
                    <div className={`p-6 ${isDark ? 'bg-zinc-800' : 'bg-white'} border-l-4 border-l-orange-500`}>
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-2`}>Pending</p>
                        <p className="text-4xl font-bold text-orange-500">{stats.pending}</p>
                    </div>

                    {/* Overdue */}
                    <div className={`p-6 ${isDark ? 'bg-zinc-800' : 'bg-white'} border-l-4 border-l-red-500`}>
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-2`}>Overdue</p>
                        <p className="text-4xl font-bold text-red-500">{stats.overdueTasks}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8">
                    {/* Completion Rate */}
                    <div className={`p-6 ${isDark ? 'bg-zinc-800' : 'bg-white'}`}>
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-4`}>Completion Rate</p>
                        <div className="flex items-center justify-center">
                            <div className="relative w-32 h-32">
                                <svg className="w-32 h-32 transform -rotate-90">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        fill="none"
                                        strokeWidth="12"
                                        className={isDark ? 'stroke-zinc-700' : 'stroke-zinc-100'}
                                    />
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        fill="none"
                                        strokeWidth="12"
                                        className="stroke-orange-500"
                                        strokeLinecap="round"
                                        strokeDasharray={2 * Math.PI * 56}
                                        strokeDashoffset={2 * Math.PI * 56 * (1 - stats.completionRate / 100)}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{stats.completionRate}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* This Week */}
                    <div className={`p-6 ${isDark ? 'bg-zinc-800' : 'bg-white'}`}>
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-4`}>This Week</p>
                        <p className={`text-5xl font-bold text-orange-500 mb-2`}>{stats.completedThisWeek}</p>
                        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>tasks completed</p>
                    </div>

                    {/* This Month */}
                    <div className={`p-6 ${isDark ? 'bg-zinc-800' : 'bg-white'}`}>
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-4`}>This Month</p>
                        <p className={`text-5xl font-bold text-emerald-500 mb-2`}>{stats.completedThisMonth}</p>
                        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>tasks completed</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Daily Activity Chart */}
                    <div className={`p-6 ${isDark ? 'bg-zinc-800' : 'bg-white'}`}>
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-6`}>Daily Activity (Last 7 Days)</p>
                        <div className="flex items-end justify-between h-40 gap-2">
                            {stats.dailyActivity.map((day, idx) => {
                                const maxCount = Math.max(...stats.dailyActivity.map(d => d.count), 1);
                                const height = (day.count / maxCount) * 100;
                                return (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                        <div className="w-full relative" style={{ height: '120px' }}>
                                            <div
                                                className="absolute bottom-0 w-full bg-orange-500 transition-all duration-500"
                                                style={{ height: `${Math.max(height, 5)}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-bold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{day.day}</span>
                                        <span className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>{day.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Priority Breakdown */}
                    <div className={`p-6 ${isDark ? 'bg-zinc-800' : 'bg-white'}`}>
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-6`}>Pending by Priority</p>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>High Priority</span>
                                    <span className="text-sm font-bold text-red-500">{stats.highPriority}</span>
                                </div>
                                <div className={`h-3 ${isDark ? 'bg-zinc-700' : 'bg-zinc-100'}`}>
                                    <div
                                        className="h-full bg-red-500 transition-all duration-500"
                                        style={{ width: `${(stats.highPriority / Math.max(stats.pending, 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Medium Priority</span>
                                    <span className="text-sm font-bold text-orange-500">{stats.mediumPriority}</span>
                                </div>
                                <div className={`h-3 ${isDark ? 'bg-zinc-700' : 'bg-zinc-100'}`}>
                                    <div
                                        className="h-full bg-orange-500 transition-all duration-500"
                                        style={{ width: `${(stats.mediumPriority / Math.max(stats.pending, 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Low Priority</span>
                                    <span className="text-sm font-bold text-emerald-500">{stats.lowPriority}</span>
                                </div>
                                <div className={`h-3 ${isDark ? 'bg-zinc-700' : 'bg-zinc-100'}`}>
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-500"
                                        style={{ width: `${(stats.lowPriority / Math.max(stats.pending, 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tasks by Project */}
                {stats.tasksByProject.length > 0 && (
                    <div className={`p-6 mt-6 ${isDark ? 'bg-zinc-800' : 'bg-white'}`}>
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-6`}>Tasks by Project</p>
                        <div className="grid grid-cols-3 gap-4">
                            {stats.tasksByProject.map((project, idx) => (
                                <div key={idx} className={`p-4 ${isDark ? 'bg-zinc-700' : 'bg-zinc-50'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                                        <span className={`font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{project.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{project.count}</span>
                                        <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                            {project.completed} completed
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
