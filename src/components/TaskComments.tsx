import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { TaskComment, Profile } from '../lib/database.types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface TaskCommentsProps {
    taskId: string;
    darkMode?: boolean;
}

export default function TaskComments({ taskId, darkMode = false }: TaskCommentsProps) {
    const { user, profile } = useAuth();
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadComments();
    }, [taskId]);

    const loadComments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('task_comments')
                .select('*, user:profiles(*)')
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const mappedComments = (data || []).map((c: any) => ({
                ...c,
                user: Array.isArray(c.user) ? c.user[0] : c.user,
            }));

            setComments(mappedComments);
        } catch (error) {
            console.error('Error loading comments:', error);
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        setSubmitting(true);
        try {
            const { data, error } = await supabase
                .from('task_comments')
                .insert({
                    task_id: taskId,
                    user_id: user.id,
                    content: newComment.trim(),
                } as any)
                .select('*, user:profiles(*)')
                .single();

            if (error) throw error;

            const commentData = data as any;
            const newCommentData = {
                ...commentData,
                user: Array.isArray(commentData.user) ? commentData.user[0] : commentData.user,
            };

            setComments([...comments, newCommentData]);
            setNewComment('');
            toast.success('Comment added');
        } catch (error: any) {
            toast.error('Failed to add comment');
        }
        setSubmitting(false);
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm('Delete this comment?')) return;

        try {
            const { error } = await supabase
                .from('task_comments')
                .delete()
                .eq('id', commentId);

            if (error) throw error;

            setComments(comments.filter(c => c.id !== commentId));
            toast.success('Comment deleted');
        } catch (error: any) {
            toast.error('Failed to delete comment');
        }
    };

    return (
        <div className="space-y-4">
            <h3 className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                Comments ({comments.length})
            </h3>

            {/* Comments list */}
            {loading ? (
                <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : comments.length === 0 ? (
                <p className={`text-sm text-center py-4 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    No comments yet. Be the first to comment!
                </p>
            ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                    {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 group">
                            {/* Avatar */}
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {comment.user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                        {comment.user?.name || 'Unknown'}
                                    </span>
                                    <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                    </span>
                                    {comment.user_id === user?.id && (
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity"
                                            title="Delete"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                <p className={`text-sm break-words ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{comment.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add comment form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className={`flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border border-gray-200'}`}
                />
                <button
                    type="submit"
                    disabled={!newComment.trim() || submitting}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        'Send'
                    )}
                </button>
            </form>
        </div>
    );
}
