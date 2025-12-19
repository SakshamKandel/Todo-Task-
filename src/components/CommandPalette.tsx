import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTaskStore, useProjectStore, useUIStore, useFilterStore } from '../store';
import { useTheme } from '../contexts/ThemeContext';
import type { Task, Project } from '../types';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onNewTask: () => void;
    onOpenCalendar: () => void;
    onOpenSettings: () => void;
    onOpenLeaderboard: () => void;
}

interface CommandItem {
    id: string;
    label: string;
    description?: string;
    icon: React.ReactNode;
    action: () => void;
    category: 'action' | 'navigation' | 'task' | 'project';
    shortcut?: string;
}

export function CommandPalette({
    isOpen,
    onClose,
    onNewTask,
    onOpenCalendar,
    onOpenSettings,
    onOpenLeaderboard,
}: CommandPaletteProps) {
    const { tasks } = useTaskStore();
    const { projects } = useProjectStore();
    const { openTaskDetail } = useUIStore();
    const { setProjectId, setSearchQuery } = useFilterStore();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Close on escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((i) => Math.max(i - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredItems[selectedIndex]) {
                        filteredItems[selectedIndex].action();
                        onClose();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex]);

    // Icons
    const icons = {
        plus: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
        ),
        calendar: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        settings: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        trophy: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15l-2 5m4-5l2 5M5 12h14M7.5 12a4.5 4.5 0 019 0M6 12V8a6 6 0 0112 0v4" />
            </svg>
        ),
        task: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        folder: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
        ),
        search: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
    };

    // Build command list
    const allItems: CommandItem[] = useMemo(() => {
        const items: CommandItem[] = [
            // Actions
            {
                id: 'new-task',
                label: 'Create New Task',
                description: 'Add a new task to your list',
                icon: icons.plus,
                action: onNewTask,
                category: 'action',
                shortcut: '⌘N',
            },
            {
                id: 'calendar',
                label: 'Open Calendar',
                description: 'View tasks on calendar',
                icon: icons.calendar,
                action: onOpenCalendar,
                category: 'navigation',
            },
            {
                id: 'leaderboard',
                label: 'View Leaderboard',
                description: 'See team rankings',
                icon: icons.trophy,
                action: onOpenLeaderboard,
                category: 'navigation',
            },
            {
                id: 'settings',
                label: 'Open Settings',
                description: 'Manage your account',
                icon: icons.settings,
                action: onOpenSettings,
                category: 'navigation',
                shortcut: '⌘,',
            },
        ];

        // Add projects
        projects.forEach((project) => {
            items.push({
                id: `project-${project.id}`,
                label: project.name,
                description: 'Go to project',
                icon: icons.folder,
                action: () => setProjectId(project.id),
                category: 'project',
            });
        });

        // Add recent tasks (up to 10)
        tasks.slice(0, 10).forEach((task) => {
            items.push({
                id: `task-${task.id}`,
                label: task.title,
                description: task.status === 'completed' ? 'Completed' : 'Pending',
                icon: icons.task,
                action: () => openTaskDetail(task.id),
                category: 'task',
            });
        });

        return items;
    }, [tasks, projects, onNewTask, onOpenCalendar, onOpenSettings, onOpenLeaderboard]);

    // Filter items based on query
    const filteredItems = useMemo(() => {
        if (!query.trim()) {
            return allItems.slice(0, 10); // Show first 10 when no query
        }
        const lowerQuery = query.toLowerCase();
        return allItems
            .filter(
                (item) =>
                    item.label.toLowerCase().includes(lowerQuery) ||
                    item.description?.toLowerCase().includes(lowerQuery)
            )
            .slice(0, 15);
    }, [allItems, query]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`relative w-full max-w-xl overflow-hidden shadow-2xl ${isDark ? 'bg-zinc-900' : 'bg-white'
                    }`}
                style={{ animation: 'scaleIn 0.15s ease-out' }}
            >
                {/* Search Input */}
                <div className={`flex items-center gap-4 px-6 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
                    <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>{icons.search}</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Search commands, tasks, projects..."
                        className={`flex-1 bg-transparent text-lg font-medium outline-none placeholder:text-zinc-400 ${isDark ? 'text-white' : 'text-zinc-900'
                            }`}
                    />
                    <kbd className={`px-2 py-1 text-xs font-bold ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
                    {filteredItems.length === 0 ? (
                        <div className={`py-12 text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            <p className="font-medium">No results found</p>
                            <p className="text-sm">Try a different search term</p>
                        </div>
                    ) : (
                        filteredItems.map((item, idx) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    item.action();
                                    onClose();
                                }}
                                onMouseEnter={() => setSelectedIndex(idx)}
                                className={`w-full flex items-center gap-4 px-4 py-3 transition-all ${idx === selectedIndex
                                        ? isDark
                                            ? 'bg-orange-500/20 text-orange-400'
                                            : 'bg-orange-50 text-orange-600'
                                        : isDark
                                            ? 'hover:bg-zinc-800 text-zinc-300'
                                            : 'hover:bg-zinc-50 text-zinc-700'
                                    }`}
                            >
                                <span className={idx === selectedIndex ? 'text-orange-500' : isDark ? 'text-zinc-500' : 'text-zinc-400'}>
                                    {item.icon}
                                </span>
                                <div className="flex-1 text-left">
                                    <div className="font-semibold">{item.label}</div>
                                    {item.description && (
                                        <div className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            {item.description}
                                        </div>
                                    )}
                                </div>
                                {item.shortcut && (
                                    <kbd className={`px-2 py-0.5 text-xs font-bold ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                                        {item.shortcut}
                                    </kbd>
                                )}
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-3 border-t flex items-center gap-6 text-xs ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-100 text-zinc-400'}`}>
                    <span className="flex items-center gap-1">
                        <kbd className={`px-1.5 py-0.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>↑↓</kbd>
                        Navigate
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className={`px-1.5 py-0.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>↵</kbd>
                        Select
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className={`px-1.5 py-0.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>esc</kbd>
                        Close
                    </span>
                </div>
            </div>

            <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
        </div>
    );
}

// Hook for global keyboard shortcut
export function useCommandPalette() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+K or Ctrl+K to open
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((prev) => !prev),
    };
}
