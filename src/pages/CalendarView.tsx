import React, { useState, useMemo } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isToday,
    parseISO,
} from 'date-fns';
import { useTaskStore } from '../store';
import type { Task } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface CalendarViewProps {
    onClose: () => void;
    onTaskClick: (task: Task) => void;
}

export function CalendarView({ onClose, onTaskClick }: CalendarViewProps) {
    const { tasks } = useTaskStore();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const days: Date[] = [];
        let day = startDate;
        while (day <= endDate) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    }, [currentMonth]);

    // Get tasks for a specific date
    const getTasksForDate = (date: Date): Task[] => {
        return tasks.filter((task) => {
            if (!task.dueDate) return false;
            return isSameDay(parseISO(task.dueDate), date);
        });
    };

    // Tasks for selected date
    const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const priorityColors = {
        high: 'bg-red-500',
        medium: 'bg-orange-500',
        low: 'bg-emerald-500',
    };

    return (
        <div className={`min-h-screen ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
            {/* Header - Responsive */}
            <header className={`sticky top-0 z-50 px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 sm:gap-6">
                        <button
                            onClick={onClose}
                            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 font-bold text-xs sm:text-sm uppercase tracking-wide transition-all ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="hidden sm:inline">Back</span>
                        </button>
                        <div>
                            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-0.5 sm:mb-1">Calendar</p>
                            <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                {format(currentMonth, 'MMMM yyyy')}
                            </h1>
                        </div>
                    </div>

                    {/* Month Navigation */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-all ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'}`}
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setCurrentMonth(new Date())}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500 text-white font-bold text-xs sm:text-sm uppercase hover:bg-orange-600 transition-all"
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-all ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'}`}
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-8 flex flex-col lg:flex-row gap-4 sm:gap-6 md:gap-8">
                {/* Calendar Grid */}
                <div className="flex-1 order-2 lg:order-1">
                    {/* Week day headers */}
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                        {weekDays.map((day) => (
                            <div
                                key={day}
                                className={`py-1.5 sm:py-3 text-center text-[10px] sm:text-sm font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
                            >
                                <span className="hidden sm:inline">{day}</span>
                                <span className="sm:hidden">{day.slice(0, 1)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                        {calendarDays.map((day, idx) => {
                            const dayTasks = getTasksForDate(day);
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isTodayDate = isToday(day);

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(day)}
                                    className={`min-h-[50px] sm:min-h-[80px] md:min-h-[100px] p-1 sm:p-2 text-left transition-all border ${isSelected
                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                        : isDark
                                            ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800'
                                            : 'border-zinc-100 hover:border-zinc-200 bg-white hover:bg-zinc-50'
                                        } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                                >
                                    <div className="flex items-center justify-between mb-0.5 sm:mb-2">
                                        <span
                                            className={`w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 flex items-center justify-center text-[10px] sm:text-xs md:text-sm font-bold ${isTodayDate
                                                ? 'bg-orange-500 text-white rounded-full'
                                                : isDark
                                                    ? 'text-zinc-300'
                                                    : 'text-zinc-700'
                                                }`}
                                        >
                                            {format(day, 'd')}
                                        </span>
                                        {dayTasks.length > 0 && (
                                            <span className={`text-[9px] sm:text-xs font-bold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                {dayTasks.length}
                                            </span>
                                        )}
                                    </div>

                                    {/* Task indicators - Hidden on mobile */}
                                    <div className="hidden sm:block space-y-1">
                                        {dayTasks.slice(0, 2).map((task) => (
                                            <div
                                                key={task.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onTaskClick(task);
                                                }}
                                                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-xs font-medium truncate cursor-pointer transition-all ${task.status === 'completed'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 line-through'
                                                    : isDark
                                                        ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
                                                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                                                    }`}
                                            >
                                                <span className={`inline-block w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full mr-1 ${priorityColors[task.priority]}`} />
                                                {task.title}
                                            </div>
                                        ))}
                                        {dayTasks.length > 2 && (
                                            <div className={`text-[9px] sm:text-xs font-bold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                +{dayTasks.length - 2} more
                                            </div>
                                        )}
                                    </div>

                                    {/* Mobile task indicator - dots only */}
                                    <div className="sm:hidden flex gap-0.5 mt-1">
                                        {dayTasks.slice(0, 3).map((task) => (
                                            <span key={task.id} className={`w-1.5 h-1.5 rounded-full ${priorityColors[task.priority]}`} />
                                        ))}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Date Panel */}
                <div className={`w-full lg:w-72 xl:w-80 flex-shrink-0 order-1 lg:order-2 ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'} p-4 sm:p-6`}>
                    {selectedDate ? (
                        <>
                            <div className="mb-6">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-1">
                                    {format(selectedDate, 'EEEE')}
                                </p>
                                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                    {format(selectedDate, 'MMMM d, yyyy')}
                                </h2>
                            </div>

                            {selectedDateTasks.length > 0 ? (
                                <div className="space-y-3">
                                    <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-4`}>
                                        {selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? 's' : ''}
                                    </p>
                                    {selectedDateTasks.map((task) => (
                                        <button
                                            key={task.id}
                                            onClick={() => onTaskClick(task)}
                                            className={`w-full text-left p-4 transition-all border-l-4 ${task.status === 'completed'
                                                ? 'border-l-emerald-500 opacity-60'
                                                : task.priority === 'high'
                                                    ? 'border-l-red-500'
                                                    : task.priority === 'medium'
                                                        ? 'border-l-orange-500'
                                                        : 'border-l-emerald-500'
                                                } ${isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-white hover:bg-zinc-100'}`}
                                        >
                                            <h3 className={`font-bold ${task.status === 'completed' ? 'line-through' : ''} ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                                {task.title}
                                            </h3>
                                            {task.notes && (
                                                <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                    {task.notes}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${task.priority === 'high'
                                                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                    : task.priority === 'medium'
                                                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                                                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    }`}>
                                                    {task.priority}
                                                </span>
                                                {task.status === 'completed' && (
                                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        Done
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className={`w-16 h-16 mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'} rounded-full`}>
                                        <svg className={`w-8 h-8 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <p className={`font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>No tasks</p>
                                    <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>for this day</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <div className={`w-16 h-16 mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'} rounded-full`}>
                                <svg className={`w-8 h-8 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                </svg>
                            </div>
                            <p className={`font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Select a date</p>
                            <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>to view tasks</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
