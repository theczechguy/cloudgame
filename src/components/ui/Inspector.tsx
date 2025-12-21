import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { GEO_REGIONS } from '../../engine/types';
import { UPGRADES } from '../../config/upgrades';

export const Inspector: React.FC = () => {
    const nodes = useGameStore((state) => state.nodes);
    const regions = useGameStore((state) => state.regions);
    const sandboxMode = useGameStore((state) => state.sandboxMode);
    const money = useGameStore((state) => state.money);

    // Selection State
    const selectedNodeIds = useGameStore((state) => state.selectedNodeIds);
    const selectedRegionId = useGameStore((state) => state.selectedRegionId);

    const updateNode = useGameStore((state) => state.updateNode);
    const updateRegion = useGameStore((state) => state.updateRegion);

    // Determine what to show
    // Priority: Region > Single Node > Single Edge
    let content: React.ReactNode = null;

    if (selectedRegionId) {
        const region = regions[selectedRegionId];
        if (region) {
            content = (
                <div className="flex flex-col gap-4">
                    <div className="border-b border-gray-700 pb-2">
                        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest">Region Inspector</h2>
                        <div className="text-xs text-gray-500 font-mono mt-1">{region.id}</div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-400">Label</label>
                        <input
                            type="text"
                            value={region.label}
                            onChange={(e) => updateRegion(region.id, { label: e.target.value })}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-400">Geo Location</label>
                        <select
                            value={region.geoId || ''}
                            onChange={(e) => updateRegion(region.id, { geoId: e.target.value })}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none appearance-none"
                        >
                            <option value="">-- None --</option>
                            {GEO_REGIONS.map(geo => (
                                <option key={geo} value={geo}>{geo}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-500 italic">
                            Traffic destined for {region.geoId || 'Unknown'} will be routed here.
                        </p>
                    </div>
                </div>
            );
        }
    } else if (selectedNodeIds.size === 1) {
        const nodeId = Array.from(selectedNodeIds)[0];
        const node = nodes[nodeId];

        if (node) {
            content = (
                <div className="flex flex-col gap-4">
                    <div className="border-b border-gray-700 pb-2">
                        <h2 className="text-sm font-bold text-green-400 uppercase tracking-widest">Node Inspector</h2>
                        <div className="text-xs text-gray-500 font-mono mt-1">{node.type} :: {node.id}</div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-400">Label</label>
                        <input
                            type="text"
                            value={node.label}
                            onChange={(e) => updateNode(node.id, { label: e.target.value })}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                        />
                    </div>

                    {node.type === 'internet' && (
                        <div className="flex flex-col gap-2 border-t border-gray-700 pt-3 mt-1">
                            <label className="text-xs text-yellow-400 font-bold">Traffic Origin</label>
                            <select
                                value={node.trafficOrigin || ''}
                                onChange={(e) => updateNode(node.id, { trafficOrigin: e.target.value })}
                                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none appearance-none"
                            >
                                <option value="">Random (World)</option>
                                {GEO_REGIONS.map(geo => (
                                    <option key={geo} value={geo}>{geo}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-gray-500 italic">
                                This node will spawn traffic from {node.trafficOrigin || 'Random Regions'}.
                            </p>
                        </div>
                    )}

                    {/* Packet Drop Analysis (Monitor Required) */}
                    {(() => {
                        const isMonitored = Object.values(nodes).some(n => n.type === 'azure-monitor');
                        if (!node.droppedPackets) return null;

                        return (
                            <div className="border-t border-gray-700 pt-3 mt-1">
                                <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                                    <span>Drop Analysis</span>
                                    {!isMonitored && <span className="text-[9px] bg-red-900/50 px-1 rounded text-red-300">NO MONITOR</span>}
                                </h3>

                                {isMonitored ? (
                                    <div className="space-y-1">
                                        {Object.entries(node.droppedPackets).map(([type, count]) => (
                                            <div key={type} className="flex justify-between text-xs font-mono">
                                                <span className="text-gray-400">{type}</span>
                                                <span className="text-red-300 font-bold">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-gray-500 flex flex-col gap-1 items-center py-2 bg-gray-800/50 rounded">
                                        <span>Deploy Azure Monitor</span>
                                        <span>to see details</span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Upgrades Section */}
                    {(() => {
                        // Import dynamically or assume it's available in context? Importing at top level is better.
                        // Since I can't easily add top-level imports with Replace, I'll rely on a subsequent fix or assume I can add it now.
                        // Wait, I can't use UPGRADES without importing it.
                        // I will add the import in a separate tool call first, or use a multi-step approach.
                        // Let's assume I will add the import at the top of the file in the next step.
                        // For now, I will write the logic assuming UPGRADES is available.

                        const applicableUpgrades = Object.values(UPGRADES).filter(u => u.validTypes.includes(node.type));
                        if (applicableUpgrades.length === 0) return null;

                        return (
                            <div className="border-t border-gray-700 pt-3 mt-1">
                                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">Upgrades</h3>
                                <div className="flex flex-col gap-2">
                                    {applicableUpgrades.map(upgrade => {
                                        const hasUpgrade = node.upgrades?.includes(upgrade.id);
                                        const canAfford = money >= upgrade.cost;

                                        return (
                                            <div key={upgrade.id} className="bg-gray-800/50 p-2 rounded border border-gray-700">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-bold text-white">{upgrade.label}</span>
                                                    {hasUpgrade ? (
                                                        <span className="text-[10px] bg-green-900/50 text-green-300 px-1.5 py-0.5 rounded border border-green-700">INSTALLED</span>
                                                    ) : (
                                                        <span className="text-xs font-mono text-yellow-400">
                                                            {sandboxMode ? <span className="text-green-400">FREE</span> : `$${upgrade.cost}`}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-400 leading-tight mb-2">{upgrade.description}</p>

                                                {!hasUpgrade && (
                                                    <button
                                                        disabled={!sandboxMode && !canAfford}
                                                        onClick={() => {
                                                            const actuallyCanAfford = sandboxMode || canAfford;
                                                            if (actuallyCanAfford) {
                                                                if (!sandboxMode) useGameStore.getState().updateMoney(-upgrade.cost);
                                                                updateNode(node.id, { upgrades: [...(node.upgrades || []), upgrade.id] });
                                                            }
                                                        }}
                                                        className={`w-full py-1 text-[10px] uppercase font-bold rounded transition-colors ${sandboxMode || canAfford
                                                            ? 'bg-cyan-700 hover:bg-cyan-600 text-white'
                                                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        {sandboxMode || canAfford ? 'Purchase' : 'Insufficent Funds'}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            );
        }
    }

    if (!content) return null;

    return (
        <div className="bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl p-4 w-64 backdrop-blur-sm pointer-events-auto">
            {content}
        </div>
    );
};
