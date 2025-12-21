import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { STORY_WAVES } from '../config/storyWaves';

export const StoryManager = () => {
    const gameMode = useGameStore((state) => state.gameMode);
    const currentWaveIndex = useGameStore((state) => state.currentWaveIndex);
    const setWaveIndex = useGameStore((state) => state.setWaveIndex);
    const setWaveConfig = useGameStore((state) => state.setWaveConfig);
    const addNotification = useGameStore((state) => state.addNotification);
    const isPaused = useGameStore((state) => state.isPaused);
    const togglePause = useGameStore((state) => state.togglePause);
    const [progress, setProgress] = useState(0);
    const [waveTimeLeft, setWaveTimeLeft] = useState(30);

    const startTimeRef = useRef(Date.now());
    const waveInitializedRef = useRef(false);

    useEffect(() => {
        if (gameMode !== 'story') {
            setProgress(0);
            setWaveIndex(0);
            waveInitializedRef.current = false;
            return;
        }

        // Initialize First Wave
        if (!waveInitializedRef.current) {
            const firstWave = STORY_WAVES[0];
            setWaveConfig(firstWave.traffic);
            startTimeRef.current = Date.now();
            waveInitializedRef.current = true;
            // addNotification(firstWave.message, 'info'); // Maybe too noisy on immediate start
        }

        const interval = setInterval(() => {
            const showIntro = useGameStore.getState().showStoryIntro;
            const isPaused = useGameStore.getState().isPaused; // Check pause state

            if (showIntro || isPaused) {
                // Reset timer start so we don't count the time spent in modal or paused state
                // This "slides" the start time forward as long as we are paused
                startTimeRef.current = Date.now() - (progress / 100 * (STORY_WAVES[currentWaveIndex]?.duration || 1) * 1000);
                return; // Pause
            }

            const currentWave = STORY_WAVES[currentWaveIndex];
            if (!currentWave) return;

            const durationMs = currentWave.duration * 1000;
            const now = Date.now();
            const elapsed = now - startTimeRef.current;

            // Update UI
            setWaveTimeLeft(Math.max(0, Math.ceil((durationMs - elapsed) / 1000)));
            setProgress(Math.min(100, (elapsed / durationMs) * 100));

            // Wave Complete?
            if (elapsed >= durationMs) {
                // Determine Next Wave
                const nextIndex = currentWaveIndex + 1;

                if (nextIndex < STORY_WAVES.length) {
                    // Advance to Next Defined Wave
                    const nextWave = STORY_WAVES[nextIndex];
                    setWaveIndex(nextIndex);
                    setWaveConfig(nextWave.traffic);
                    addNotification(nextWave.message, 'info');

                    // Reset Timer
                    startTimeRef.current = Date.now();
                    setProgress(0);
                } else {
                    // End of Scripted Waves -> Infinite Scaling (Stress Test)
                    // We just keep the last wave active but could implement a scaler here.
                    // For now, let's just loop the last wave or hold.
                }
            }
        }, 200);

        return () => clearInterval(interval);
    }, [gameMode, currentWaveIndex, setWaveConfig, addNotification, progress]); // Added progress dep to ensure pause math works? Actually useRef/getState avoids deps usually, but progress state is used in math.

    if (gameMode !== 'story') return null;

    const currentWave = STORY_WAVES[currentWaveIndex];

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 w-96 z-[160] flex flex-col items-center gap-1">
            {/* Wave Info & Pause Control */}
            <div className="flex items-center gap-4">
                <div className="text-[10px] uppercase font-bold text-blue-200 tracking-widest shadow-black drop-shadow-md pointer-events-none">
                    Wave {currentWaveIndex + 1}: {currentWave?.name || 'Unknown'}
                </div>

                {/* Pause Button (Pointer Events Enabled) */}
                <button
                    onClick={() => togglePause()}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border transition-colors ${isPaused
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300 hover:bg-yellow-500/40'
                        : 'bg-gray-800/50 border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
                        }`}
                >
                    {isPaused ? 'RESUME' : 'PAUSE'}
                </button>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-900/80 backdrop-blur rounded-full h-6 w-full border border-gray-600 flex items-center relative overflow-hidden px-3 shadow-xl pointer-events-none">
                <div
                    className={`absolute left-0 top-0 bottom-0 transition-all duration-200 ease-linear ${isPaused ? 'bg-yellow-500/20' : 'bg-gradient-to-r from-blue-900/60 to-cyan-500/50'
                        }`}
                    style={{ width: `${progress}%` }}
                />
                <div className="relative z-10 flex justify-between w-full text-[10px] font-mono text-cyan-100 uppercase font-bold">
                    <span>{isPaused ? 'PAUSED' : 'Next Phase'}</span>
                    <span>{waveTimeLeft}s</span>
                </div>
            </div>
        </div>
    );
};
