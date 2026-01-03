import React, { memo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { SERVICE_CATALOG } from '../../services/catalog';

// Icons mapping... matches previous
const ICONS: Record<string, string> = {
    'internet': '☁️',
    'vm': '💻',
    'app-service': '📱',
    'function-app': '⚡',
    'sql-db': '🗄️',
    'traffic-manager': '🌐',
    'load-balancer': '⚖️',
    'storage-queue': '📥',
    'firewall': '🛡️',
    'waf': '🏰',
    'redis': '🚀',
    'blob-storage': '🗃️',
    'azure-monitor': '📊',
    'sql-db-premium': '🚀',
    'cosmos-db': '🪐',
};

interface ServiceNodeProps {
    id: string; // Changed from 'node: GameNode' to 'id: string'
    onMouseDown: (e: React.MouseEvent) => void;
    onClick: (id: string, e: React.MouseEvent) => void;
    isConnectSource: boolean;
    isSelected: boolean;
}

export const ServiceNode: React.FC<ServiceNodeProps> = memo(({ id, onMouseDown, onClick, isConnectSource, isSelected }) => {
    // Selector for granular updates
    const node = useGameStore((state) => state.nodes[id]);
    const isMonitored = useGameStore((state) => state.isMonitored);
    const [hovered, setHovered] = useState(false);
    const nodeLastDrop = useGameStore((state) => state.nodeLastDrop[id]);
    const nodeLastCacheHit = useGameStore((state) => state.nodeLastCacheHit[id]);
    const now = Date.now();
    const isFlashing = !!nodeLastDrop && (now - nodeLastDrop) < 500; // flash for 500ms
    const isCacheHit = !!nodeLastCacheHit && (now - nodeLastCacheHit) < 500;

    if (!node) return null; // Should not happen

    // Color logic
    let queueColor = 'bg-green-500';
    if (node.queue.length > node.maxQueueSize * 0.8) queueColor = 'bg-red-500';
    else if (node.queue.length > node.maxQueueSize * 0.5) queueColor = 'bg-yellow-500';

    const activeCount = node.activeTasks?.length || 0;
    // For storage-queue, active tasks are effectively "buffered" waiting for downstream
    const queueCount = node.type === 'storage-queue'
        ? node.queue.length + activeCount
        : node.queue.length;

    const queuePercent = (node.maxQueueSize && node.maxQueueSize > 0)
        ? Math.min(100, (queueCount / node.maxQueueSize) * 100)
        : 0;


    const isDisabled = node.status === 'disabled';

    return (
        <div
            className={`absolute flex flex-col items-center justify-center w-16 h-16 rounded-lg shadow-lg border-2 transition-transform hover:scale-105 active:scale-95
                ${isSelected ? 'border-white ring-2 ring-blue-400 z-20' : 'border-gray-600 z-10'}
                ${isConnectSource ? 'ring-2 ring-yellow-400 border-yellow-400 animate-pulse' : ''}
                ${isDisabled ? 'opacity-75 grayscale border-dashed border-red-500/50' : 'bg-gray-800'}
                ${!isDisabled ? 'bg-gray-800' : 'bg-gray-900'}
                text-white select-none
            `}
            style={{
                left: node.position.x,
                top: node.position.y,
                transform: 'translate(-50%, -50%)', // Centered
            }}
            onMouseDown={onMouseDown}
            onClick={(e) => onClick(id, e)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {isDisabled && (
                <div className="absolute -top-2 -right-2 p-0.5 bg-red-900 rounded-full border border-red-500 z-30" title="Draining...">⛔</div>
            )}

            {/* Hover Tooltip for function-app showing free requests bucket */}
            {hovered && node.type === 'function-app' && (
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 pointer-events-none z-30">
                    <div className="bg-black/80 text-white text-xs px-2 py-1 rounded shadow-md border border-white/10">
                        {(() => {
                            const def = SERVICE_CATALOG.find(s => s.type === 'function-app');
                            const remaining = typeof node.freeRequestsRemaining === 'number' ? node.freeRequestsRemaining : def?.freeRequests;
                            if (typeof remaining === 'number') {
                                return <>Free requests: <span className="font-mono">{remaining}</span></>;
                            }
                            return <>Free requests: Unlimited</>;
                        })()}
                    </div>
                </div>
            )}
            {/* ... content ... */}
            <div className="text-3xl mb-1">{ICONS[node.type] || '❓'}</div>
            {isMonitored && isFlashing && (
                <div className="absolute inset-0 rounded-lg ring-4 ring-red-400/80 animate-pulse z-30" />
            )}
            {isMonitored && isCacheHit && (
                <div className="absolute inset-0 rounded-lg ring-4 ring-green-400/80 animate-pulse z-30" />
            )}
            <div className="text-[10px] font-bold truncate max-w-full px-1">{node.label}</div>

            {/* Region Badge */}
            {node.regionId && (
                <div className="absolute -top-3 right-0 bg-blue-600 text-[8px] px-1 rounded text-white font-mono border border-blue-400">
                    {node.regionId.split('-')[1] || 'REG'}
                </div>
            )}

            {/* Utilization Bar (Vertical Left) */}
            {isMonitored && node.type !== 'internet' && node.type !== 'storage-queue' && (
                <div
                    className="absolute -left-3 bottom-0 w-2 h-full bg-gray-700/50 rounded-sm overflow-hidden flex flex-col justify-end border border-gray-600/50"
                    title={`Utilization: ${Math.round((node.utilization || 0) * 100)}%`}
                >
                    <div
                        className="w-full bg-cyan-400/80 transition-all duration-200"
                        style={{ height: `${(node.utilization || 0) * 100}%` }}
                    />
                </div>
            )}

            {/* Controls Overlay (Tuning) */}
            {isSelected && (
                <div
                    className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-gray-500 rounded p-2 z-50 w-32 shadow-xl"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="text-[10px] text-gray-300 mb-1">Processing Speed</div>
                    <div className="flex items-center gap-2">
                        <input
                            type="range"
                            min="1"
                            max="100"
                            // Default to catalog value if missing
                            value={node.processingSpeed || 10}
                            onChange={(e) => {
                                const updateNode = useGameStore.getState().updateNode;
                                updateNode(id, { processingSpeed: Number(e.target.value) });
                            }}
                            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[10px] w-6 text-right font-mono">{Math.round(node.processingSpeed || 1)}</span>
                    </div>
                </div>
            )}

            {/* Queue Bar (Vertical Right) */}
            {isMonitored && node.type !== 'internet' && node.maxQueueSize > 0 && (
                <div
                    className="absolute -right-3 bottom-0 w-2 h-full bg-gray-700/50 rounded-sm overflow-hidden flex flex-col justify-end border border-gray-600/50"
                    title={`Queue: ${node.queue.length}/${node.maxQueueSize}`}
                >
                    <div
                        className={`w-full transition-all duration-200 ${queueColor}`}
                        style={{ height: `${queuePercent}%` }}
                    />
                </div>
            )}
        </div>
    );
});
