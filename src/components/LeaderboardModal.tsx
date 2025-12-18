import { useUIStore } from '../store';
import Leaderboard from './Leaderboard';

export default function LeaderboardModal() {
    const { leaderboardOpen, closeLeaderboard } = useUIStore();

    if (!leaderboardOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[9998] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

                {/* Premium Header */}
                <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-1">Rankings</p>
                        <h2 className="text-3xl font-bold text-zinc-900 uppercase tracking-tight">
                            Leaderboard
                        </h2>
                    </div>
                    <button
                        onClick={closeLeaderboard}
                        className="w-12 h-12 flex items-center justify-center bg-zinc-100 text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-zinc-50">
                    <Leaderboard />
                </div>
            </div>
        </div>
    );
}
