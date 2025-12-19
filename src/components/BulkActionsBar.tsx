import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface BulkActionsBarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onSelectNone: () => void;
    onDelete: () => void;
    onToggleStatus: () => void;
    onClose: () => void;
    hasCompletedSelected: boolean;
}

export function BulkActionsBar({
    selectedCount,
    totalCount,
    onSelectAll,
    onSelectNone,
    onDelete,
    onToggleStatus,
    onClose,
    hasCompletedSelected,
}: BulkActionsBarProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    if (selectedCount === 0) return null;

    return (
        <div
            className={`fixed bottom-4 sm:bottom-6 left-2 right-2 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 z-50 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 shadow-2xl ${isDark ? 'bg-zinc-800' : 'bg-white'
                }`}
        >
            {/* Top row on mobile: Selection Info */}
            <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
                <span className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {selectedCount} of {totalCount}
                </span>
                <div className="flex items-center gap-2 border-l border-zinc-300 dark:border-zinc-600 pl-3 sm:pl-4">
                    <button
                        onClick={onSelectAll}
                        className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-all ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                    >
                        All
                    </button>
                    <span className={isDark ? 'text-zinc-600' : 'text-zinc-300'}>|</span>
                    <button
                        onClick={onSelectNone}
                        className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-all ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                    >
                        None
                    </button>
                </div>

                {/* Close button on mobile - visible only on small screens */}
                <button
                    onClick={onClose}
                    className={`sm:hidden w-7 h-7 flex items-center justify-center transition-all ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Divider - hidden on mobile */}
            <div className={`hidden sm:block w-px h-8 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

            {/* Bottom row on mobile: Actions */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
                {/* Toggle Status - Complete or Mark Pending */}
                <button
                    onClick={onToggleStatus}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 font-bold text-xs sm:text-sm uppercase tracking-wide transition-all ${hasCompletedSelected
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                        }`}
                >
                    {hasCompletedSelected ? (
                        <>
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="hidden sm:inline">Mark Pending</span>
                            <span className="sm:hidden">Pending</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Complete
                        </>
                    )}
                </button>

                {/* Delete */}
                <button
                    onClick={onDelete}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-red-500 text-white font-bold text-xs sm:text-sm uppercase tracking-wide hover:bg-red-600 transition-all"
                >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                </button>
            </div>

            {/* Close - hidden on mobile, visible on desktop */}
            <button
                onClick={onClose}
                className={`hidden sm:flex ml-2 w-8 h-8 items-center justify-center transition-all ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'
                    }`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}
