import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Profile, Team, UserRole } from '../lib/database.types';
import toast from 'react-hot-toast';
import Leaderboard from '../components/Leaderboard';
import AmazonReports from '../components/AmazonReports';

interface AdminPanelProps {
    onClose: () => void;
}

// Icon components
const Icons = {
    Shield: () => (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    ),
    Close: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    Users: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    ),
    Team: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    Plus: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    ),
    Trash: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    ),
};

export default function AdminPanel({ onClose }: AdminPanelProps) {
    const { profile, isRole, canCreateUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'users' | 'teams' | 'reports' | 'leaderboard'>('users');
    const [users, setUsers] = useState<Profile[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showCreateTeam, setShowCreateTeam] = useState(false);

    const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'normal' as UserRole });
    const [newTeam, setNewTeam] = useState({ name: '', description: '', institution: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load users
            const { data: usersData } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (usersData) setUsers(usersData);

            // Load teams
            const { data: teamsData } = await supabase
                .from('teams')
                .select('*')
                .order('created_at', { ascending: false });

            if (teamsData) setTeams(teamsData);
        } catch (error) {
            console.error('Error loading data:', error);
        }
        setLoading(false);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canCreateUser(newUser.role)) {
            toast.error("You don't have permission to create this user type");
            return;
        }

        try {
            // Create auth user
            const { data, error } = await supabase.auth.admin.createUser({
                email: newUser.email,
                password: newUser.password,
                email_confirm: true,
                user_metadata: { name: newUser.name }
            });

            if (error) {
                // Fallback: just create profile if admin API fails
                toast.error('User creation requires Supabase service role. User can self-register instead.');
                setShowCreateUser(false);
                return;
            }

            toast.success('User created successfully!');
            setShowCreateUser(false);
            setNewUser({ email: '', password: '', name: '', role: 'normal' });
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create user');
        }
    };

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: teamData, error } = await supabase
                .from('teams')
                .insert({
                    name: newTeam.name,
                    description: newTeam.description || null,
                    institution: newTeam.institution || null,
                    admin_id: profile?.id
                } as any)
                .select()
                .single();

            if (error) throw error;

            // Auto-add creator as team leader
            if (teamData && profile) {
                const team = teamData as any;
                await supabase.from('team_members').insert({
                    team_id: team.id,
                    user_id: profile.id,
                    role: 'leader'
                } as any);
            }

            toast.success('Team created!');
            setShowCreateTeam(false);
            setNewTeam({ name: '', description: '', institution: '' });
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create team');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user?\n\nThis will:\n• Delete all their tasks\n• Remove their attachment files from storage\n• Update tasks assigned to them\n\nThis action cannot be undone.')) return;

        try {
            toast.loading('Deleting user...', { id: 'delete-user' });

            // 1. Get all tasks created by this user to find attachments
            const { data: userTasks } = await supabase
                .from('tasks')
                .select('id, attachments')
                .eq('created_by', userId) as { data: { id: string; attachments: string[] | null }[] | null };

            // 2. Delete attachment files from storage
            if (userTasks && userTasks.length > 0) {
                const allAttachments: string[] = [];

                userTasks.forEach((task: any) => {
                    const attachments = task.attachments as string[] | null;
                    if (attachments && Array.isArray(attachments)) {
                        attachments.forEach((url: string) => {
                            // Extract file path from URL (after 'task-attachments/')
                            const match = url.match(/task-attachments\/(.+)$/);
                            if (match) {
                                allAttachments.push(match[1]);
                            }
                        });
                    }
                });

                // Delete files from storage in batches
                if (allAttachments.length > 0) {
                    const { error: storageError } = await supabase.storage
                        .from('task-attachments')
                        .remove(allAttachments);

                    if (storageError) {
                        console.warn('Storage cleanup warning:', storageError);
                    }
                }

                // 3. Delete all tasks created by this user
                await supabase
                    .from('tasks')
                    .delete()
                    .eq('created_by', userId);
            }

            // 4. Update tasks assigned to this user (set assigned_to to null)
            const sb = supabase as any;
            await sb.from('tasks').update({ assigned_to: null }).eq('assigned_to', userId);

            // 5. Remove user from team_members
            await supabase
                .from('team_members')
                .delete()
                .eq('user_id', userId);

            // 6. Delete projects created by user
            await supabase
                .from('projects')
                .delete()
                .eq('created_by', userId);

            // 7. Delete tags created by user
            await supabase
                .from('tags')
                .delete()
                .eq('created_by', userId);

            // 8. Finally delete the profile
            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (profileError) throw profileError;

            toast.success('User and all related data deleted successfully', { id: 'delete-user' });
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete user', { id: 'delete-user' });
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (!confirm('Are you sure you want to delete this team?')) return;

        try {
            await supabase.from('teams').delete().eq('id', teamId);
            toast.success('Team deleted');
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete team');
        }
    };

    const getRoleBadgeColor = (role: UserRole) => {
        switch (role) {
            case 'superadmin': return 'bg-purple-100 text-purple-700';
            case 'admin': return 'bg-orange-100 text-orange-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="fixed inset-0 z-[9998] bg-white overflow-auto">
            <div className="bg-white w-full max-w-4xl mx-auto">
                {/* Premium Header */}
                <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-1">
                            {isRole('superadmin') ? 'Super' : 'Team'}
                        </p>
                        <h2 className="text-4xl font-bold text-zinc-900 uppercase tracking-tight">
                            Admin Panel
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center bg-zinc-100 text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors whitespace-nowrap ${activeTab === 'users'
                            ? 'text-orange-600 border-b-2 border-orange-500'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Icons.Users />
                        Users ({users.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('teams')}
                        className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors whitespace-nowrap ${activeTab === 'teams'
                            ? 'text-orange-600 border-b-2 border-orange-500'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Icons.Team />
                        Teams ({teams.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors whitespace-nowrap ${activeTab === 'reports'
                            ? 'text-orange-600 border-b-2 border-orange-500'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span>📊</span>
                        Reports
                    </button>
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors whitespace-nowrap ${activeTab === 'leaderboard'
                            ? 'text-orange-600 border-b-2 border-orange-500'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span>🏆</span>
                        Leaderboard
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[75vh]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'users' && (
                                <div>
                                    {/* Create User Button */}
                                    {(isRole('superadmin') || isRole('admin')) && (
                                        <button
                                            onClick={() => setShowCreateUser(true)}
                                            className="mb-4 flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                                        >
                                            <Icons.Plus />
                                            {isRole('superadmin') ? 'Create Admin/User' : 'Create User'}
                                        </button>
                                    )}

                                    {/* Users List */}
                                    <div className="space-y-3">
                                        {users.map((user) => (
                                            <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
                                                        {user.name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{user.name}</p>
                                                        <p className="text-sm text-gray-500">{user.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(user.role)}`}>
                                                        {user.role.toUpperCase()}
                                                    </span>
                                                    {user.id !== profile?.id && isRole('superadmin') && (
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                                        >
                                                            <Icons.Trash />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {users.length === 0 && (
                                            <p className="text-center text-gray-500 py-8">No users found</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'teams' && (
                                <div>
                                    {/* Create Team Button */}
                                    <button
                                        onClick={() => setShowCreateTeam(true)}
                                        className="mb-4 flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                                    >
                                        <Icons.Plus />
                                        Create Team
                                    </button>

                                    {/* Teams List */}
                                    <div className="space-y-3">
                                        {teams.map((team) => (
                                            <div key={team.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold">
                                                        <Icons.Team />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{team.name}</p>
                                                        <p className="text-sm text-gray-500">{team.institution || 'No institution'}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteTeam(team.id)}
                                                    className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                                >
                                                    <Icons.Trash />
                                                </button>
                                            </div>
                                        ))}
                                        {teams.length === 0 && (
                                            <p className="text-center text-gray-500 py-8">No teams found</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'reports' && <AmazonReports />}
                            {activeTab === 'leaderboard' && <Leaderboard />}
                        </>
                    )}
                </div>

                {/* Create User Modal */}
                {showCreateUser && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Create New User</h3>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    required
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    required
                                    minLength={6}
                                />
                                {isRole('superadmin') && (
                                    <select
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    >
                                        <option value="normal">Normal User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateUser(false)}
                                        className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Create Team Modal */}
                {showCreateTeam && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Create New Team</h3>
                            <form onSubmit={handleCreateTeam} className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Team Name"
                                    value={newTeam.name}
                                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Institution (optional)"
                                    value={newTeam.institution}
                                    onChange={(e) => setNewTeam({ ...newTeam, institution: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                />
                                <textarea
                                    placeholder="Description (optional)"
                                    value={newTeam.description}
                                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    rows={3}
                                />
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateTeam(false)}
                                        className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
