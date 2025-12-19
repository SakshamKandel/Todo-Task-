import React, { useEffect, useState } from 'react';
import { usePomodoroStore } from '../store/pomodoroStore';
import { useTheme } from '../contexts/ThemeContext';

export function PomodoroTimer() {
    const {
        timeRemaining,
        isRunning,
        mode,
        completedSessions,
        sessionsBeforeLongBreak,
        start,
        pause,
        reset,
        skip,
        tick,
        setMode,
    } = usePomodoroStore();

    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [isExpanded, setIsExpanded] = useState(false);

    // Timer tick effect
    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [isRunning, tick]);

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress percentage
    const totalTime = mode === 'work' ? 25 * 60 : mode === 'shortBreak' ? 5 * 60 : 15 * 60;
    const progress = ((totalTime - timeRemaining) / totalTime) * 100;

    const modeColors = {
        work: { bg: 'bg-orange-500', text: 'text-orange-500', ring: 'stroke-orange-500' },
        shortBreak: { bg: 'bg-emerald-500', text: 'text-emerald-500', ring: 'stroke-emerald-500' },
        longBreak: { bg: 'bg-blue-500', text: 'text-blue-500', ring: 'stroke-blue-500' },
    };

    const colors = modeColors[mode];

    return (
        <div
            className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isExpanded ? 'w-80' : 'w-16'
                }`}
        >
            {/* Minimized View */}
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl ${colors.bg} text-white font-bold text-sm transition-transform hover:scale-110`}
                >
                    {formatTime(timeRemaining).split(':')[0]}
                </button>
            )}

            {/* Expanded View */}
            {isExpanded && (
                <div className={`p-6 shadow-2xl ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500">Pomodoro</p>
                            <h3 className={`text-lg font-bold uppercase ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                {mode === 'work' ? 'Focus Time' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
                            </h3>
                        </div>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className={`w-8 h-8 flex items-center justify-center ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'} transition-colors`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Timer Display */}
                    <div className="relative flex items-center justify-center mb-6">
                        {/* Circular Progress */}
                        <svg className="w-40 h-40 transform -rotate-90">
                            <circle
                                cx="80"
                                cy="80"
                                r="70"
                                fill="none"
                                strokeWidth="8"
                                className={isDark ? 'stroke-zinc-800' : 'stroke-zinc-100'}
                            />
                            <circle
                                cx="80"
                                cy="80"
                                r="70"
                                fill="none"
                                strokeWidth="8"
                                className={colors.ring}
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 70}
                                strokeDashoffset={2 * Math.PI * 70 * (1 - progress / 100)}
                                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                            />
                        </svg>
                        <div className="absolute text-center">
                            <span className={`text-4xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                {formatTime(timeRemaining)}
                            </span>
                        </div>
                    </div>

                    {/* Mode Selector */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {(['work', 'shortBreak', 'longBreak'] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`py-2 text-xs font-bold uppercase transition-all ${mode === m
                                        ? `${modeColors[m].bg} text-white`
                                        : isDark
                                            ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                    }`}
                            >
                                {m === 'work' ? 'Focus' : m === 'shortBreak' ? 'Short' : 'Long'}
                            </button>
                        ))}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={reset}
                            className={`w-10 h-10 flex items-center justify-center transition-all ${isDark
                                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>

                        <button
                            onClick={isRunning ? pause : start}
                            className={`w-14 h-14 flex items-center justify-center ${colors.bg} text-white transition-transform hover:scale-105`}
                        >
                            {isRunning ? (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            )}
                        </button>

                        <button
                            onClick={skip}
                            className={`w-10 h-10 flex items-center justify-center transition-all ${isDark
                                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Session Counter */}
                    <div className="mt-4 flex items-center justify-center gap-2">
                        {Array.from({ length: sessionsBeforeLongBreak }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${i < completedSessions ? colors.bg : isDark ? 'bg-zinc-700' : 'bg-zinc-200'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
