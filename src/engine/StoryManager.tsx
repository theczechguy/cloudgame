import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export const StoryManager = () => {
    const gameMode = useGameStore((state) => state.gameMode);
    const spawnRate = useGameStore((state) => state.spawnRate);
    const setSpawnRate = useGameStore((state) => state.setSpawnRate);
    const addNotification = useGameStore((state) => state.addNotification);

    // Store spawn rate in ref to avoid effect re-running on every change
    // but we actually WANT the effect to set up the interval.
    // However, for a simple difficulty loop, we can use a ref to track "next update time".

    useEffect(() => {
        if (gameMode !== 'story') return;

        const interval = setInterval(() => {
            // Logic: Increase spawn rate (decrease ms) every 30 seconds
            // Base: 500ms (2 req/s)
            // Goal: +0.5 req/s every 30s. 
            // 2.0 -> 2.5 (400ms) -> 3.0 (333ms) -> 3.5 (285ms) etc.

            const currentReqsPerSec = 1000 / Math.max(spawnRate, 1); // Avoid div/0
            const nextReqsPerSec = currentReqsPerSec + 0.5;
            const nextSpawnRate = 1000 / nextReqsPerSec;

            if (nextSpawnRate < 10) return; // Cap at 100 req/s to prevent crash

            setSpawnRate(nextSpawnRate);
            addNotification(`Traffic increasing! Now at ${nextReqsPerSec.toFixed(1)} req/s`, 'warning');

        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [gameMode, spawnRate, setSpawnRate, addNotification]);

    return null; // Logic only
};
