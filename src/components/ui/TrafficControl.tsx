import React from 'react';
import { useGameStore } from '../../store/gameStore';

export const TrafficControl: React.FC = () => {
    const spawnRate = useGameStore((state) => state.spawnRate);
    const setSpawnRate = useGameStore((state) => state.setSpawnRate);
    const sandboxMode = useGameStore((state) => state.sandboxMode);
    const toggleSandboxMode = useGameStore((state) => state.toggleSandboxMode);

    // Convert milliseconds to requests per second (approx) for display
    // Rate: 100ms = 10 req/s, 2000ms = 0.5 req/s
    const reqPerSec = (1000 / spawnRate).toFixed(1);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Slider value: 1 to 20 (req/s)
        // Convert back to ms
        const rps = parseFloat(e.target.value);
        const newRate = 1000 / rps;
        setSpawnRate(newRate);
    };

    return (
        <div className="bg-gray-900/90 p-4 rounded-lg border border-gray-700 text-white shadow-xl pointer-events-auto w-64 select-none">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 border-b border-gray-700 pb-1">Traffic Control</h3>

            <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-400">Load:</span>
                    <span className={parseFloat(reqPerSec) > 5 ? 'text-red-400' : 'text-green-400'}>
                        {reqPerSec} req/s
                    </span>
                </div>

                <input
                    type="range"
                    min="0.5"
                    max="30"
                    step="0.5"
                    value={reqPerSec}
                    onChange={handleChange}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />

                <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Chill</span>
                    <span>Stress</span>
                </div>

                <div className="pt-2 border-t border-gray-700 mt-2">
                    <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-xs text-gray-400 group-hover:text-white transition-colors">Sandbox Mode</span>
                        <input
                            type="checkbox"
                            checked={sandboxMode}
                            onChange={toggleSandboxMode}
                            className="h-4 w-4 bg-gray-700 border-gray-500 rounded cursor-pointer accent-yellow-500"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};
