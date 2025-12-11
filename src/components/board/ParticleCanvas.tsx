import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

interface ParticleCanvasProps {
    width: number;
    height: number;
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ width, height }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        // Subscribe to state changes without triggering React re-renders of this component
        // This runs the render loop purely on store updates (which happen each animation frame)
        const unsub = useGameStore.subscribe((state) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear
            ctx.clearRect(0, 0, width, height);

            // Draw Packets
            state.packets.forEach(p => {
                let x = 0;
                let y = 0;

                if (p.type === 'log-entry' && p.targetNodeId && p.routeStack[0]) {
                    // Direct Flight Interpolation
                    const source = state.nodes[p.routeStack[0]]?.position;
                    const target = state.nodes[p.targetNodeId]?.position;
                    if (source && target) {
                        x = source.x + (target.x - source.x) * p.progress;
                        y = source.y + (target.y - source.y) * p.progress;
                    }
                } else {
                    const edge = state.edges[p.edgeId];
                    if (!edge) return;
                    const sourceNode = state.nodes[edge.source];
                    const targetNode = state.nodes[edge.target];
                    if (!sourceNode || !targetNode) return;

                    // Determine effective source/target based on direction
                    const startX = p.reversed ? targetNode.position.x : sourceNode.position.x;
                    const startY = p.reversed ? targetNode.position.y : sourceNode.position.y;
                    const endX = p.reversed ? sourceNode.position.x : targetNode.position.x;
                    const endY = p.reversed ? sourceNode.position.y : targetNode.position.y;

                    x = startX + (endX - startX) * p.progress;
                    y = startY + (endY - startY) * p.progress;
                }

                // Draw dot
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);

                if (p.type === 'log-entry') {
                    ctx.fillStyle = 'rgba(150, 150, 150, 0.6)'; // Ghostly Grey
                    ctx.fill();
                    return;
                }

                if (p.type === 'http-compute') ctx.fillStyle = '#48bb78'; // Green
                else if (p.type === 'http-db') ctx.fillStyle = '#ecc94b'; // Yellow
                else if (p.type === 'http-storage') ctx.fillStyle = '#ed8936'; // Orange
                else if (p.type === 'http-attack') ctx.fillStyle = '#e53e3e'; // Red
                else if (p.type === 'db-query') ctx.fillStyle = '#ecc94b'; // Yellow
                else if (p.type === 'db-result') ctx.fillStyle = '#9f7aea'; // Purple
                else if (p.type === 'http-response') ctx.fillStyle = '#4299e1'; // Blue
                else if (p.type === 'storage-op') ctx.fillStyle = '#ed8936'; // Orange
                else if (p.type === 'storage-result') ctx.fillStyle = '#38b2ac'; // Teal
                else ctx.fillStyle = '#ffffff'; // Fallback
                ctx.fill();

                // Optional: Glow
                ctx.shadowBlur = 4;
                ctx.shadowColor = ctx.fillStyle;
            });

            // Draw Drop Events (throttled visual representation)
            // Cap visuals to avoid overload: draw up to 20 recent drops, scale by recency
            const now = Date.now();
            const drops = state.dropEvents || [];
            const recent = drops.filter(d => now - d.t < 5000).slice(-40); // limit kept
            // Draw most recent first
            for (let i = recent.length - 1; i >= 0; i--) {
                const d = recent[i];
                if (!d) continue;
                const age = now - d.t;
                const t = Math.min(1, age / 1000); // normalize and clamp to [0,1]
                const alpha = Math.max(0, 1 - t);
                const size = 6 + (1 - t) * 6; // size in [6,12]
                const x = d.x ?? (state.nodes[d.nodeId || '']?.position?.x ?? width / 2);
                const y = d.y ?? (state.nodes[d.nodeId || '']?.position?.y ?? height / 2);

                ctx.beginPath();
                ctx.arc(x, y, Math.max(0.5, size), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(229,62,62,${alpha.toFixed(2)})`;
                ctx.fill();
                ctx.strokeStyle = `rgba(255,100,100,${(alpha * 0.8).toFixed(2)})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });

        return () => unsub();
    }, [width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="absolute top-0 left-0 pointer-events-none z-10"
        />
    );
};
