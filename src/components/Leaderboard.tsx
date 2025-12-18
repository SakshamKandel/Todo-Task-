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
    teamId?: string; // Optional: if provided, show only this team
}

export default function Leaderboard({ teamId }: LeaderboardProps) {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date());
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(teamId || null);

    // Load teams on mount
    useEffect(() => {
        loadUserTeams();
    }, [user]);

    // Reload leaderboard when team or month changes
    useEffect(() => {
        if (selectedTeam) {
            fetchLeaderboardData();
        }
    }, [month, selectedTeam]);

    const loadUserTeams = async () => {
        if (!user) return;

        // Get teams the user belongs to
        const { data: memberData } = await supabase
            .from('team_members')
            .select('team_id, teams(*)')
            .eq('user_id', user.id);

        if (memberData && memberData.length > 0) {
            const userTeams = memberData.map((m: any) => m.teams).filter(Boolean) as Team[];
            setTeams(userTeams);

            // Auto-select first team if none selected
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
            // 1. Fetch team members
            const { data: teamMembers } = await supabase
                .from('team_members')
                .select('user_id, profiles(*)')
                .eq('team_id', selectedTeam);

            if (!teamMembers) return;

            const profiles = teamMembers.map((m: any) => m.profiles).filter(Boolean) as Profile[];

            // 2. Fetch completed Amazon tasks for the team for the month
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*, task_ratings(*)')
                .eq('team_id', selectedTeam)
                .eq('is_amazon', true)
                .eq('status', 'completed')
                .gte('completed_at', start)
                .lte('completed_at', end);

            if (!tasks) {
                setEntries([]);
                return;
            }

            // 3. Calculate scores
            const leaderboardData: LeaderboardEntry[] = profiles.map(profile => {
                const userTasks = tasks.filter(t => t.assigned_to === profile.id);

                // Calculate Total Points (Quantity)
                const totalPoints = userTasks.reduce((sum, task) => {
                    if (!task.amazon_tasks) return sum;
                    const taskPoints = task.amazon_tasks.reduce((pSum: number, item: any) => {
                        return pSum + (AMAZON_POINTS[item.type] || 0) * item.quantity;
                    }, 0);
                    return sum + taskPoints;
                }, 0);

                // Calculate Average Rating (Quality)
                const ratings = userTasks.flatMap(t => t.task_ratings || []).map(r => r.rating).filter(Boolean);
                const ratingCount = ratings.length;
                const averageRating = ratingCount > 0
                    ? ratings.reduce((a, b) => a + b, 0) / ratingCount
                    : null;

                // Score Formula: (Avg Rating * 10) + (log2(Points + 1) * 5)
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

            // Sort by score
            setEntries(leaderboardData.sort((a, b) => b.score - a.score));

        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectedTeamName = teams.find(t => t.id === selectedTeam)?.name || 'Team';

    return (
        <div className="bg-white overflow-hidden max-w-4xl mx-auto my-4">
            <div className="p-6 bg-orange-500 text-white">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-1">Rankings</p>
                        <h2 className="text-2xl font-bold uppercase tracking-tight">
                            Team Leaderboard
                        </h2>
                    </div>
                    {/* Month Selector */}
                    <input
                        type="month"
                        value={format(month, 'yyyy-MM')}
                        onChange={(e) => setMonth(new Date(e.target.value + '-01'))}
                        className="bg-orange-400 text-white border-0 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                </div>
                <p className="text-sm text-white/80">
                    Ranking based on Quality (Ratings) and Quantity (Points) for {format(month, 'MMMM yyyy')}
                </p>
            </div>

            {/* Team Selector */}
            {teams.length > 0 && (
                <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50">
                    <div className="flex items-center gap-4">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Organization:</span>
                        <div className="flex gap-2 flex-wrap">
                            {teams.map(team => (
                                <button
                                    key={team.id}
                                    onClick={() => setSelectedTeam(team.id)}
                                    className={`px-4 py-1.5 text-sm font-bold uppercase transition-all ${selectedTeam === team.id
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-white text-zinc-600 border border-zinc-200 hover:border-orange-300'
                                        }`}
                                >
                                    {team.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6">
                {teams.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p className="text-lg font-medium">You're not part of any team yet</p>
                        <p className="text-sm mt-2">Join a team to see the leaderboard</p>
                    </div>
                ) : loading ? (
                    <div className="text-center py-12 text-gray-400">Loading ranking data...</div>
                ) : (
                    <div className="space-y-4">
                        {entries.filter(e => e.totalPoints > 0).map((entry, index) => (
                            <div
                                key={entry.profile.id}
                                className={`flex items-center p-4 rounded-xl border ${index === 0 ? 'bg-yellow-50 border-yellow-200 ring-1 ring-yellow-300' :
                                    index === 1 ? 'bg-gray-50 border-gray-200' :
                                        index === 2 ? 'bg-orange-50 border-orange-200' :
                                            'bg-white border-gray-100'
                                    }`}
                            >
                                {/* Rank */}
                                <div className={`w-12 h-12 flex items-center justify-center rounded-full font-bold text-xl mr-4 ${index === 0 ? 'bg-yellow-400 text-white shadow-lg' :
                                    index === 1 ? 'bg-gray-400 text-white shadow' :
                                        index === 2 ? 'bg-orange-400 text-white shadow' :
                                            'bg-slate-100 text-slate-500'
                                    }`}>
                                    {index + 1}
                                </div>

                                {/* User Info */}
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800 text-lg">{entry.profile.name}</h3>
                                    <p className="text-sm text-gray-500">{entry.completedTasks} tasks completed</p>
                                </div>

                                {/* Stats Grid */}
                                <div className="flex gap-8 text-right">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Points</p>
                                        <p className="font-bold text-indigo-600">{entry.totalPoints.toFixed(0)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Rating</p>
                                        <div className="flex items-center gap-1 justify-end">
                                            <span className="font-bold text-orange-500">
                                                {entry.averageRating ? entry.averageRating.toFixed(1) : '-'}
                                            </span>
                                            <span className="text-xs text-gray-300">★</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Score</p>
                                        <p className="font-black text-2xl text-gray-800">{entry.score.toFixed(0)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {entries.filter(e => e.totalPoints > 0).length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                No Amazon tasks completed in {selectedTeamName} this month.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
