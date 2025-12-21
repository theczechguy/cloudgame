import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { SERVICE_CATALOG } from '../../services/catalog';

export const StatsHUD: React.FC = () => {
    const [isAnalyticsOpen, setIsAnalyticsOpen] = React.useState(true);
    const [isUpkeepOpen, setIsUpkeepOpen] = React.useState(false);

    const nodes = useGameStore((state) => state.nodes);
    const recentIncome = useGameStore((state) => state.recentIncome);
    const money = useGameStore((state) => state.money);
    const fps = useGameStore((state) => state.fps);
    const packets = useGameStore((state) => state.packets);
    const recentDrops = useGameStore((state) => state.recentDrops);
    const isMonitored = useGameStore((state) => state.isMonitored);
    const recentBandwidthCost = useGameStore((state) => state.recentBandwidthCost);
    const recentSlaLoss = useGameStore((state) => state.recentSlaLoss);
    const recentSlaLossByRegion = useGameStore((state) => state.recentSlaLossByRegion);
    const recentDropLoss = useGameStore((state) => state.recentDropLoss);
    const recentDropLossByNode = useGameStore((state) => state.recentDropLossByNode);

    const costBreakdown = React.useMemo(() => {
        type Item = {
            type: string;
            label: string;
            count: number;
            upkeepPerInstance: number;
            upkeepTotal: number;
            execPerSecTotal: number;
            dynamicUpkeepTotal: number;
            freeRemainingTotal?: number;
        };

        const map: Record<string, Item> = {};
        const totalNodes = Object.keys(nodes).length;
        const regions = useGameStore.getState().regions;
        const regionCount = Object.keys(regions).length;

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

            // Scaled Upkeep (matches GameLoop logic)
            const utilization = n.utilization || 0;
            existing.upkeepTotal += upkeepPer * (1 + utilization);

            // Dynamic per-node upkeep (Monitoring)
            if (def?.perNodeUpkeep) {
                existing.dynamicUpkeepTotal += (totalNodes * def.perNodeUpkeep);
            }

            // Estimate execution cost for function-apps
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

        // Calculate Extras (matches GameLoop.ts lines 72-80)
        let total = items.reduce((s, it) => s + it.total, 0);

        // Inject Base Costs into the list for transparency (Dynamic calculation)
        const nodeCount = Object.keys(nodes).length;
        const eliteNodes = Object.values(nodes).filter(n => ['sql-db-premium', 'cosmos-db'].includes(n.type)).length;
        const baseUpkeep = 2 + (nodeCount * 3) + (eliteNodes * 5);

        items.push({
            type: '_base', label: 'Cloud Foundation', count: 1,
            total: baseUpkeep, upkeepTotal: baseUpkeep, execPerSecTotal: 0, dynamicUpkeepTotal: 0
        });
        total += baseUpkeep;

        if (regionCount > 0) {
            const regionUpkeep = regionCount * 75;
            items.push({
                type: '_regions', label: 'Region Infrastructure', count: regionCount,
                total: regionUpkeep, upkeepTotal: regionUpkeep, execPerSecTotal: 0, dynamicUpkeepTotal: 0
            });
            total += regionUpkeep;
        }

        const recentInc = useGameStore.getState().recentIncome;
        if (recentInc > 0) {
            const tax = recentInc * 0.05;
            items.push({
                type: '_tax', label: 'Platform Tax (5%)', count: 1,
                total: tax, upkeepTotal: tax, execPerSecTotal: 0, dynamicUpkeepTotal: 0
            });
            total += tax;
        }

        // Re-sort to include new items
        items.sort((a: any, b: any) => b.total - a.total);

        return { items, total };
    }, [nodes, recentIncome]);

    // Aggregate Metrics (for Monitor)
    const aggregateMetrics = React.useMemo(() => {
        const nodeValues = Object.values(nodes);
        if (nodeValues.length === 0) return { maxUtil: 0, totalQueue: 0 };
        return {
            maxUtil: Math.max(...nodeValues.map(n => n.utilization || 0)),
            totalQueue: nodeValues.reduce((sum, n) => sum + (n.queue?.length || 0), 0)
        };
    }, [nodes]);

    const [smoothedPackets, setSmoothedPackets] = React.useState(packets.length);

    React.useEffect(() => {
        let raf: number;
        const update = () => {
            setSmoothedPackets(prev => {
                const diff = packets.length - prev;
                if (Math.abs(diff) < 0.1) return packets.length;
                return prev + diff * 0.1; // Smooth interpolation
            });
            raf = requestAnimationFrame(update);
        };
        raf = requestAnimationFrame(update);
        return () => cancelAnimationFrame(raf);
    }, [packets.length]);

    return (
        <div className="text-white font-mono p-4 bg-black/60 rounded backdrop-blur border border-white/10 shadow-xl pointer-events-auto w-64 flex flex-col gap-3 max-h-[85vh] overflow-y-auto thin-scrollbar">
            {/* STICKY HEADER: Financials */}
            <div className="sticky top-0 bg-black/5 rounded-lg p-2 backdrop-blur-md border border-white/5 z-10 shadow-lg">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-2xl font-bold text-green-400 font-sans tracking-tight">${money.toFixed(0)}</div>
                        <div className={`text-xs font-bold ${recentIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {recentIncome >= 0 ? '+' : ''}${recentIncome.toFixed(1)}/s
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] opacity-40 uppercase tracking-tighter">System Health</div>
                        <div className="text-sm font-bold text-blue-300">{fps} <span className="text-[10px] opacity-60">FPS</span></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pb-1">
                <div className="bg-white/5 p-2 rounded house-hover transition-colors">
                    <div className="text-[9px] opacity-50 uppercase tracking-tight">Active Packets</div>
                    <div className="text-sm font-bold">{smoothedPackets.toFixed(0)}</div>
                </div>
                <div className="bg-white/5 p-2 rounded house-hover transition-colors">
                    <div className="text-[9px] opacity-50 uppercase tracking-tight">Packet Drops</div>
                    <div className="text-sm font-bold text-red-400">{recentDrops.toFixed(1)}/s</div>
                </div>
            </div>

            {/* MONITOR SECTION */}
            {isMonitored ? (
                <div className="bg-blue-900/20 border border-blue-400/20 rounded-lg overflow-hidden transition-all duration-200">
                    <button
                        onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
                        className="w-full flex items-center justify-between p-2 hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Advanced Analytics</span>
                        </div>
                        <span className="text-[10px] opacity-40">{isAnalyticsOpen ? '▼' : '▶'}</span>
                    </button>

                    {isAnalyticsOpen && (
                        <div className="p-2 pt-0 flex flex-col gap-2 relative">
                            <div className="absolute top-0 right-2 p-1 opacity-10 pointer-events-none text-xl">📊</div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="opacity-60">Max Util</span>
                                    <span className={aggregateMetrics.maxUtil > 0.8 ? 'text-orange-400' : 'text-blue-300'}>
                                        {(aggregateMetrics.maxUtil * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="opacity-60">System Queue</span>
                                    <span className={aggregateMetrics.totalQueue > 20 ? 'text-orange-400' : 'text-blue-300'}>
                                        {aggregateMetrics.totalQueue}
                                    </span>
                                </div>

                                {(recentBandwidthCost > 0 || recentSlaLoss > 0 || recentDropLoss > 0) && (
                                    <div className="mt-2 pt-1 border-t border-blue-400/10">
                                        <div className="text-[9px] font-bold text-orange-400 uppercase mb-1 flex items-center gap-1">
                                            <span>⚠️</span> Inefficiency Costs
                                        </div>
                                        {recentBandwidthCost > 0 && (
                                            <div className="flex justify-between text-[10px] text-orange-300 italic">
                                                <span>Bandwidth Hopping</span>
                                                <span>-${recentBandwidthCost.toFixed(1)}/s</span>
                                            </div>
                                        )}
                                        {recentSlaLoss > 0 && (
                                            <div className="flex flex-col text-[10px] text-orange-300 italic">
                                                <div className="flex justify-between">
                                                    <span>SLA Region Penalty</span>
                                                    <span>-${recentSlaLoss.toFixed(1)}/s</span>
                                                </div>
                                                {Object.entries(recentSlaLossByRegion).map(([region, loss]) => (
                                                    <div key={region} className="flex justify-between pl-2 opacity-70 text-[9px]">
                                                        <span>↳ {region}</span>
                                                        <span>-${loss.toFixed(1)}/s</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {recentDropLoss > 0 && (
                                            <div className="flex flex-col text-[10px] text-red-300 italic">
                                                <div className="flex justify-between">
                                                    <span>Packet Drop Penalties</span>
                                                    <span>-${recentDropLoss.toFixed(1)}/s</span>
                                                </div>
                                                {Object.entries(recentDropLossByNode).map(([nodeId, loss]) => {
                                                    const node = nodes[nodeId];
                                                    const label = node?.label || nodeId;
                                                    return (
                                                        <div key={nodeId} className="flex justify-between pl-2 opacity-70 text-[9px]">
                                                            <span>↳ {label}</span>
                                                            <span>-${loss.toFixed(1)}/s</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white/5 p-2 rounded border border-white/5 text-[10px] opacity-40 text-center italic">
                    Deploy Azure Monitor for Advanced Analytics
                </div>
            )}

            <div className="bg-white/5 rounded-lg overflow-hidden border border-white/5">
                <button
                    onClick={() => setIsUpkeepOpen(!isUpkeepOpen)}
                    className="w-full flex items-center justify-between p-2 hover:bg-white/5 transition-colors"
                >
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] uppercase opacity-40 font-bold">Upkeep Breakdown</span>
                        <span className="text-xs opacity-60">${costBreakdown.total.toFixed(2)}/s</span>
                    </div>
                    <span className="text-[10px] opacity-40">{isUpkeepOpen ? '▼' : '▶'}</span>
                </button>

                {isUpkeepOpen && (
                    <div className="p-2 pt-0 space-y-1 max-h-48 overflow-y-auto thin-scrollbar">
                        {costBreakdown.items.map((it: any) => (
                            <div key={it.type} className="text-[10px] opacity-80 flex justify-between group">
                                <span className="group-hover:opacity-100 transition-opacity">{it.label} <span className="opacity-40">x{it.count}</span></span>
                                <span>${it.total.toFixed(1)}/s</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="pt-2 border-t border-white/10 text-[9px] uppercase font-bold text-white/20 italic text-center tracking-widest">
                Infrastructure Live
            </div>
        </div>
    );
};
