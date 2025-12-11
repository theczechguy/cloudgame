import React from 'react';
import type { GameEdge, GameNode } from '../../engine/types';

interface ConnectionLineProps {
    edge?: GameEdge; // Optional or required depending on cleanup
    source: GameNode;
    target: GameNode;
    isSelected?: boolean;
    onClick?: (e: React.MouseEvent) => void;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({ source, target, isSelected, onClick }) => {
    const isCrossRegion = source.regionId && target.regionId && source.regionId !== target.regionId;

    return (
        <g onClick={onClick} className="pointer-events-auto cursor-pointer group">
            {/* Invisible thick path for easier clicking */}
            <line
                x1={source.position.x}
                y1={source.position.y}
                x2={target.position.x}
                y2={target.position.y}
                stroke="transparent"
                strokeWidth="20"
            />
            {/* Visible line */}
            <line
                x1={source.position.x}
                y1={source.position.y}
                x2={target.position.x}
                y2={target.position.y}
                stroke={isSelected ? "#fbbf24" : (isCrossRegion ? "#f87171" : "#4a5568")} // Yellow if selected, Red-ish if High Latency, Gray otherwise
                strokeWidth={isSelected ? "4" : "2"}
                strokeDasharray={isCrossRegion ? "5,5" : ""} // Dashed for latency
                className={isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-100 group-hover:stroke-gray-400 transition-all"}
            />
        </g>
    );
};
