import React, { useState } from 'react';
import { SERVICE_CATALOG } from '../../services/catalog';
import type { NodeType } from '../../engine/types';

import { useGameStore } from '../../store/gameStore';

export const ServicePalette: React.FC = () => {
    const money = useGameStore((state) => state.money);
    const sandboxMode = useGameStore((state) => state.sandboxMode);
    const addRegion = useGameStore((state) => state.addRegion);
    const [hoveredService, setHoveredService] = useState<NodeType | 'region' | null>(null);

    const handleDragStart = (e: React.DragEvent, type: NodeType, canAfford: boolean) => {
        if (!canAfford) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('application/reactflow', type);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleSpawnRegion = () => {
        addRegion({
            id: `region-${Date.now()}`,
            label: 'New Region',
            x: 1400 + (Math.random() * 200),
            y: 1400 + (Math.random() * 200),
            width: 300,
            height: 300
        });
    };

    return (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center">

            {/* Tooltip Area - Fixed height above dock to prevent jumping */}
            <div className="h-24 mb-2 flex items-end justify-center pointer-events-none w-[500px]">
                {hoveredService && (
                    <div className="bg-gray-900/95 border border-azure-border rounded-lg p-3 shadow-xl text-center backdrop-blur-md animate-fade-in-up">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="text-xl text-azure-blue">
                                {hoveredService === 'region' ? '🗺️' : SERVICE_CATALOG.find(s => s.type === hoveredService)?.icon}
                            </span>
                            <span className="font-bold text-white">
                                {hoveredService === 'region' ? 'Cloud Region' : SERVICE_CATALOG.find(s => s.type === hoveredService)?.label}
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs max-w-xs">
                            {hoveredService === 'region'
                                ? 'Define a geographical boundary for your services. Required for multi-region compliance and latency optimization.'
                                : SERVICE_CATALOG.find(s => s.type === hoveredService)?.description}
                        </p>
                    </div>
                )}
            </div>

            {/* Dock Container */}
            <div className="bg-gray-900/80 border border-gray-700 rounded-2xl shadow-2xl p-2 flex items-center gap-2 backdrop-blur-md transition-all hover:bg-gray-900/90">
                {sandboxMode && (
                    <div className="absolute -top-3 right-4 bg-yellow-600 text-white text-[10px] px-2 rounded-full font-bold shadow-sm">
                        SANDBOX
                    </div>
                )}

                {[
                    { id: 'compute', types: ['function-app', 'vm', 'app-service'] },
                    { id: 'data', types: ['sql-db', 'sql-db-premium', 'cosmos-db', 'blob-storage', 'redis', 'storage-queue'] },
                    { id: 'network', types: ['firewall', 'waf', 'load-balancer', 'traffic-manager', 'azure-monitor'] }
                ].map((group, groupIndex, groups) => (
                    <React.Fragment key={group.id}>
                        {group.types.map(type => {
                            const service = SERVICE_CATALOG.find(s => s.type === type);
                            if (!service) return null;

                            const canAfford = sandboxMode || money >= service.cost;
                            return (
                                <div
                                    key={service.type}
                                    draggable={canAfford}
                                    onDragStart={(e) => handleDragStart(e, service.type, canAfford)}
                                    onMouseEnter={() => setHoveredService(service.type)}
                                    onMouseLeave={() => setHoveredService(null)}
                                    className={`
                                        group relative w-16 h-16 rounded-xl flex flex-col items-center justify-center
                                        transition-all duration-200 border border-transparent
                                        ${canAfford
                                            ? 'hover:bg-gray-700/80 hover:scale-110 hover:-translate-y-1 hover:shadow-lg hover:border-gray-500 cursor-grab active:cursor-grabbing bg-gray-800/40'
                                            : 'bg-gray-800/20 opacity-40 cursor-not-allowed grayscale'
                                        }
                                    `}
                                >
                                    <span className="text-2xl mb-1 filter drop-shadow-md group-hover:drop-shadow-lg transition-transform">
                                        {service.icon}
                                    </span>
                                    <span className={`text-[10px] font-mono font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                                        ${service.cost}
                                    </span>
                                </div>
                            );
                        })}

                        {/* Special case: Region button in the network group */}
                        {group.id === 'network' && (
                            <div
                                onClick={handleSpawnRegion}
                                onMouseEnter={() => setHoveredService('region')}
                                onMouseLeave={() => setHoveredService(null)}
                                className="group relative w-16 h-16 rounded-xl flex flex-col items-center justify-center bg-blue-900/20 hover:bg-blue-900/40 transition-all duration-200 border border-transparent hover:border-blue-500/50 hover:scale-110 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                            >
                                <span className="text-2xl mb-1 filter drop-shadow-md group-hover:drop-shadow-lg transition-transform">
                                    🗺️
                                </span>
                                <span className="text-[10px] font-mono font-bold text-blue-400">
                                    FREE
                                </span>
                            </div>
                        )}

                        {/* Separator */}
                        {groupIndex < groups.length - 1 && (
                            <div className="w-px h-10 bg-gray-700 mx-1" />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};
