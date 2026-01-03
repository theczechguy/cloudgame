import React, { useState } from 'react';
import { useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch';
import { useGameStore } from '../../store/gameStore';
import { useGameLoop } from '../../engine/GameLoop';
import { ServiceNode } from './ServiceNode';
import { ConnectionLine } from './ConnectionLine';
import { ParticleCanvas } from './ParticleCanvas';
import { RegionNode } from './RegionNode'; // Added
import { SERVICE_CATALOG } from '../../services/catalog';
import type { NodeType, GameNode } from '../../engine/types';

export const Board: React.FC = () => {
    useGameLoop(); // Start the game loop

    // SELECTORS
    const nodeIds = useGameStore((state) => state.nodeIds);
    const edgesMap = useGameStore((state) => state.edges);
    const edges = React.useMemo(() => Object.values(edgesMap), [edgesMap]);
    const regions = useGameStore((state) => state.regions); // Added

    // Actions
    const addNode = useGameStore((state) => state.addNode);
    // removeNode & removeEdge accessed via getState() in handlers
    const addEdge = useGameStore((state) => state.addEdge);
    const updateNodePosition = useGameStore((state) => state.updateNodePosition);

    // Local State
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [draggingRegionId, setDraggingRegionId] = useState<string | null>(null);
    const [resizingRegionId, setResizingRegionId] = useState<string | null>(null);
    const [connectSourceId, setConnectSourceId] = useState<string | null>(null);

    // Multi-Selection State (Global)
    const selectedNodeIds = useGameStore((state) => state.selectedNodeIds);
    const selectedRegionId = useGameStore((state) => state.selectedRegionId);
    const selectedEdgeId = useGameStore((state) => state.selectedEdgeId);
    const selectionBox = useGameStore((state) => state.selectionBox);

    const setSelectedNodes = useGameStore((state) => state.setSelectedNodes);
    const toggleNodeSelection = useGameStore((state) => state.toggleNodeSelection);
    const setSelectedRegion = useGameStore((state) => state.setSelectedRegion);
    const setSelectedEdge = useGameStore((state) => state.setSelectedEdge);
    const setSelectionBox = useGameStore((state) => state.setSelectionBox);

    const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null);
    const updateRegion = useGameStore((state) => state.updateRegion);

    // ...

    const handleNodeMouseDown = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        // Shift+Click logic handled in Click (for connection)
        if (e.shiftKey) return;

        // Multi-Select logic (Cmd/Ctrl) - Handled here strictly for 'adding to selection' OR 'starting drag of current selection'
        // Actually, standards:
        // Click down on unselected -> Select IT, clear others (unless Ctrl).
        // Click down on selected -> Keep selection (prepare to drag group).

        if (e.metaKey || e.ctrlKey) {
            // Toggle logic usually on Click, but mousedown works to prevent drag start clearing
            // We'll let Click handle Toggle.
        } else {
            if (!selectedNodeIds.has(id)) {
                setSelectedNodes(new Set([id]));
            }
        }

        setDraggingId(id);
    };

    const handleNodeClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        setSelectedEdge(null);
        setSelectedRegion(null);

        if (e.shiftKey) {
            // Connection Logic (Shift + Click)
            if (!connectSourceId) {
                setConnectSourceId(id);
            } else {
                if (connectSourceId !== id) {
                    // Multi-Connect Logic
                    if (selectedNodeIds.has(connectSourceId)) {
                        // The source node was part of a selection, so connect ALL selected nodes
                        const edgesToAdd: any[] = [];
                        selectedNodeIds.forEach(sourceId => {
                            if (sourceId !== id) { // Prevent self-loop if target happens to be in selection (unlikely but safe)
                                edgesToAdd.push({
                                    id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                    source: sourceId,
                                    target: id
                                });
                            }
                        });

                        if (edgesToAdd.length > 0) {
                            useGameStore.getState().addEdges(edgesToAdd);
                        }
                    } else {
                        // Single connection
                        addEdge({
                            id: `e-${Date.now()}`,
                            source: connectSourceId,
                            target: id
                        });
                    }
                }
                setConnectSourceId(null);
            }
        } else if (e.metaKey || e.ctrlKey) {
            // Multi-Select Toggle (Cmd/Ctrl + Click)
            toggleNodeSelection(id, true);
        } else {
            // Normal Click on existing selection (drag didn't happen)
            // If we just gathered a set, this might reduce it to one if user clicked single node.
            // But usually handled by mousedown.
            // Let's ensure single select if no modifier
            // setSelectedNodes(new Set([id])); // Handled by mouseDown mostly, but strict click ensures it.
        }
    };

    const handleRegionMouseDown = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDraggingRegionId(id);
    };

    const handleRegionResizeMouseDown = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setResizingRegionId(id);
    };

    // Keyboard Shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Duplicate
            if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault();
                if (selectedNodeIds.size > 0) {
                    const duplicateNodes = useGameStore.getState().duplicateNodes;
                    const newIds = duplicateNodes(Array.from(selectedNodeIds));
                    setSelectedNodes(new Set(newIds)); // Select the new copies
                }
            }

            // Delete
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedNodeIds.size > 0) {
                    const removeNode = useGameStore.getState().removeNode;
                    selectedNodeIds.forEach(id => removeNode(id));
                    setSelectedNodes(new Set());
                }
                if (selectedEdgeId) {
                    useGameStore.getState().removeEdge(selectedEdgeId);
                    setSelectedEdge(null);
                }
                if (selectedRegionId) {
                    useGameStore.getState().removeRegion(selectedRegionId);
                    setSelectedRegion(null);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNodeIds, selectedEdgeId, selectedRegionId]);

    // Background Mouse Down (Start Selection Box)
    const handleBackgroundMouseDown = (e: React.MouseEvent) => {
        // Only Box Select if holding SHIFT
        if (!e.shiftKey) return;

        if (!transformRef.current) return;
        const { scale, positionX, positionY } = transformRef.current.instance.transformState;
        const x = (e.clientX - positionX) / scale;
        const y = (e.clientY - positionY) / scale;

        setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
        setSelectedNodes(new Set()); // Clear selection on background click
        setSelectedEdge(null);
        setSelectedRegion(null);
        setConnectSourceId(null);
    };


    const handleMouseMove = (e: React.MouseEvent) => {
        if (!transformRef.current) return;
        const { scale, positionX, positionY } = transformRef.current.instance.transformState;
        const x = (e.clientX - positionX) / scale;
        const y = (e.clientY - positionY) / scale;

        if (selectionBox) {
            // Update Selection Box
            setSelectionBox({ ...selectionBox, endX: x, endY: y });
        } else if (draggingId) {
            // Group Drag Logic
            // Calculate Delta
            const node = useGameStore.getState().nodes[draggingId];
            if (node) {
                // We need to move ALL selected nodes by the same delta
                const dx = e.movementX / scale;
                const dy = e.movementY / scale;

                // We move logic to store to handle group delta calculation correctly
                // Store `updateNodePosition` now handles group if passed ID is selected.
                updateNodePosition(draggingId, {
                    x: node.position.x + dx,
                    y: node.position.y + dy
                });
            }
        } else if (draggingRegionId) {
            // ... existing region drag
            const region = useGameStore.getState().regions[draggingRegionId];
            if (region) {
                updateRegion(draggingRegionId, {
                    x: region.x + e.movementX / scale,
                    y: region.y + e.movementY / scale
                });
            }
        } else if (resizingRegionId) {
            // Resize Logic
            const region = useGameStore.getState().regions[resizingRegionId];
            if (region) {
                updateRegion(resizingRegionId, {
                    width: Math.max(100, region.width + e.movementX / scale),
                    height: Math.max(100, region.height + e.movementY / scale)
                });
            }
        }
    };

    const handleMouseUp = () => {
        // Finalize Selection Box
        if (selectionBox) {
            // Calculate intersection
            const x1 = Math.min(selectionBox.startX, selectionBox.endX);
            const x2 = Math.max(selectionBox.startX, selectionBox.endX);
            const y1 = Math.min(selectionBox.startY, selectionBox.endY);
            const y2 = Math.max(selectionBox.startY, selectionBox.endY);

            const newSelection = new Set<string>();
            Object.values(useGameStore.getState().nodes).forEach(node => {
                // Simple point check (center) or bbox? Let's use center for now
                if (node.position.x >= x1 && node.position.x <= x2 &&
                    node.position.y >= y1 && node.position.y <= y2) {
                    newSelection.add(node.id);
                }
            });
            setSelectedNodes(newSelection);
            setSelectionBox(null);
        }

        setDraggingId(null);
        setDraggingRegionId(null);
        setResizingRegionId(null);
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();

        const type = e.dataTransfer.getData('application/reactflow') as NodeType | '';
        if (!type || !transformRef.current) return;

        const serviceDef = SERVICE_CATALOG.find(s => s.type === type);
        const currentMoney = useGameStore.getState().money;
        const sandboxMode = useGameStore.getState().sandboxMode;
        const cost = serviceDef?.cost || 0;

        if (!sandboxMode && currentMoney < cost) {
            alert("Not enough money!");
            return;
        }

        useGameStore.getState().updateMoney(-cost);

        const { scale, positionX, positionY } = transformRef.current.instance.transformState;
        const x = (e.clientX - positionX) / scale;
        const y = (e.clientY - positionY) / scale;

        const newNode: GameNode = {
            id: `${type}-${Date.now()}`,
            type,
            position: { x, y },
            label: type,
            queue: [],
            maxQueueSize: serviceDef?.baseStats?.maxQueueSize ?? (type === 'vm' ? 5 : 20),
            processingSpeed: serviceDef?.baseStats?.processingSpeed ?? (type === 'vm' ? 2 : 5),
            freeRequestsRemaining: serviceDef?.freeRequests,
            processingMultiplier: serviceDef?.processingMultiplier,
            activeTasks: [],
            utilization: 0
        };

        addNode(newNode);
    };

    const nodes = useGameStore((state) => state.nodes);

    return (
        <div
            className="w-full h-full bg-azure-bg overflow-hidden relative cursor-default"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onMouseDown={handleBackgroundMouseDown} // Added for rubber banding
            onClick={(e) => {
                // Clear selection on background click (unless panning/dragging check needed?)
                // Simple check: if we aren't using modifier keys, clear.
                if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                    setSelectedNodes(new Set());
                    setSelectedRegion(null);
                    setSelectedEdge(null);
                    setConnectSourceId(null);
                }
            }}
        >
            <TransformWrapper
                ref={transformRef}
                initialScale={1}
                minScale={0.1}
                maxScale={4}
                limitToBounds={false}
                centerOnInit={false}
                initialPositionX={-1000}
                initialPositionY={-1000}
                disabled={!!draggingId || !!selectionBox} // Disable pan while dragging or selecting
            >
                <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full">
                    <div
                        className="relative w-[3000px] h-[3000px] bg-azure-bg origin-top-left"
                        style={{
                            backgroundImage: 'radial-gradient(#2d3748 1px, transparent 1px)',
                            backgroundSize: '20px 20px'
                        }}
                    >
                        {/* Regions Layer (Background) */}
                        {Object.values(regions).map((region) => (
                            <RegionNode
                                key={region.id}
                                region={region}
                                isSelected={selectedRegionId === region.id}
                                onMouseDown={(e) => handleRegionMouseDown(region.id, e)}
                                onResizeMouseDown={(e) => handleRegionResizeMouseDown(region.id, e)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRegion(region.id);
                                    setSelectedNodes(new Set());
                                    setSelectedEdge(null);
                                }}
                            />
                        ))}

                        {/* Edges Layer */}
                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
                            {edges.map((edge) => {
                                const source = nodes[edge.source];
                                const target = nodes[edge.target];
                                if (!source || !target) return null;
                                return (
                                    <ConnectionLine
                                        key={edge.id}
                                        edge={edge}
                                        source={source}
                                        target={target}
                                        isSelected={selectedEdgeId === edge.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedEdge(edge.id);
                                            setSelectedNodes(new Set());
                                            setSelectedRegion(null);
                                        }}
                                    />
                                );
                            })}
                        </svg>

                        {/* Selection Box Visual */}
                        {selectionBox && (
                            <div
                                className="absolute border border-blue-500 bg-blue-500/20 pointer-events-none z-50"
                                style={{
                                    left: Math.min(selectionBox.startX, selectionBox.endX),
                                    top: Math.min(selectionBox.startY, selectionBox.endY),
                                    width: Math.abs(selectionBox.endX - selectionBox.startX),
                                    height: Math.abs(selectionBox.endY - selectionBox.startY)
                                }}
                            />
                        )}

                        {/* Particle Layer */}
                        <ParticleCanvas width={3000} height={3000} />

                        {/* Nodes Layer */}
                        {nodeIds.map((nodeId) => (
                            <ServiceNode
                                key={nodeId}
                                id={nodeId}
                                onMouseDown={(e) => handleNodeMouseDown(nodeId, e)}
                                onClick={handleNodeClick}
                                isConnectSource={connectSourceId === nodeId}
                                isSelected={selectedNodeIds.has(nodeId)}
                            />
                        ))}
                    </div>
                </TransformComponent>
            </TransformWrapper>

            {/* ... HUDs ... */}
            {/* Connection Status Indicator */}
            {connectSourceId && (
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50 text-yellow-400 font-bold animate-pulse bg-black/80 px-6 py-2 rounded-full border border-yellow-500/50 pointer-events-none shadow-lg backdrop-blur">
                    Select Target Node to Connect...
                </div>
            )}


        </div>
    );
};
