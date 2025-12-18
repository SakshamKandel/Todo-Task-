import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Team, TeamMember, Profile } from '../lib/database.types';
import toast from 'react-hot-toast';

// Icons
const Icons = {
    Team: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    ),
    Plus: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    ),
    UserAdd: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
    ),
    Close: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    Task: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
    ),
};

interface TeamDashboardProps {
    team: Team;
    onClose: () => void;
    onAssignTask?: (memberId: string) => void;
}

export default function TeamDashboard({ team, onClose, onAssignTask }: TeamDashboardProps) {
    const { profile, isRole } = useAuth();
    const [members, setMembers] = useState<(TeamMember & { profile?: Profile })[]>([]);
    const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddMember, setShowAddMember] = useState(false);
    const [teamTasks, setTeamTasks] = useState<any[]>([]);

    useEffect(() => {
        loadTeamData();
    }, [team.id]);

    const loadTeamData = async () => {
        setLoading(true);
        try {
            // Load team members
            const { data: membersData } = await supabase
                .from('team_members')
                .select(`
          *,
          profile:profiles(*)
        `)
                .eq('team_id', team.id);

            if (membersData) {
                setMembers(membersData.map((m: any) => ({
                    ...m,
                    profile: Array.isArray(m.profile) ? m.profile[0] : m.profile
                })));
            }

            // Load users not in team
            const { data: allUsers } = await supabase
                .from('profiles')
                .select('*');

            if (allUsers && membersData) {
                const memberIds = (membersData as any[]).map(m => m.user_id);
                setAvailableUsers((allUsers as Profile[]).filter(u => !memberIds.includes(u.id)));
            }

            // Load team tasks
            const { data: tasksData } = await supabase
                .from('tasks')
                .select('*')
                .eq('team_id', team.id)
                .order('created_at', { ascending: false });

            if (tasksData) setTeamTasks(tasksData);
        } catch (error) {
            console.error('Error loading team data:', error);
        }
        setLoading(false);
    };

    const handleAddMember = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('team_members')
                .insert({
                    team_id: team.id,
                    user_id: userId,
                    role: 'member'
                } as any);

            if (error) throw error;
            toast.success('Member added!');
            setShowAddMember(false);
            loadTeamData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add member');
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm('Remove this member from the team?')) return;

        try {
            await supabase.from('team_members').delete().eq('id', memberId);
            toast.success('Member removed');
            loadTeamData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove member');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700';
            case 'in_progress': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-500 to-blue-600">
                    <div className="flex items-center gap-3 text-white">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Icons.Team />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{team.name}</h2>
                            <p className="text-sm text-blue-100">{team.institution || 'Team Dashboard'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white">
                        <Icons.Close />
                    </button>
                </div>

                <div className="flex h-[calc(90vh-80px)]">
                    {/* Members Panel */}
                    <div className="w-80 border-r border-gray-100 p-4 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">Team Members</h3>
                            {(isRole('superadmin') || isRole('admin')) && (
                                <button
                                    onClick={() => setShowAddMember(true)}
                                    className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                                >
                                    <Icons.UserAdd />
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
                                                {member.profile?.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800 text-sm">{member.profile?.name}</p>
                                                <p className="text-xs text-gray-500">{member.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {onAssignTask && (
                                                <button
                                                    onClick={() => onAssignTask(member.user_id)}
                                                    className="p-1.5 hover:bg-orange-100 text-gray-400 hover:text-orange-500 rounded-lg"
                                                    title="Assign Task"
                                                >
                                                    <Icons.Task />
                                                </button>
                                            )}
                                            {(isRole('superadmin') || isRole('admin')) && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className="p-1.5 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded-lg"
                                                >
                                                    <Icons.Close />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {members.length === 0 && (
                                    <p className="text-center text-sm text-gray-500 py-4">No members yet</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Tasks Panel */}
                    <div className="flex-1 p-4 overflow-y-auto">
                        <h3 className="font-bold text-gray-800 mb-4">Team Tasks</h3>
                        <div className="space-y-3">
                            {teamTasks.map((task) => (
                                <div key={task.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-semibold text-gray-800">{task.title}</h4>
                                            {task.notes && (
                                                <p className="text-sm text-gray-500 mt-1">{task.notes}</p>
                                            )}
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(task.status)}`}>
                                            {task.status}
                                        </span>
                                    </div>
                                    {task.assigned_to && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            Assigned to: {members.find(m => m.user_id === task.assigned_to)?.profile?.name || 'Unknown'}
                                        </p>
                                    )}
                                </div>
                            ))}
                            {teamTasks.length === 0 && (
                                <div className="text-center py-8">
                                    <Icons.Task />
                                    <p className="text-gray-500 mt-2">No tasks assigned to this team</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Add Member Modal */}
                {showAddMember && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Add Team Member</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {availableUsers.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleAddMember(user.id)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-orange-50 rounded-xl transition-colors text-left"
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
                                            {user.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">{user.name}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                    </button>
                                ))}
                                {availableUsers.length === 0 && (
                                    <p className="text-center text-gray-500 py-4">All users are already members</p>
                                )}
                            </div>
                            <button
                                onClick={() => setShowAddMember(false)}
                                className="w-full mt-4 py-3 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
