import React from 'react';
import { useGameStore } from '../../store/gameStore';

export const MissionBriefing: React.FC = () => {
    const show = useGameStore((state) => state.showStoryIntro);
    const setShow = useGameStore((state) => state.setShowStoryIntro);
    const gameMode = useGameStore((state) => state.gameMode);

    if (!show || gameMode !== 'story') return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border-2 border-blue-500 rounded-lg max-w-lg w-full p-8 shadow-2xl relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <svg className="w-32 h-32 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                </div>

                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Mission: <span className="text-blue-400">Startup Survival</span></h1>
                <p className="text-blue-200 text-sm font-mono mb-6 uppercase tracking-wider">Priority: Critical // Status: Active</p>

                <div className="space-y-4 text-gray-300 leading-relaxed mb-8">
                    <p>
                        Welcome, Architect. You have been tasked with building the infrastructure for the next unicorn startup.
                    </p>
                    <p>
                        <strong>The Goal:</strong> Survive waves of increasing user traffic without going bankrupt or crashing the system.
                    </p>
                    <div className="bg-gray-800/50 p-6 rounded border border-gray-700 text-gray-300 leading-relaxed text-sm space-y-4 font-mono">
                        <p>
                            <strong className="text-blue-400">OPERATIONAL DIRECTIVE:</strong>
                            <br />
                            Your objective is to scale this startup's infrastructure to handle massive user growth. Use the <strong>Bottom Dock</strong> to deploy services—starting with <span className="text-white">Function Apps</span> for compute. Connect them to the Internet node (max 1 link!) by dragging or using Shift+Click. Traffic flows strictly from Left to Right.
                        </p>

                        <p>
                            <strong className="text-blue-400">THREAT ASSESSMENT:</strong>
                            <br />
                            Watch the packet colors. <span className="text-green-400">Green</span> is healthy web traffic. <span className="text-blue-400">Blue</span> indicates database queries (you'll need SQL nodes). <span className="text-red-400">Red</span> is malicious—deploy security measures immediately if spotted.
                        </p>

                        <p>
                            <strong className="text-blue-400">ADVISORY:</strong>
                            <br />
                            Use the Mouse Wheel to zoom and Drag to pan the blueprint. Inspect individual node performance by clicking on them. Good luck, Architect.
                        </p>
                    </div>
                    <p className="text-sm italic text-gray-400">
                        "The Internet is brutal. Expect spikes, attacks, and exponential growth. Good luck."
                    </p>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={() => setShow(false)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        <span>Start Mission</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
