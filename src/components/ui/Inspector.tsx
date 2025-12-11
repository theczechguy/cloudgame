import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { GEO_REGIONS } from '../../engine/types';

export const Inspector: React.FC = () => {
    const nodes = useGameStore((state) => state.nodes);
    const regions = useGameStore((state) => state.regions);

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
                </div>
            );
        }
    }

    if (!content) return null;

    return (
        <div className="absolute top-20 right-4 z-[100] bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl p-4 w-64 backdrop-blur-sm pointer-events-auto">
            {content}
        </div>
    );
};
