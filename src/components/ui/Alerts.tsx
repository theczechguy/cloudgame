import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export const Alerts: React.FC = () => {
    const isMonitored = useGameStore((state) => state.isMonitored);
    const lastDropTime = useGameStore((state) => {
        const events = state.dropEvents;
        return events.length > 0 ? events[events.length - 1].t : 0;
    });
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!isMonitored && (Date.now() - lastDropTime < 3000)) {
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isMonitored, lastDropTime]);

    if (!visible) return null;

    return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-50">
            <div className="bg-red-500/90 text-white px-6 py-2 rounded-full shadow-lg border border-red-400 animate-pulse font-bold flex items-center gap-2 backdrop-blur">
                <span className="text-xl">⚠️</span>
                <span>Network Degradation Detected</span>
                {!isMonitored && (
                    <span className="text-xs font-normal opacity-90 ml-2 bg-black/20 px-2 py-0.5 rounded">
                        Info Missing
                    </span>
                )}
            </div>
            {!isMonitored && (
                <div className="text-center mt-1 text-xs text-red-300 shadow-sm font-mono bg-black/50 rounded px-2 py-1 inline-block mx-auto w-full">
                    Deploy <strong>Azure Monitor</strong> to investigate
                </div>
            )}
        </div>
    );
};
