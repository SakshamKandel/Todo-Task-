import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Team, TeamMember, Profile, TeamInvitation } from '../lib/database.types';
import toast from 'react-hot-toast';

// Icons
const Icons = {
    Team: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    Link: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
    ),
    Copy: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    ),
    Exit: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    ),
    Plus: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    ),
    Back: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
    ),
};

interface OrganizationPageProps {
    onClose: () => void;
}

export default function OrganizationPage({ onClose }: OrganizationPageProps) {
    const { user, profile, isRole } = useAuth();
    const [myTeams, setMyTeams] = useState<(Team & { members?: (TeamMember & { profile?: Profile })[] })[]>([]);
    const [loading, setLoading] = useState(true);
    const [joinCode, setJoinCode] = useState('');
    const [joiningTeam, setJoiningTeam] = useState(false);
    const [invitations, setInvitations] = useState<{ [teamId: string]: TeamInvitation }>({});
    const [generatingCode, setGeneratingCode] = useState<string | null>(null);

    useEffect(() => {
        loadMyTeams();
    }, [user]);

    const loadMyTeams = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Get teams where I'm a member
            const { data: memberships } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('user_id', user.id);

            if (memberships && memberships.length > 0) {
                const teamIds = (memberships as any[]).map(m => m.team_id);

                // Get team details with members
                const { data: teamsData } = await supabase
                    .from('teams')
                    .select('*')
                    .in('id', teamIds);

                if (teamsData) {
                    // Load members for each team
                    const teamsWithMembers = await Promise.all(
                        (teamsData as Team[]).map(async (team) => {
                            const { data: members } = await supabase
                                .from('team_members')
                                .select('*, profile:profiles(*)')
                                .eq('team_id', team.id);

                            return {
                                ...team,
                                members: members?.map((m: any) => ({
                                    ...m,
                                    profile: Array.isArray(m.profile) ? m.profile[0] : m.profile
                                })) || []
                            };
                        })
                    );
                    setMyTeams(teamsWithMembers);

                    // Load invitations for teams I admin
                    if (isRole('superadmin') || isRole('admin')) {
                        const { data: invites } = await supabase
                            .from('team_invitations')
                            .select('*')
                            .in('team_id', teamIds);

                        if (invites) {
                            const inviteMap: { [teamId: string]: TeamInvitation } = {};
                            (invites as any[]).forEach(inv => {
                                inviteMap[inv.team_id] = inv;
                            });
                            setInvitations(inviteMap);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error loading teams:', error);
        }
        setLoading(false);
    };

    const handleJoinTeam = async () => {
        if (!joinCode.trim() || !user) return;
        setJoiningTeam(true);

        try {
            // Find invitation by code
            const { data: invitationData, error: invError } = await supabase
                .from('team_invitations')
                .select('*')
                .eq('code', joinCode.trim().toUpperCase())
                .single();

            const invitation = invitationData as TeamInvitation | null;

            if (invError || !invitation) {
                toast.error('Invalid invitation code');
                setJoiningTeam(false);
                return;
            }

            // Check if already a member
            const { data: existing } = await supabase
                .from('team_members')
                .select('id')
                .eq('team_id', invitation.team_id)
                .eq('user_id', user.id)
                .single();

            if (existing) {
                toast.error('You are already a member of this team');
                setJoiningTeam(false);
                return;
            }

            // Join the team
            const { error: joinError } = await supabase
                .from('team_members')
                .insert({
                    team_id: invitation.team_id,
                    user_id: user.id,
                    role: 'member'
                } as any);

            if (joinError) throw joinError;

            // Update invitation usage
            const client = supabase as any;
            await client.from('team_invitations')
                .update({ uses: invitation.uses + 1 })
                .eq('id', invitation.id);

            toast.success('Successfully joined the team!');
            setJoinCode('');
            loadMyTeams();
        } catch (error: any) {
            toast.error(error.message || 'Failed to join team');
        }
        setJoiningTeam(false);
    };

    const generateInviteCode = async (teamId: string) => {
        setGeneratingCode(teamId);
        try {
            // Generate random code
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();

            // Delete existing invitation for this team
            await supabase
                .from('team_invitations')
                .delete()
                .eq('team_id', teamId);

            // Create new invitation
            const { data, error } = await supabase
                .from('team_invitations')
                .insert({
                    team_id: teamId,
                    code,
                    created_by: user?.id,
                    max_uses: 0, // Unlimited
                } as any)
                .select()
                .single();

            if (error) throw error;

            setInvitations(prev => ({ ...prev, [teamId]: data }));
            toast.success('Invitation code generated!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to generate code');
        }
        setGeneratingCode(null);
    };

    const copyInviteCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success('Code copied to clipboard!');
    };

    const copyInviteLink = (code: string) => {
        const link = `${window.location.origin}?join=${code}`;
        navigator.clipboard.writeText(link);
        toast.success('Invite link copied!');
    };

    const handleLeaveTeam = async (teamId: string) => {
        if (!confirm('Are you sure you want to leave this team?')) return;

        try {
            await supabase
                .from('team_members')
                .delete()
                .eq('team_id', teamId)
                .eq('user_id', user?.id || '');

            toast.success('Left the team');
            loadMyTeams();
        } catch (error: any) {
            toast.error(error.message || 'Failed to leave team');
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-[9998] overflow-auto">
            {/* Premium Header - Responsive */}
            <div className="bg-white border-b border-zinc-100 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-0.5 sm:mb-1">My</p>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-tight">Organization</h1>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-zinc-100 text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
                {/* Join Team Section - Responsive */}
                <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-200">
                    <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                        <Icons.Link />
                        Join a Team
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="Enter code (e.g., ABC123)"
                            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center uppercase tracking-widest font-mono text-base sm:text-lg"
                            maxLength={8}
                        />
                        <button
                            onClick={handleJoinTeam}
                            disabled={!joinCode.trim() || joiningTeam}
                            className="px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {joiningTeam ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Icons.Plus />
                                    Join
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* My Teams */}
                <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">My Teams ({myTeams.length})</h2>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : myTeams.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icons.Team />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No teams yet</h3>
                        <p className="text-zinc-500 mb-4">Join a team using an invitation code or ask an admin to add you.</p>
                    </div>
                ) : (
                    <div className="space-y-4 sm:space-y-6">
                        {myTeams.map((team) => (
                            <div key={team.id} className="bg-white border border-zinc-200 overflow-hidden">
                                {/* Team Header - Responsive */}
                                <div className="p-4 sm:p-6 border-b border-zinc-100 bg-zinc-50">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-orange-500 flex items-center justify-center text-white text-base sm:text-xl font-bold flex-shrink-0">
                                                {team.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-base sm:text-xl font-bold text-zinc-900 truncate">{team.name}</h3>
                                                {team.institution && (
                                                    <p className="text-xs sm:text-sm text-zinc-500 truncate">{team.institution}</p>
                                                )}
                                                <p className="text-xs sm:text-sm text-orange-500 font-bold">
                                                    {team.members?.length || 0} members
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleLeaveTeam(team.id)}
                                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-zinc-100 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                                            title="Leave team"
                                        >
                                            <Icons.Exit />
                                        </button>
                                    </div>

                                    {/* Invitation Code (Admin only) */}
                                    {(isRole('superadmin') || isRole('admin')) && (
                                        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white border-l-4 border-l-orange-500">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                                                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-zinc-500">Invitation Code</span>
                                                {invitations[team.id] ? (
                                                    <div className="flex items-center gap-2">
                                                        <code className="px-3 sm:px-4 py-1.5 sm:py-2 bg-zinc-100 font-mono text-sm sm:text-lg tracking-widest">
                                                            {invitations[team.id].code}
                                                        </code>
                                                        <button
                                                            onClick={() => copyInviteCode(invitations[team.id].code)}
                                                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 transition-colors"
                                                            title="Copy code"
                                                        >
                                                            <Icons.Copy />
                                                        </button>
                                                        <button
                                                            onClick={() => copyInviteLink(invitations[team.id].code)}
                                                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 transition-colors"
                                                            title="Copy invite link"
                                                        >
                                                            <Icons.Link />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => generateInviteCode(team.id)}
                                                        disabled={generatingCode === team.id}
                                                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-zinc-900 text-white text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-orange-500 transition-colors disabled:opacity-50"
                                                    >
                                                        {generatingCode === team.id ? 'Generating...' : 'Generate Code'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Team Members */}
                                <div className="p-6">
                                    <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Team Members</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {team.members?.map((member) => {
                                            const myMembership = team.members?.find(m => m.user_id === user?.id);
                                            const isLeader = myMembership?.role === 'leader';
                                            // Only team leaders can remove members (not admins/superadmins)
                                            const canDelete = isLeader && member.user_id !== user?.id;

                                            const handleRemoveMember = async () => {
                                                if (!confirm(`Remove ${member.profile?.name} from this team?`)) return;
                                                try {
                                                    await supabase.from('team_members').delete().eq('id', member.id);
                                                    toast.success('Member removed');
                                                    loadMyTeams();
                                                } catch (err: any) {
                                                    toast.error(err.message || 'Failed to remove');
                                                }
                                            };

                                            return (
                                                <div
                                                    key={member.id}
                                                    className="flex items-center gap-3 p-4 bg-zinc-50 border-l-4 border-l-transparent hover:border-l-orange-500 transition-colors"
                                                >
                                                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                                                        {member.profile?.name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-zinc-900 truncate">
                                                            {member.profile?.name}
                                                            {member.user_id === user?.id && (
                                                                <span className="ml-2 text-xs text-orange-500">(You)</span>
                                                            )}
                                                        </p>
                                                        <p className="text-sm text-zinc-500 truncate">{member.profile?.email}</p>
                                                    </div>
                                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${member.role === 'leader'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {member.role}
                                                    </span>
                                                    {canDelete && (
                                                        <button
                                                            onClick={handleRemoveMember}
                                                            className="p-2 bg-zinc-100 text-zinc-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                                                            title="Remove member"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
