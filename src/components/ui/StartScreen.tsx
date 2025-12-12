import React from 'react';
import { useGameStore } from '../../store/gameStore';

export const StartScreen: React.FC = () => {
    const setGameMode = useGameStore((state) => state.setGameMode);
    const setSpawnRate = useGameStore((state) => state.setSpawnRate);
    const addNotification = useGameStore((state) => state.addNotification);
    const resetToStoryState = useGameStore((state) => state.resetToStoryState);

    const handleStartStory = () => {
        resetToStoryState();
        setSpawnRate(500); // Start slow (2 req/s)
        addNotification("Welcome to Cloud Tycoon! Traffic is light... for now.", "info");

        // Schedule first difficulty increase? This might belong in GameLoop or a hook.
    };

    const handleStartSandbox = () => {
        setGameMode('sandbox');
        setSpawnRate(100); // Fast for sandbox (10 req/s)
        addNotification("Sandbox Mode: Build whatever you want!", "info");
    };

    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-900 bg-opacity-95 text-white">
            <div className="max-w-2xl w-full p-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 text-center">
                <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                    Cloud Tycoon
                </h1>
                <p className="text-xl text-slate-300 mb-12">
                    Architect the future. survive the load.
                </p>

                <div className="grid grid-cols-2 gap-8">
                    <button
                        onClick={handleStartStory}
                        className="group p-6 bg-slate-700 hover:bg-slate-600 rounded-xl border border-slate-600 hover:border-blue-500 transition-all duration-300 flex flex-col items-center gap-4"
                    >
                        <span className="text-4xl">🚀</span>
                        <h2 className="text-2xl font-bold group-hover:text-blue-400">Story Mode</h2>
                        <p className="text-slate-400 text-sm">
                            Start small. Survive scalable growth.
                            <br />
                            <span className="text-yellow-400">Warning: Traffic increases over time.</span>
                        </p>
                    </button>

                    <button
                        onClick={handleStartSandbox}
                        className="group p-6 bg-slate-700 hover:bg-slate-600 rounded-xl border border-slate-600 hover:border-green-500 transition-all duration-300 flex flex-col items-center gap-4"
                    >
                        <span className="text-4xl">🏗️</span>
                        <h2 className="text-2xl font-bold group-hover:text-green-400">Sandbox</h2>
                        <p className="text-slate-400 text-sm">
                            Unlimited resources. Full control.
                            <br />
                            Test your wildest architectures.
                        </p>
                    </button>
                </div>
            </div>
        </div>
    );
};
