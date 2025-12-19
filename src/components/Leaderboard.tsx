import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, Team, AMAZON_POINTS } from '../lib/database.types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

interface LeaderboardEntry {
    profile: Profile;
    totalPoints: number;
    completedTasks: number;
    averageRating: number | null;
    ratingCount: number;
    score: number;
}

interface LeaderboardProps {
    teamId?: string;
}

export default function Leaderboard({ teamId }: LeaderboardProps) {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date());
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(teamId || null);

    useEffect(() => {
        loadUserTeams();
    }, [user]);

    useEffect(() => {
        if (selectedTeam) {
            fetchLeaderboardData();
        }
    }, [month, selectedTeam]);

    const loadUserTeams = async () => {
        if (!user) return;

        const { data: memberData } = await supabase
            .from('team_members')
            .select('team_id, teams(*)')
            .eq('user_id', user.id);

        if (memberData && memberData.length > 0) {
            const userTeams = memberData.map((m: any) => m.teams).filter(Boolean) as Team[];
            setTeams(userTeams);

            if (!selectedTeam && userTeams.length > 0) {
                setSelectedTeam(userTeams[0].id);
            }
        }
    };

    const fetchLeaderboardData = async () => {
        if (!selectedTeam) return;

        setLoading(true);
        const start = startOfMonth(month).toISOString();
        const end = endOfMonth(month).toISOString();

        try {
            const { data: teamMembers } = await supabase
                .from('team_members')
                .select('user_id, profiles(*)')
                .eq('team_id', selectedTeam);

            if (!teamMembers) return;

            const profiles = teamMembers.map((m: any) => m.profiles).filter(Boolean) as Profile[];

            const { data: tasks } = await supabase
                .from('tasks')
                .select('*, task_ratings(*)')
                .eq('team_id', selectedTeam)
                .eq('is_amazon', true)
                .eq('status', 'completed')
                .gte('completed_at', start)
                .lte('completed_at', end) as { data: any[] | null };

            if (!tasks) {
                setEntries([]);
                return;
            }

            const leaderboardData: LeaderboardEntry[] = profiles.map(profile => {
                const userTasks = tasks.filter((t: any) => t.assigned_to === profile.id);

                const totalPoints = userTasks.reduce((sum: number, task: any) => {
                    if (!task.amazon_tasks) return sum;
                    const taskPoints = (task.amazon_tasks as any[]).reduce((pSum: number, item: any) => {
                        const points = AMAZON_POINTS[item.type as keyof typeof AMAZON_POINTS] || 0;
                        return pSum + points * item.quantity;
                    }, 0);
                    return sum + taskPoints;
                }, 0);

                const ratings = userTasks.flatMap((t: any) => t.task_ratings || []).map((r: any) => r.rating).filter(Boolean);
                const ratingCount = ratings.length;
                const averageRating = ratingCount > 0
                    ? ratings.reduce((a, b) => a + b, 0) / ratingCount
                    : null;

                const ratingScore = (averageRating || 0) * 10;
                const volumeScore = Math.log2(totalPoints + 1) * 5;
                const score = totalPoints > 0 ? (ratingScore + volumeScore) : 0;

                return {
                    profile,
                    totalPoints,
                    completedTasks: userTasks.length,
                    averageRating,
                    ratingCount,
                    score
                };
            });

            setEntries(leaderboardData.sort((a, b) => b.score - a.score));

        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (index: number) => {
        if (index === 0) return '🏆';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Team Selector */}
                {teams.length > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Team:</span>
                        <div className="flex gap-2">
                            {teams.map(team => (
                                <button
                                    key={team.id}
                                    onClick={() => setSelectedTeam(team.id)}
                                    className={`px-4 py-2 text-sm font-bold uppercase tracking-wide transition-all ${selectedTeam === team.id
                                        ? 'bg-zinc-900 text-white'
                                        : 'bg-white text-zinc-600 hover:bg-zinc-100'
                                        }`}
                                >
                                    {team.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Month Selector */}
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Period:</span>
                    <input
                        type="month"
                        value={format(month, 'yyyy-MM')}
                        onChange={(e) => setMonth(new Date(e.target.value + '-01'))}
                        className="px-4 py-2 bg-white text-zinc-900 font-bold text-sm border-l-4 border-l-orange-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Leaderboard Content */}
            {teams.length === 0 ? (
                <div className="bg-white p-12 text-center">
                    <div className="w-20 h-20 bg-zinc-100 mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-10 h-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <p className="text-lg font-bold text-zinc-900 uppercase">No Team Found</p>
                    <p className="text-sm text-zinc-500 mt-1">Join a team to see the leaderboard</p>
                </div>
            ) : loading ? (
                <div className="bg-white p-12 text-center">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm font-bold uppercase text-zinc-500">Loading Rankings...</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {entries.filter(e => e.totalPoints > 0).map((entry, index) => (
                        <div
                            key={entry.profile.id}
                            className={`flex items-center gap-4 p-5 bg-white transition-all hover:translate-x-1 ${index === 0 ? 'border-l-4 border-l-yellow-500' :
                                index === 1 ? 'border-l-4 border-l-zinc-400' :
                                    index === 2 ? 'border-l-4 border-l-orange-400' :
                                        'border-l-4 border-l-zinc-200'
                                }`}
                        >
                            {/* Rank */}
                            <div className={`w-14 h-14 flex items-center justify-center font-black text-2xl ${index === 0 ? 'bg-yellow-100 text-yellow-600' :
                                index === 1 ? 'bg-zinc-100 text-zinc-600' :
                                    index === 2 ? 'bg-orange-100 text-orange-600' :
                                        'bg-zinc-50 text-zinc-400'
                                }`}>
                                {getRankIcon(index) || (index + 1)}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg text-zinc-900 truncate">{entry.profile.name}</h3>
                                <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
                                    {entry.completedTasks} tasks · {entry.ratingCount} ratings
                                </p>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Rating</p>
                                    <div className="flex items-center gap-1 justify-end">
                                        <span className="text-xl font-black text-orange-500">
                                            {entry.averageRating ? entry.averageRating.toFixed(1) : '-'}
                                        </span>
                                        <span className="text-orange-400">★</span>
                                    </div>
                                </div>
                                <div className="w-20 text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Score</p>
                                    <p className="text-3xl font-black text-zinc-900">{entry.score.toFixed(0)}</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {entries.filter(e => e.totalPoints > 0).length === 0 && (
                        <div className="bg-white p-12 text-center">
                            <div className="w-20 h-20 bg-zinc-100 mx-auto mb-4 flex items-center justify-center text-4xl">
                                📊
                            </div>
                            <p className="text-lg font-bold text-zinc-900 uppercase">No Data Yet</p>
                            <p className="text-sm text-zinc-500 mt-1">
                                No Amazon tasks completed in {format(month, 'MMMM yyyy')}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 py-4 text-xs text-zinc-400">
                <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-yellow-500" /> 1st Place
                </span>
                <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-zinc-400" /> 2nd Place
                </span>
                <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-orange-400" /> 3rd Place
                </span>
            </div>
        </div>
    );
}
