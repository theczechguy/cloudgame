import React from 'react';
import { SERVICE_CATALOG } from '../../services/catalog';
import type { NodeType } from '../../engine/types';

import { useGameStore } from '../../store/gameStore';

export const ServicePalette: React.FC = () => {
    const money = useGameStore((state) => state.money);
    const sandboxMode = useGameStore((state) => state.sandboxMode);

    const handleDragStart = (e: React.DragEvent, type: NodeType, canAfford: boolean) => {
        if (!canAfford) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('application/reactflow', type);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="absolute top-4 right-4 z-50 bg-azure-panel border border-azure-border rounded-lg shadow-xl p-4 w-64 flex flex-col max-h-[90vh]">
            <h3 className="text-white font-bold mb-4 border-b border-azure-border pb-2 flex justify-between items-center shrink-0">
                Services
                {sandboxMode && <span className="text-[10px] bg-yellow-600 px-1 rounded text-white">SANDBOX</span>}
            </h3>
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {SERVICE_CATALOG.map((service) => {
                    const canAfford = sandboxMode || money >= service.cost;
                    return (
                        <div
                            key={service.type}
                            draggable={canAfford}
                            onDragStart={(e) => handleDragStart(e, service.type, canAfford)}
                            className={`p-3 rounded transition-colors border border-transparent 
                                ${canAfford
                                    ? 'bg-gray-700/50 hover:bg-gray-700 hover:border-gray-500 cursor-grab active:cursor-grabbing'
                                    : 'bg-gray-800/50 opacity-50 cursor-not-allowed grayscale'}
                            `}
                        >
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-2xl">{service.icon}</span>
                                <div className="flex-1">
                                    <div className="font-bold text-sm text-gray-200">{service.label}</div>
                                    <div className={`text-xs font-mono ${canAfford ? 'text-green-400' : 'text-red-400'}`}>${service.cost}</div>
                                </div>
                            </div>
                            <div className="text-[10px] text-gray-400 leading-tight">
                                {service.description}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
