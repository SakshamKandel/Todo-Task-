import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, AMAZON_POINTS, AMAZON_TASK_LABELS, AmazonTaskType } from '../lib/database.types';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

interface ReportData {
    user: Profile;
    tasks: any[];
    totalPoints: number;
    totalTasks: number;
    breakdown: Record<AmazonTaskType, { count: number; points: number }>;
}

export default function AmazonReports() {
    const { isRole } = useAuth();
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [reports, setReports] = useState<ReportData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, [month]);

    const fetchReports = async () => {
        setLoading(true);
        const date = new Date(month + '-01'); // Ensure valid date
        const start = startOfMonth(date).toISOString();
        const end = endOfMonth(date).toISOString();

        try {
            // Fetch users
            const { data: profiles } = await supabase.from('profiles').select('*');
            if (!profiles) return;

            // Fetch tasks
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('is_amazon', true)
                .eq('status', 'completed')
                .gte('completed_at', start)
                .lte('completed_at', end);

            if (!tasks) return;

            const reportData: ReportData[] = profiles.map(user => {
                const userTasks = tasks.filter(t => t.assigned_to === user.id);
                const breakdown: Record<string, { count: number; points: number }> = {};

                // Initialize breakdown
                Object.keys(AMAZON_POINTS).forEach(key => {
                    breakdown[key] = { count: 0, points: 0 };
                });

                let totalPoints = 0;

                userTasks.forEach(task => {
                    if (task.amazon_tasks) {
                        task.amazon_tasks.forEach((item: any) => {
                            if (breakdown[item.type]) {
                                breakdown[item.type].count += item.quantity;
                                const points = (AMAZON_POINTS[item.type as AmazonTaskType] || 0) * item.quantity;
                                breakdown[item.type].points += points;
                                totalPoints += points;
                            }
                        });
                    }
                });

                return {
                    user,
                    tasks: userTasks,
                    totalPoints,
                    totalTasks: userTasks.length,
                    breakdown: breakdown as any
                };
            }).filter(r => r.totalTasks > 0);

            setReports(reportData.sort((a, b) => b.totalPoints - a.totalPoints));

        } catch (error) {
            console.error('Error loading reports:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isRole('superadmin') && !isRole('admin')) {
        return <div className="p-8 text-center text-gray-500">Access Restricted</div>;
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-6xl mx-auto my-8">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Monthly Amazon Report</h2>
                    <p className="text-gray-500">Performance summary for {format(parseISO(month + '-01'), 'MMMM yyyy')}</p>
                </div>
                <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                />
            </div>

            <div className="p-6 overflow-x-auto">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading reports...</div>
                ) : reports.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">No data found for this month.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="p-4 rounded-tl-xl">Team Member</th>
                                <th className="p-4 text-center">Total Tasks</th>
                                <th className="p-4 text-center">Total Points</th>
                                <th className="p-4 text-right rounded-tr-xl">Breakdown</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reports.map((report) => (
                                <tr key={report.user.id} className="hover:bg-orange-50/30 transition-colors">
                                    <td className="p-4 font-medium text-gray-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                                                {report.user.name?.charAt(0) || 'U'}
                                            </div>
                                            {report.user.name}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center font-bold text-gray-600">{report.totalTasks}</td>
                                    <td className="p-4 text-center font-black text-orange-600 text-lg">
                                        {report.totalPoints.toFixed(2)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            {Object.entries(report.breakdown).map(([type, stats]) => {
                                                if (stats.count === 0) return null;
                                                return (
                                                    <div key={type} className="text-xs bg-white border border-gray-100 rounded px-2 py-1 shadow-sm" title={AMAZON_TASK_LABELS[type as AmazonTaskType]}>
                                                        <span className="font-semibold text-gray-600">{stats.count}</span>
                                                        <span className="text-gray-400 mx-1">×</span>
                                                        <span className="text-[10px] text-gray-400 uppercase max-w-[60px] truncate inline-block align-bottom">
                                                            {type.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
