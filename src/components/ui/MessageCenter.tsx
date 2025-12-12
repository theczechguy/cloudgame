import React, { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';

export const MessageCenter: React.FC = () => {
    const notifications = useGameStore((state) => state.notifications);
    const removeNotification = useGameStore((state) => state.removeNotification);

    useEffect(() => {
        // Auto-dismiss info messages after 5s
        const interval = setInterval(() => {
            const now = Date.now();
            notifications.forEach(n => {
                if ((n.type === 'info' || n.type === 'warning') && now - n.timestamp > 5000) {
                    removeNotification(n.id);
                }
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [notifications, removeNotification]);

    return (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[150] flex flex-col gap-2 w-full max-w-lg pointer-events-none">
            {notifications.map((n) => (
                <div
                    key={n.id}
                    className={`
                        p-4 rounded-lg shadow-lg backdrop-blur-md pointer-events-auto transition-all animate-in fade-in slide-in-from-top-4
                        ${n.type === 'info' ? 'bg-blue-900/80 border border-blue-500/50 text-white' : ''}
                        ${n.type === 'warning' ? 'bg-yellow-900/80 border border-yellow-500/50 text-yellow-100' : ''}
                        ${n.type === 'error' ? 'bg-red-900/80 border border-red-500/50 text-red-100' : ''}
                    `}
                >
                    <div className="flex justify-between items-start gap-4">
                        <span className="text-sm font-medium">{n.message}</span>
                        <button
                            onClick={() => removeNotification(n.id)}
                            className="text-xs opacity-70 hover:opacity-100"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
