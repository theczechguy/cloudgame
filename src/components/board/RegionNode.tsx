import React, { memo } from 'react';
import type { Region } from '../../engine/types';

interface RegionNodeProps {
    region: Region;
    isSelected: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    onResizeMouseDown: (e: React.MouseEvent) => void;
    onClick: (e: React.MouseEvent) => void;
}

export const RegionNode: React.FC<RegionNodeProps> = memo(({ region, isSelected, onMouseDown, onResizeMouseDown, onClick }) => {
    return (
        <div
            className={`absolute border-2 border-dashed rounded-xl pointer-events-auto transition-colors
                ${isSelected ? 'border-blue-400 bg-blue-900/10' : 'border-white/20 hover:border-white/40'}
            `}
            style={{
                left: region.x,
                top: region.y,
                width: region.width,
                height: region.height,
                // Origin is top-left, unlike nodes which are center-origin
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(e);
            }}
            onClick={(e) => {
                e.stopPropagation();
                onClick(e);
            }}
        >
            <div className="absolute top-2 left-2 text-xs font-bold text-white/50 uppercase tracking-widest select-none">
                {region.label}
            </div>

            {/* Visual Indicator of Size */}
            {isSelected && (
                <div className="absolute bottom-2 right-2 text-[10px] text-blue-400 font-mono">
                    {Math.round(region.width)}x{Math.round(region.height)}
                </div>
            )}

            {/* Resize Handle */}
            <div
                className={`absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize
             ${isSelected ? 'bg-blue-400/50' : 'bg-transparent hover:bg-white/20'}
             rounded-tl-lg
            `}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    onResizeMouseDown(e);
                }}
            />
        </div>
    );
});
