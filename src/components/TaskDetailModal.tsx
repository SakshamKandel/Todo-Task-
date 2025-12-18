import { useState, useEffect } from 'react';
import { useTaskStore, useProjectStore, useTagStore, useUIStore } from '../store';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Profile } from '../lib/database.types';
import { AMAZON_POINTS, AMAZON_TASK_LABELS } from '../lib/database.types';
import TaskComments from './TaskComments';
import toast from 'react-hot-toast';

// Helper to auto-link URLs in text
function linkifyText(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
        if (urlRegex.test(part)) {
            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:text-orange-400 hover:underline break-all"
                >
                    {part}
                </a>
            );
        }
        return <span key={index}>{part}</span>;
    });
}

// Download helper
const downloadFile = async (url: string, filename: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        toast.success('Download started!');
    } catch (error) {
        toast.error('Failed to download file');
    }
};

export function TaskDetailModal() {
    const { taskDetailOpen, taskDetailId, closeTaskDetail, openTaskModal } = useUIStore();
    const tasks = useTaskStore((state) => state.tasks);
    const { updateTask, toggleSubtask } = useTaskStore();
    const projects = useProjectStore((state) => state.projects);
    const tags = useTagStore((state) => state.tags);
    const { user, isRole } = useAuth();

    const [assignee, setAssignee] = useState<Profile | null>(null);
    const [creator, setCreator] = useState<Profile | null>(null);
    const [teamName, setTeamName] = useState<string | null>(null);
    const [userRating, setUserRating] = useState<number | null>(null);
    const [averageRating, setAverageRating] = useState<number | null>(null);
    const [ratingLoading, setRatingLoading] = useState(false);

    const task = taskDetailId ? tasks.find((t) => t.id === taskDetailId) : null;
    const project = task?.projectId ? projects.find((p) => p.id === task.projectId) : null;
    const taskTags = task?.tagIds ? tags.filter((t) => task.tagIds.includes(t.id)) : [];

    // Role detection
    const isAssigner = user?.id === task?.createdBy;
    const isAssignee = user?.id === task?.assignedTo;

    // Fetch assignee profile
    useEffect(() => {
        if (task?.assignedTo) {
            supabase
                .from('profiles')
                .select('*')
                .eq('id', task.assignedTo)
                .single()
                .then(({ data }) => {
                    if (data) setAssignee(data);
                });
        } else {
            setAssignee(null);
        }
    }, [task?.assignedTo]);

    // Fetch creator profile  
    useEffect(() => {
        if (task?.createdBy) {
            supabase
                .from('profiles')
                .select('*')
                .eq('id', task.createdBy)
                .single()
                .then(({ data }) => {
                    if (data) setCreator(data);
                });
        }
    }, [task?.createdBy]);

    // Load ratings
    useEffect(() => {
        if (task?.id && taskDetailOpen) {
            loadRatings();
        }
    }, [task?.id, taskDetailOpen]);

    const loadRatings = async () => {
        if (!task?.id) return;

        // Get average
        const { data: ratings } = await supabase
            .from('task_ratings')
            .select('rating')
            .eq('task_id', task.id);

        if (ratings && ratings.length > 0) {
            const avg = ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length;
            setAverageRating(Math.round(avg * 10) / 10);
        } else {
            setAverageRating(null);
        }

        // Get user rating
        if (user) {
            const { data: userRatingData } = await supabase
                .from('task_ratings')
                .select('rating')
                .eq('task_id', task.id)
                .eq('rated_by', user.id)
                .single();

            if (userRatingData) {
                setUserRating(userRatingData.rating);
            } else {
                setUserRating(null);
            }
        }
    };

    const handleRate = async (rating: number) => {
        if (!task?.id || !user) return;
        setRatingLoading(true);

        const { error } = await supabase
            .from('task_ratings')
            .upsert({
                task_id: task.id,
                rated_by: user.id,
                rating: rating
            }, { onConflict: 'task_id,rated_by' });

        if (error) {
            toast.error('Failed to submit rating');
        } else {
            toast.success('Rating submitted!');
            setUserRating(rating);
            loadRatings();
        }
        setRatingLoading(false);
    };

    const calculateAmazonPoints = () => {
        if (!task?.amazonTasks) return 0;
        return task.amazonTasks.reduce((total, t) => {
            return total + (AMAZON_POINTS[t.type] || 0) * t.quantity;
        }, 0);
    };
    // Fetch team name
    useEffect(() => {
        if (task?.teamId) {
            supabase
                .from('teams')
                .select('name')
                .eq('id', task.teamId)
                .single()
                .then(({ data }) => {
                    if (data) setTeamName((data as { name: string }).name);
                });
        } else {
            setTeamName(null);
        }
    }, [task?.teamId]);

    const handleMarkComplete = async () => {
        if (!task) return;
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;
        await updateTask(task.id, { status: newStatus, completedAt });
        toast.success(newStatus === 'completed' ? 'Task completed!' : 'Task reopened');
    };

    const handleSubtaskToggle = async (subtaskId: string) => {
        if (!task) return;
        await toggleSubtask(task.id, subtaskId);
    };

    const handleEdit = () => {
        if (!task) return;
        closeTaskDetail();
        openTaskModal(task.id);
    };

    if (!taskDetailOpen || !task) return null;

    const isCompleted = task.status === 'completed';

    return (
        <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-4 pb-4 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={closeTaskDetail}
            />

            <div className="relative w-full max-w-4xl mx-4 flex flex-col md:flex-row gap-0">

                {/* SEPARATE ASSIGNEE COMPARTMENT - For Assigner Only */}
                {isAssigner && assignee && (
                    <div className="w-full md:w-64 flex-shrink-0 flex flex-col">
                        {/* Assigned To Section - Flat Orange */}
                        <div className="bg-orange-500 p-6 text-white">
                            <div className="flex items-center gap-2 mb-6">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <h3 className="font-bold text-[11px] uppercase tracking-widest">Assigned To</h3>
                            </div>

                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 rounded-full bg-orange-400 flex items-center justify-center text-3xl font-bold mb-4">
                                    {assignee.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <p className="text-lg font-bold">{assignee.name}</p>
                                <p className="text-white/80 text-sm">{assignee.email}</p>

                                <div className="mt-6 pt-6 border-t border-white/20 w-full">
                                    <p className="text-[11px] text-white/70 uppercase tracking-widest mb-2">Status</p>
                                    <span className={`px-4 py-1.5 text-xs font-bold uppercase ${isCompleted
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-orange-400 text-white'
                                        }`}>
                                        {isCompleted ? 'Completed' : 'In Progress'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Your info (creator) */}
                        <div className="bg-zinc-50 p-6 border-l-4 border-l-orange-500">
                            <p className="text-[11px] text-zinc-400 uppercase tracking-widest mb-3">Created By You</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                                    {creator?.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <p className="font-bold text-zinc-900">{creator?.name}</p>
                                    <p className="text-xs text-zinc-400">{creator?.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MAIN MODAL */}
                <div className="flex-1 bg-white shadow-2xl overflow-hidden">
                    {/* Header - Flat Orange */}
                    <div className="bg-orange-500 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={handleMarkComplete}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all ${isCompleted
                                    ? 'bg-white text-emerald-600'
                                    : 'bg-orange-400 text-white hover:bg-orange-300'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {isCompleted ? 'Completed' : 'Mark complete'}
                            </button>

                            <div className="flex items-center gap-2">
                                {/* Role Badge */}
                                {isAssigner && (
                                    <span className="px-3 py-1 bg-orange-400 text-white text-xs font-bold uppercase tracking-wider">
                                        You assigned this
                                    </span>
                                )}
                                {isAssignee && !isAssigner && (
                                    <span className="px-3 py-1 bg-orange-400 text-white text-xs font-bold uppercase tracking-wider">
                                        Assigned to you
                                    </span>
                                )}

                                {/* Edit button - only for assigner */}
                                {isAssigner && (
                                    <button
                                        onClick={handleEdit}
                                        className="w-10 h-10 flex items-center justify-center bg-orange-400 text-white hover:bg-orange-300 transition-colors"
                                        title="Edit task"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                )}
                                {/* Close button */}
                                <button
                                    onClick={closeTaskDetail}
                                    className="w-10 h-10 flex items-center justify-center bg-orange-400 text-white hover:bg-red-500 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Team notice */}
                    {teamName && (
                        <div className="px-6 py-3 bg-zinc-50 text-sm text-zinc-700 flex items-center gap-2 border-b border-zinc-100">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Team: <span className="font-bold text-orange-500">{teamName}</span>
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Title */}
                        <h1 className={`text-2xl font-bold ${isCompleted ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                            {task.title}
                        </h1>

                        {/* For Assignee - Show who assigned */}
                        {isAssignee && !isAssigner && creator && (
                            <div className="bg-zinc-50 p-4 border-l-4 border-l-orange-500">
                                <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mb-3">Assigned By</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white text-lg font-bold">
                                        {creator.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{creator.name}</p>
                                        <p className="text-sm text-gray-500">{creator.email}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Task Info Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Due date */}
                            {task.dueDate && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Due Date</p>
                                    <p className="font-semibold text-gray-800">{format(parseISO(task.dueDate), 'MMM d, yyyy')}</p>
                                </div>
                            )}

                            {/* Priority */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Priority</p>
                                <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-bold ${task.priority === 'high' ? 'bg-red-100 text-red-600' :
                                    task.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                                    }`}>
                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </span>
                            </div>

                            {/* Project */}
                            {project && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Project</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded" style={{ backgroundColor: project.color }} />
                                        <span className="font-semibold text-gray-800">{project.name}</span>
                                    </div>
                                </div>
                            )}

                            {/* Status */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</p>
                                <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-bold ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                    }`}>
                                    {isCompleted ? 'Completed' : 'In Progress'}
                                </span>
                            </div>
                        </div>

                        {/* Amazon Task Details */}
                        {task.isAmazon && task.amazonTasks && task.amazonTasks.length > 0 && (
                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726a17.617 17.617 0 01-10.951-.577 17.88 17.88 0 01-5.43-3.395c-.275-.25-.1-.467.045-.634" />
                                            <path d="M6.394 14.736c.26-.04.39.01.596.16.206.16.39.36.47.584.04.12.08.2.13.24.05.04.13.054.24.04l.2-.04c.26-.05.54-.1.76-.1.38 0 .78.13 1.14.36.36.24.58.58.58.98 0 .39-.16.75-.5 1.08-.34.32-.79.64-1.35.94-.56.3-1.1.46-1.62.46-.58 0-1.07-.14-1.5-.43-.43-.28-.64-.64-.64-1.06 0-.39.08-.73.24-1.04.16-.3.37-.56.62-.79.25-.22.59-.5 1.03-.82.17-.12.29-.2.36-.24zm7.27-2.29c-.3-.44-.64-.86-1.02-1.24-.39-.39-.81-.76-1.27-1.11-.46-.35-.9-.64-1.33-.88-.43-.24-.93-.42-1.5-.54l-.37-.08v-.56c0-.46.1-.86.31-1.2.21-.34.51-.62.9-.83.39-.21.83-.32 1.32-.32.48 0 .91.1 1.27.3.36.2.64.48.83.84.19.35.29.76.29 1.21v.43h2.05v-.57c0-.73-.15-1.38-.45-1.93-.3-.57-.73-1.02-1.28-1.35-.56-.32-1.2-.49-1.93-.49-.8 0-1.5.17-2.11.52-.61.35-1.09.83-1.43 1.44-.34.61-.51 1.3-.51 2.07v.79l-.55.08c-.65.12-1.22.32-1.71.62-.49.3-.87.66-1.14 1.1-.27.44-.4.96-.4 1.55 0 .64.14 1.19.43 1.66.29.47.7.83 1.24 1.1.54.26 1.17.39 1.89.39.6 0 1.13-.09 1.6-.27.47-.18.86-.43 1.18-.75.32-.32.56-.69.73-1.12.16-.43.25-.89.25-1.38v-.06c.11.07.23.14.36.22.43.26.83.56 1.21.91.38.35.71.73.98 1.13.28.4.48.83.61 1.27.13.44.2.9.2 1.36 0 .54-.09 1.06-.28 1.54-.19.49-.47.92-.84 1.3-.37.38-.83.68-1.37.9-.54.22-1.14.33-1.81.33-.64 0-1.23-.1-1.77-.3-.54-.2-1.02-.49-1.43-.87" />
                                        </svg>
                                        <h3 className="font-bold text-gray-800">Amazon Task Breakdown</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-orange-600 font-bold uppercase tracking-wider">Total Points</p>
                                        <p className="text-xl font-black text-gray-800">{calculateAmazonPoints().toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {task.amazonTasks.map((t, i) => (
                                        <div key={i} className="bg-white/50 rounded-lg p-2 flex justify-between items-center px-3">
                                            <span className="text-sm font-medium text-gray-700">{AMAZON_TASK_LABELS[t.type]}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">x{t.quantity}</span>
                                                <span className="text-xs text-gray-400 font-medium">({(AMAZON_POINTS[t.type] * t.quantity).toFixed(2)} pts)</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Rating Section */}
                                <div className="mt-6 pt-4 border-t border-orange-100/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-gray-800">Task Rating</p>
                                            <p className="text-xs text-gray-500">
                                                {averageRating ? `Avg: ${averageRating}/10` : 'No ratings yet'}
                                            </p>
                                        </div>
                                        {(isRole('superadmin') || isAssigner) ? (
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={() => handleRate(star)}
                                                        disabled={ratingLoading}
                                                        className={`w-6 h-8 flex items-center justify-center transition-all ${(userRating && star <= userRating)
                                                            ? 'text-orange-500 scale-110'
                                                            : 'text-gray-300 hover:text-orange-300'
                                                            }`}
                                                    >
                                                        ★
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                                                    <span
                                                        key={star}
                                                        className={`w-4 h-4 ${(averageRating && star <= Math.round(averageRating))
                                                            ? 'text-orange-500'
                                                            : 'text-gray-200'
                                                            }`}
                                                    >
                                                        ★
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tags */}
                        {taskTags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {taskTags.map((tag) => (
                                    <span
                                        key={tag.id}
                                        className="px-3 py-1 rounded-full text-xs font-medium"
                                        style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Description */}
                        {task.notes && (
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Description</h3>
                                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {linkifyText(task.notes)}
                                </div>
                            </div>
                        )}

                        {/* File Attachments with Download */}
                        {task.attachments && task.attachments.length > 0 && (
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    Attachments ({task.attachments.length})
                                </h3>
                                <div className="space-y-2">
                                    {task.attachments.map((url, index) => {
                                        const filename = url.split('/').pop() || `attachment-${index + 1}`;
                                        return (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 group hover:border-orange-300 transition-colors"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <span className="text-gray-700 truncate flex-1 font-medium">{filename}</span>
                                                <div className="flex items-center gap-1">
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                                                        title="View"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </a>
                                                    <button
                                                        onClick={() => downloadFile(url, filename)}
                                                        className="p-2 hover:bg-orange-100 rounded-lg transition-colors text-gray-400 hover:text-orange-500"
                                                        title="Download"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Subtasks */}
                        <div className="bg-gray-50 rounded-xl p-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                Subtasks {task.subtasks && task.subtasks.length > 0 && `(${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length})`}
                            </h3>
                            {task.subtasks && task.subtasks.length > 0 ? (
                                <div className="space-y-2 mb-3">
                                    {task.subtasks.map((subtask) => (
                                        <div
                                            key={subtask.id}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer"
                                            onClick={() => handleSubtaskToggle(subtask.id)}
                                        >
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${subtask.completed
                                                ? 'bg-orange-500 border-orange-500'
                                                : 'border-gray-300 hover:border-orange-400'
                                                }`}>
                                                {subtask.completed && (
                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className={`text-sm ${subtask.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                                {subtask.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm mb-3">No subtasks yet</p>
                            )}
                            {isAssigner && (
                                <button
                                    onClick={handleEdit}
                                    className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add subtask
                                </button>
                            )}
                        </div>

                        {/* Comments */}
                        <div className="bg-gray-50 rounded-xl p-4">
                            <TaskComments taskId={task.id} darkMode={false} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
