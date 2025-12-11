import React, { useState } from 'react';

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
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="absolute bottom-6 left-6 z-50 flex flex-col items-start gap-2">

            {/* Legend Content (Popup) */}
            {isOpen && (
                <div className="bg-gray-900/95 p-4 rounded-lg border border-gray-700 text-white shadow-xl pointer-events-auto select-none backdrop-blur-md mb-2 animate-fade-in-up">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Traffic Legend</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-500 hover:text-white transition-colors text-xs"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="space-y-2">
                        {PACKET_TYPES.map((type) => (
                            <div key={type.label} className="flex items-center gap-3 text-xs">
                                <div className={`w-3 h-3 rounded-full shadow-sm ${type.color}`} />
                                <span className="opacity-90">{type.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-700 mt-3 pt-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Shortcuts</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-300">
                            <div><span className="text-gray-500">SHIFT + Click</span> Connect</div>
                            <div><span className="text-gray-500">SHIFT + Drag</span> Box Select</div>
                            <div><span className="text-gray-500">CMD + Click</span> Multi-Select</div>
                            <div><span className="text-gray-500">CMD + D</span> Duplicate</div>
                            <div><span className="text-gray-500">DEL</span> Delete</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-10 h-10 rounded-full flex items-center justify-center shadow-lg border transition-all duration-200
                    ${isOpen
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-gray-800/80 border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white hover:border-gray-500'
                    }
                    pointer-events-auto backdrop-blur-sm
                `}
                title="Toggle Traffic Legend"
            >
                <span className="font-bold text-lg">?</span>
            </button>
        </div>
    );
};
