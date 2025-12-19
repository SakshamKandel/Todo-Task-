import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetUserId?: string;
    targetUserEmail?: string;
    targetUserName?: string;
}

export function ChangePasswordModal({
    isOpen,
    onClose,
    targetUserId,
    targetUserEmail,
    targetUserName,
}: ChangePasswordModalProps) {
    const { user, isRole } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const isAdminMode = targetUserId && targetUserId !== user?.id;
    const isSuperAdmin = isRole('superadmin');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            if (isAdminMode && isSuperAdmin) {
                // For admin mode, send a password reset email
                // Direct password update requires Supabase Edge Functions with service_role key
                const { error } = await supabase.auth.resetPasswordForEmail(targetUserEmail || '', {
                    redirectTo: `${window.location.origin}/reset-password`,
                });

                if (error) throw error;

                toast.success(`Password reset email sent to ${targetUserEmail}!`, {
                    duration: 5000,
                    icon: '📧'
                });
                handleClose();
            } else {
                if (!currentPassword) {
                    toast.error('Please enter your current password');
                    setLoading(false);
                    return;
                }

                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: user?.email || '',
                    password: currentPassword,
                });

                if (signInError) {
                    toast.error('Current password is incorrect');
                    setLoading(false);
                    return;
                }

                const { error } = await supabase.auth.updateUser({
                    password: newPassword,
                });

                if (error) {
                    throw error;
                }

                toast.success('Password changed successfully!');
                handleClose();
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] backdrop-blur-sm">
            <div className="bg-white w-full max-w-md shadow-2xl overflow-hidden">

                {/* Premium Header */}
                <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-white">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-1">Security</p>
                        <h2 className="text-2xl font-bold text-zinc-900 uppercase tracking-tight">
                            Change Password
                        </h2>
                        {isAdminMode && (
                            <p className="text-xs text-zinc-500 mt-1">
                                For: <span className="font-bold text-orange-600">{targetUserName || targetUserEmail}</span>
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-10 h-10 flex items-center justify-center bg-zinc-100 text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 bg-zinc-50 space-y-5">

                    {/* Current password - only for self-change */}
                    {!isAdminMode && (
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                                Current Password
                            </label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white border-l-4 border-l-zinc-300 border-y-0 border-r-0 text-zinc-900 font-medium focus:border-l-orange-500 focus:outline-none transition-colors"
                                placeholder="Enter current password"
                                required
                            />
                        </div>
                    )}

                    {/* Admin mode notice */}
                    {isAdminMode && !isSuperAdmin && (
                        <div className="p-4 bg-red-50 border-l-4 border-l-red-500 text-sm text-red-700 font-medium">
                            Only super admins can change other users' passwords.
                        </div>
                    )}

                    {/* New password */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                            New Password
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-white border-l-4 border-l-zinc-300 border-y-0 border-r-0 text-zinc-900 font-medium focus:border-l-orange-500 focus:outline-none transition-colors"
                            placeholder="Enter new password"
                            required
                            minLength={6}
                            disabled={isAdminMode && !isSuperAdmin}
                        />
                    </div>

                    {/* Confirm password */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full px-4 py-3 bg-white border-l-4 border-y-0 border-r-0 text-zinc-900 font-medium focus:outline-none transition-colors ${newPassword && confirmPassword && newPassword !== confirmPassword
                                ? 'border-l-red-500'
                                : 'border-l-zinc-300 focus:border-l-orange-500'
                                }`}
                            placeholder="Confirm new password"
                            required
                            minLength={6}
                            disabled={isAdminMode && !isSuperAdmin}
                        />
                        {newPassword && confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-xs text-red-500 font-bold mt-2 uppercase tracking-wide">Passwords do not match</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 py-3 bg-white text-zinc-600 font-bold text-sm uppercase tracking-wide hover:bg-zinc-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (isAdminMode && !isSuperAdmin)}
                            className="flex-1 py-3 bg-zinc-900 text-white font-bold text-sm uppercase tracking-wide hover:bg-orange-500 transition-colors disabled:bg-zinc-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Update Password'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
