import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Profile, Team, UserRole } from '../lib/database.types';
import toast from 'react-hot-toast';
import Leaderboard from '../components/Leaderboard';
import AmazonReports from '../components/AmazonReports';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

interface AdminPanelProps {
    onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
    const { profile, isRole, canCreateUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'users' | 'teams' | 'reports' | 'leaderboard'>('users');
    const [users, setUsers] = useState<Profile[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showCreateTeam, setShowCreateTeam] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordTargetUser, setPasswordTargetUser] = useState<Profile | null>(null);

    const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'normal' as UserRole });
    const [newTeam, setNewTeam] = useState({ name: '', description: '', institution: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
            const { data: teamsData } = await supabase.from('teams').select('*').order('created_at', { ascending: false });
            if (usersData) setUsers(usersData as Profile[]);
            if (teamsData) setTeams(teamsData as Team[]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canCreateUser(newUser.role)) {
            toast.error("You don't have permission to create this user type");
            return;
        }
        try {
            const { error } = await supabase.auth.admin.createUser({
                email: newUser.email,
                password: newUser.password,
                email_confirm: true,
                user_metadata: { name: newUser.name }
            });
            if (error) {
                toast.error('User creation requires Supabase service role.');
                return;
            }
            toast.success('User created!');
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
                .insert({ name: newTeam.name, description: newTeam.description || null, institution: newTeam.institution || null, admin_id: profile?.id } as any)
                .select().single();
            if (error) throw error;
            if (teamData && profile) {
                await supabase.from('team_members').insert({ team_id: (teamData as any).id, user_id: profile.id, role: 'leader' } as any);
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
        if (!confirm('Delete this user and all their data?')) return;
        try {
            toast.loading('Deleting...', { id: 'delete' });
            const { data: userTasks } = await supabase.from('tasks').select('id, attachments').eq('created_by', userId) as any;
            if (userTasks?.length > 0) {
                const attachments: string[] = [];
                userTasks.forEach((t: any) => t.attachments?.forEach((url: string) => {
                    const m = url.match(/task-attachments\/(.+)$/);
                    if (m) attachments.push(m[1]);
                }));
                if (attachments.length > 0) await supabase.storage.from('task-attachments').remove(attachments);
            }
            await supabase.from('tasks').update({ assigned_to: null }).eq('assigned_to', userId);
            await supabase.from('tasks').delete().eq('created_by', userId);
            await supabase.from('profiles').delete().eq('id', userId);
            toast.success('User deleted!', { id: 'delete' });
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed', { id: 'delete' });
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (!confirm('Delete this team?')) return;
        try {
            await supabase.from('teams').delete().eq('id', teamId);
            toast.success('Team deleted!');
            loadData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const tabs = [
        { id: 'users', label: 'Users', count: users.length },
        { id: 'teams', label: 'Teams', count: teams.length },
        { id: 'reports', label: 'Reports', count: null },
        { id: 'leaderboard', label: 'Rankings', count: null },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 z-[9998] flex items-center justify-center backdrop-blur-sm p-2 sm:p-4">
            <div className="bg-white w-full max-w-6xl max-h-[98vh] sm:max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">

                {/* Header - Responsive */}
                <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-0.5 sm:mb-1">Management</p>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-zinc-900 uppercase tracking-tight">Admin Panel</h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-zinc-100 text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Tabs - Responsive */}
                <div className="px-3 sm:px-4 md:px-8 py-3 sm:py-4 border-b border-zinc-100 bg-zinc-50 flex items-center gap-1.5 sm:gap-2 overflow-x-auto shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${activeTab === tab.id ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-100'
                                }`}
                        >
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
                            {tab.count !== null && (
                                <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs ${activeTab === tab.id ? 'bg-orange-500' : 'bg-zinc-200'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content - Responsive */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 bg-zinc-50">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* USERS TAB */}
                            {activeTab === 'users' && (
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                                        <div>
                                            <h3 className="text-lg sm:text-xl font-bold text-zinc-900 uppercase">All Users</h3>
                                            <p className="text-xs sm:text-sm text-zinc-500">{users.length} registered users</p>
                                        </div>
                                        {canCreateUser('normal') && (
                                            <button onClick={() => setShowCreateUser(true)} className="px-4 sm:px-6 py-2.5 sm:py-3 bg-zinc-900 text-white font-bold text-xs sm:text-sm uppercase tracking-wide hover:bg-orange-500 transition-colors flex items-center gap-2 self-start sm:self-auto">
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                New User
                                            </button>
                                        )}
                                    </div>

                                    {users.map(user => (
                                        <div key={user.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-white border-l-4 border-l-zinc-200 hover:border-l-orange-500 transition-colors">
                                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center text-zinc-600 font-black text-lg sm:text-xl uppercase flex-shrink-0">
                                                    {user.name?.charAt(0) || 'U'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-sm sm:text-base text-zinc-900">{user.name}</h4>
                                                    <p className="text-xs sm:text-sm text-zinc-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 pl-13 sm:pl-0">
                                                <span className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-black uppercase ${user.role === 'superadmin' ? 'bg-purple-100 text-purple-600' :
                                                    user.role === 'admin' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-zinc-100 text-zinc-600'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                                {user.id !== profile?.id && isRole('superadmin') && (
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <button
                                                            onClick={() => { setPasswordTargetUser(user); setShowPasswordModal(true); }}
                                                            className="p-1.5 sm:p-2 bg-zinc-100 text-zinc-500 hover:bg-orange-100 hover:text-orange-600 transition-colors"
                                                            title="Change Password"
                                                        >
                                                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className="p-1.5 sm:p-2 bg-zinc-100 text-zinc-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                                                            title="Delete User"
                                                        >
                                                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* TEAMS TAB */}
                            {activeTab === 'teams' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-zinc-900 uppercase">Organizations</h3>
                                            <p className="text-sm text-zinc-500">{teams.length} teams</p>
                                        </div>
                                        <button onClick={() => setShowCreateTeam(true)} className="px-6 py-3 bg-zinc-900 text-white font-bold text-sm uppercase tracking-wide hover:bg-orange-500 transition-colors flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            New Team
                                        </button>
                                    </div>

                                    {teams.map(team => (
                                        <div key={team.id} className="flex items-center gap-4 p-5 bg-white border-l-4 border-l-orange-500">
                                            <div className="w-12 h-12 bg-orange-100 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-zinc-900">{team.name}</h4>
                                                <p className="text-sm text-zinc-500">{team.institution || 'No institution'}</p>
                                            </div>
                                            {isRole('superadmin') && (
                                                <button
                                                    onClick={() => handleDeleteTeam(team.id)}
                                                    className="p-2 bg-zinc-100 text-zinc-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* REPORTS TAB */}
                            {activeTab === 'reports' && <AmazonReports />}

                            {/* LEADERBOARD TAB */}
                            {activeTab === 'leaderboard' && <Leaderboard />}
                        </>
                    )}
                </div>

                {/* Create User Modal */}
                {showCreateUser && (
                    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-white w-full max-w-md shadow-2xl">
                            <div className="px-8 py-6 border-b border-zinc-100">
                                <h3 className="text-xl font-bold text-zinc-900 uppercase">Create User</h3>
                            </div>
                            <form onSubmit={handleCreateUser} className="p-8 space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Name</label>
                                    <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="w-full px-4 py-3 bg-zinc-50 border-l-4 border-l-zinc-300 focus:border-l-orange-500 outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Email</label>
                                    <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="w-full px-4 py-3 bg-zinc-50 border-l-4 border-l-zinc-300 focus:border-l-orange-500 outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Password</label>
                                    <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full px-4 py-3 bg-zinc-50 border-l-4 border-l-zinc-300 focus:border-l-orange-500 outline-none" required minLength={6} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Role</label>
                                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })} className="w-full px-4 py-3 bg-zinc-50 border-l-4 border-l-zinc-300 focus:border-l-orange-500 outline-none">
                                        <option value="normal">Normal</option>
                                        {isRole('superadmin') && <><option value="admin">Admin</option><option value="superadmin">Super Admin</option></>}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowCreateUser(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold uppercase hover:bg-zinc-200 transition-colors">Cancel</button>
                                    <button type="submit" className="flex-1 py-3 bg-zinc-900 text-white font-bold uppercase hover:bg-orange-500 transition-colors">Create</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Create Team Modal */}
                {showCreateTeam && (
                    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-white w-full max-w-md shadow-2xl">
                            <div className="px-8 py-6 border-b border-zinc-100">
                                <h3 className="text-xl font-bold text-zinc-900 uppercase">Create Team</h3>
                            </div>
                            <form onSubmit={handleCreateTeam} className="p-8 space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Team Name</label>
                                    <input value={newTeam.name} onChange={e => setNewTeam({ ...newTeam, name: e.target.value })} className="w-full px-4 py-3 bg-zinc-50 border-l-4 border-l-zinc-300 focus:border-l-orange-500 outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Institution</label>
                                    <input value={newTeam.institution} onChange={e => setNewTeam({ ...newTeam, institution: e.target.value })} className="w-full px-4 py-3 bg-zinc-50 border-l-4 border-l-zinc-300 focus:border-l-orange-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Description</label>
                                    <textarea value={newTeam.description} onChange={e => setNewTeam({ ...newTeam, description: e.target.value })} className="w-full px-4 py-3 bg-zinc-50 border-l-4 border-l-zinc-300 focus:border-l-orange-500 outline-none h-24 resize-none" />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowCreateTeam(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold uppercase hover:bg-zinc-200 transition-colors">Cancel</button>
                                    <button type="submit" className="flex-1 py-3 bg-zinc-900 text-white font-bold uppercase hover:bg-orange-500 transition-colors">Create</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Password Modal */}
            <ChangePasswordModal
                isOpen={showPasswordModal}
                onClose={() => { setShowPasswordModal(false); setPasswordTargetUser(null); }}
                targetUserId={passwordTargetUser?.id}
                targetUserEmail={passwordTargetUser?.email}
                targetUserName={passwordTargetUser?.name}
            />
        </div>
    );
}
