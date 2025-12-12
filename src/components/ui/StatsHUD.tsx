import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { SERVICE_CATALOG } from '../../services/catalog';

export const StatsHUD: React.FC = () => {

    const addRegion = useGameStore(s => s.addRegion); // Debug
    const nodes = useGameStore((state) => state.nodes);
    const nodeIds = useGameStore((state) => state.nodeIds);
    const recentIncome = useGameStore((state) => state.recentIncome);
    const money = useGameStore((state) => state.money);
    const fps = useGameStore((state) => state.fps);
    const packets = useGameStore((state) => state.packets);
    const recentDrops = useGameStore((state) => state.recentDrops);
    const totalDrops = useGameStore((state) => state.totalDrops);

    const costBreakdown = React.useMemo(() => {
        type Item = {
            type: string;
            label: string;
            count: number;
            upkeepPerInstance: number;
            upkeepTotal: number;
            execPerSecTotal: number;
            dynamicUpkeepTotal: number; // For per-node costs like Monitoring
            freeRemainingTotal?: number;
        };

        const map: Record<string, Item> = {};
        const totalNodes = Object.keys(nodes).length;

        Object.values(nodes).forEach(n => {
            const def = SERVICE_CATALOG.find(s => s.type === n.type);
            const upkeepPer = def?.upkeep || 0;
            const existing = map[n.type] || {
                type: n.type,
                label: def?.label || n.type,
                count: 0,
                upkeepPerInstance: upkeepPer,
                upkeepTotal: 0,
                execPerSecTotal: 0,
                dynamicUpkeepTotal: 0
            } as Item;

            existing.count += 1;
            existing.upkeepTotal += upkeepPer;

            // Dynamic per-node upkeep (Monitoring)
            if (def?.perNodeUpkeep) {
                existing.dynamicUpkeepTotal += (totalNodes * def.perNodeUpkeep);
            }

            // Estimate execution cost for function-apps when their free bucket is exhausted
            if (n.type === 'function-app' && def?.perRequestCost) {
                const freeLeft = typeof n.freeRequestsRemaining === 'number' ? n.freeRequestsRemaining : def.freeRequests ?? 0;
                const execPerSec = freeLeft > 0 ? 0 : ((n.processingSpeed || 0) * def.perRequestCost);
                existing.execPerSecTotal += execPerSec;
                existing.freeRemainingTotal = (existing.freeRemainingTotal || 0) + (typeof n.freeRequestsRemaining === 'number' ? n.freeRequestsRemaining : def.freeRequests ?? 0);
            }

            map[n.type] = existing;
        });

        const items = Object.values(map).map(it => ({
            ...it,
            total: it.upkeepTotal + it.execPerSecTotal + it.dynamicUpkeepTotal
        } as any)).sort((a, b) => b.total - a.total);

        const total = items.reduce((s, it) => s + it.total, 0);
        return { items, total };
    }, [nodes]);

    return (
        <div className="text-white font-mono p-4 bg-black/60 rounded backdrop-blur border border-white/10 shadow-xl pointer-events-auto w-64">
            <div className="text-2xl font-bold text-green-400 mb-2">${money.toFixed(0)}</div>
            <div className="text-sm opacity-80">Income: <span className={recentIncome >= 0 ? 'text-green-400' : 'text-red-400'}>${recentIncome.toFixed(1)}/s</span></div>
            <div className="text-sm opacity-80">FPS: {fps}</div>
            <div className="text-sm opacity-80">Packets: {packets.length}</div>
            <div className="text-sm opacity-80">Nodes: {nodeIds.length}</div>
            <div className="text-sm opacity-80">Drops: <span className="text-red-400">{recentDrops}/s</span> total <span className="font-mono">{totalDrops}</span></div>
            <div className="text-sm opacity-80 mt-2">
                Traffic: <span className="text-blue-300 font-bold">{(1000 / Math.max(1, useGameStore.getState().spawnRate)).toFixed(1)} req/s</span>
            </div>
            <div className="mt-2 text-sm border-t border-white/10 pt-2">
                <div className="font-semibold mb-1">Upkeep: ${costBreakdown.total.toFixed(2)}/s</div>
                <div className="space-y-1">
                    {costBreakdown.items.map((it: any) => (
                        <div key={it.type} className="text-xs opacity-80">
                            <div className="flex justify-between">
                                <span>{it.label} x{it.count}</span>
                                <span>${it.upkeepTotal.toFixed(1)}/s</span>
                            </div>
                            {it.dynamicUpkeepTotal > 0 && (
                                <div className="text-[10px] pl-2 text-blue-400">
                                    + ingestion: ${it.dynamicUpkeepTotal.toFixed(1)}/s
                                </div>
                            )}
                            {it.execPerSecTotal > 0 && (
                                <div className="text-[10px] pl-2 text-yellow-500">
                                    + exec: ${it.execPerSecTotal.toFixed(2)}/s
                                </div>
                            )}
                            {typeof it.freeRemainingTotal === 'number' && it.freeRemainingTotal > 0 && (
                                <div className="text-[10px] pl-2 opacity-60">Free: {it.freeRemainingTotal}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            {/* Debug Actions */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
                <div className="text-[10px] uppercase font-bold text-white/50">Debug</div>
                <button
                    onClick={() => addRegion({
                        id: `region-${Date.now()}`,
                        label: 'New Region',
                        x: 1400 + (Math.random() * 200),
                        y: 1400 + (Math.random() * 200),
                        width: 300,
                        height: 300
                    })}
                    className="bg-blue-900/50 hover:bg-blue-800 text-blue-200 px-3 py-1 rounded text-xs border border-blue-700/50"
                >
                    + Spawn Region
                </button>

            </div>
        </div>
    );
};
