import { create } from 'zustand';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroState {
    // Timer state
    timeRemaining: number; // in seconds
    isRunning: boolean;
    mode: TimerMode;

    // Settings
    workDuration: number; // in minutes
    shortBreakDuration: number;
    longBreakDuration: number;
    sessionsBeforeLongBreak: number;

    // Session tracking
    completedSessions: number;
    currentTaskId: string | null;

    // Actions
    start: () => void;
    pause: () => void;
    reset: () => void;
    skip: () => void;
    tick: () => void;
    setMode: (mode: TimerMode) => void;
    setTaskId: (taskId: string | null) => void;
    updateSettings: (settings: Partial<Pick<PomodoroState, 'workDuration' | 'shortBreakDuration' | 'longBreakDuration' | 'sessionsBeforeLongBreak'>>) => void;
}

const DEFAULT_WORK = 25;
const DEFAULT_SHORT_BREAK = 5;
const DEFAULT_LONG_BREAK = 15;
const DEFAULT_SESSIONS = 4;

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
    // Initial state
    timeRemaining: DEFAULT_WORK * 60,
    isRunning: false,
    mode: 'work',

    workDuration: DEFAULT_WORK,
    shortBreakDuration: DEFAULT_SHORT_BREAK,
    longBreakDuration: DEFAULT_LONG_BREAK,
    sessionsBeforeLongBreak: DEFAULT_SESSIONS,

    completedSessions: 0,
    currentTaskId: null,

    // Start timer
    start: () => set({ isRunning: true }),

    // Pause timer
    pause: () => set({ isRunning: false }),

    // Reset current timer
    reset: () => {
        const { mode, workDuration, shortBreakDuration, longBreakDuration } = get();
        let duration: number;
        switch (mode) {
            case 'work':
                duration = workDuration;
                break;
            case 'shortBreak':
                duration = shortBreakDuration;
                break;
            case 'longBreak':
                duration = longBreakDuration;
                break;
        }
        set({ timeRemaining: duration * 60, isRunning: false });
    },

    // Skip to next session
    skip: () => {
        const { mode, completedSessions, sessionsBeforeLongBreak, workDuration, shortBreakDuration, longBreakDuration } = get();

        let nextMode: TimerMode;
        let newCompletedSessions = completedSessions;

        if (mode === 'work') {
            newCompletedSessions = completedSessions + 1;
            if (newCompletedSessions >= sessionsBeforeLongBreak) {
                nextMode = 'longBreak';
                newCompletedSessions = 0;
            } else {
                nextMode = 'shortBreak';
            }
        } else {
            nextMode = 'work';
        }

        let duration: number;
        switch (nextMode) {
            case 'work':
                duration = workDuration;
                break;
            case 'shortBreak':
                duration = shortBreakDuration;
                break;
            case 'longBreak':
                duration = longBreakDuration;
                break;
        }

        set({
            mode: nextMode,
            timeRemaining: duration * 60,
            isRunning: false,
            completedSessions: newCompletedSessions,
        });
    },

    // Tick (called every second)
    tick: () => {
        const { timeRemaining, isRunning } = get();
        if (!isRunning) return;

        if (timeRemaining <= 0) {
            // Timer complete - auto skip to next session
            get().skip();
            // Play notification sound
            try {
                const audio = new Audio('/notification.mp3');
                audio.play().catch(() => { }); // Ignore if audio fails
            } catch { }
            return;
        }

        set({ timeRemaining: timeRemaining - 1 });
    },

    // Set timer mode
    setMode: (mode: TimerMode) => {
        const { workDuration, shortBreakDuration, longBreakDuration } = get();
        let duration: number;
        switch (mode) {
            case 'work':
                duration = workDuration;
                break;
            case 'shortBreak':
                duration = shortBreakDuration;
                break;
            case 'longBreak':
                duration = longBreakDuration;
                break;
        }
        set({ mode, timeRemaining: duration * 60, isRunning: false });
    },

    // Set current task
    setTaskId: (taskId: string | null) => set({ currentTaskId: taskId }),

    // Update settings
    updateSettings: (settings) => {
        set(settings);
        const { mode } = get();
        // Reset timer with new duration
        get().setMode(mode);
    },
}));
