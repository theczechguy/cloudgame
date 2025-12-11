import React, { useState } from 'react';
import { SERVICE_CATALOG } from '../../services/catalog';
import type { NodeType } from '../../engine/types';

import { useGameStore } from '../../store/gameStore';

export const ServicePalette: React.FC = () => {
    const money = useGameStore((state) => state.money);
    const sandboxMode = useGameStore((state) => state.sandboxMode);
    const [hoveredService, setHoveredService] = useState<NodeType | null>(null);

    const handleDragStart = (e: React.DragEvent, type: NodeType, canAfford: boolean) => {
        if (!canAfford) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('application/reactflow', type);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center">

            {/* Tooltip Area - Fixed height above dock to prevent jumping */}
            <div className="h-24 mb-2 flex items-end justify-center pointer-events-none w-[500px]">
                {hoveredService && (
                    <div className="bg-gray-900/95 border border-azure-border rounded-lg p-3 shadow-xl text-center backdrop-blur-md animate-fade-in-up">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="text-xl text-azure-blue">
                                {SERVICE_CATALOG.find(s => s.type === hoveredService)?.icon}
                            </span>
                            <span className="font-bold text-white">
                                {SERVICE_CATALOG.find(s => s.type === hoveredService)?.label}
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs max-w-xs">
                            {SERVICE_CATALOG.find(s => s.type === hoveredService)?.description}
                        </p>
                    </div>
                )}
            </div>

            {/* Dock Container */}
            <div className="bg-gray-900/80 border border-gray-700 rounded-2xl shadow-2xl p-2 flex gap-2 backdrop-blur-md transition-all hover:bg-gray-900/90">
                {sandboxMode && (
                    <div className="absolute -top-3 right-4 bg-yellow-600 text-white text-[10px] px-2 rounded-full font-bold shadow-sm">
                        SANDBOX
                    </div>
                )}

                {SERVICE_CATALOG.map((service) => {
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
            </div>
        </div>
    );
};
