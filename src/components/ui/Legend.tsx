import React from 'react';

const PACKET_TYPES = [
    { label: 'Compute Request', color: 'bg-[#48bb78]' },
    { label: 'DB Request', color: 'bg-[#ecc94b]' },
    { label: 'Storage Request', color: 'bg-[#ed8936]' },
    { label: 'DB Query', color: 'bg-[#ecc94b]' },
    { label: 'DB Result', color: 'bg-[#9f7aea]' },
    { label: 'HTTP Response', color: 'bg-[#4299e1]' },
    { label: 'Storage Op', color: 'bg-[#ed8936]' },
    { label: 'Storage Result', color: 'bg-[#38b2ac]' },
    { label: 'Attack / DDoS', color: 'bg-[#e53e3e]' },
];

export const Legend: React.FC = () => {
    return (
        <div className="absolute bottom-16 left-4 bg-gray-900/90 p-4 rounded-lg border border-gray-700 text-white shadow-xl z-50 pointer-events-none select-none">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 border-b border-gray-700 pb-1">Traffic Legend</h3>
            <div className="space-y-2">
                {PACKET_TYPES.map((type) => (
                    <div key={type.label} className="flex items-center gap-3 text-xs">
                        <div className={`w-3 h-3 rounded-full shadow-sm ${type.color}`} />
                        <span className="opacity-90">{type.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
