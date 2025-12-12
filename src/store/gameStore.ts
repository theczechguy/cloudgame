import { create } from 'zustand';
import type { GameNode, GameEdge, GameState, Packet } from '../engine/types';
// Base stats moved to catalog, but logic here mainly state container

type IncomeEvent = { t: number; amt: number };

interface GameStore extends GameState {
    // Actions
    addNode: (node: GameNode) => void;
    updateNode: (id: string, updates: Partial<GameNode>) => void;

    // Sandbox
    sandboxMode: boolean;
    toggleSandboxMode: () => void;

    // Drop tracking
    totalDrops: number;
    recentDrops: number; // over last 1s
    dropEvents: Array<{ t: number; nodeId?: string; x?: number; y?: number }>;
    nodeLastDrop: Record<string, number>;
    addDrop: (event: { nodeId?: string; x?: number; y?: number }) => void;

    // Cache tracking
    nodeLastCacheHit: Record<string, number>;
    addCacheHit: (nodeId: string) => void;

    duplicateNodes: (ids: string[]) => string[];

    // Game Mode State
    gameMode: 'sandbox' | 'story' | null;
    storyStage: number;
    setGameMode: (mode: 'sandbox' | 'story' | null) => void;
    setStoryStage: (stage: number) => void;
    resetToStoryState: () => void;

    // Notifications
    notifications: Array<{ id: string; message: string; type: 'info' | 'warning' | 'error'; timestamp: number }>;
    addNotification: (message: string, type?: 'info' | 'warning' | 'error') => void;
    removeNotification: (id: string) => void;
}

export const useGameStore = create<GameStore>((set) => ({
    // ... initial state ...
    nodes: {
        'internet-1': { id: 'internet-1', type: 'internet', position: { x: 1300, y: 1300 }, label: 'Internet', queue: [], maxQueueSize: 0, processingSpeed: 0, utilization: 0 },
        // Simplified Compute (1x Function) - Direct from Internet
        'func-1': { id: 'func-1', type: 'function-app', position: { x: 1300, y: 1600 }, regionId: 'r1', label: 'Function App', queue: [], maxQueueSize: 10, processingSpeed: 2, processingMultiplier: 1.2, utilization: 0, freeRequestsRemaining: 1000 },
        // Data Layer
        'sql-1': { id: 'sql-1', type: 'sql-db', position: { x: 1150, y: 1900 }, regionId: 'r1', label: 'Azure SQL', queue: [], maxQueueSize: 100, processingSpeed: 5, processingMultiplier: 1.5, utilization: 0 },
        'blob-1': { id: 'blob-1', type: 'blob-storage', position: { x: 1450, y: 1900 }, regionId: 'r1', label: 'Blob Storage', queue: [], maxQueueSize: 50, processingSpeed: 20, utilization: 0 },
    },
    nodeIds: ['internet-1', 'func-1', 'sql-1', 'blob-1'],

    // Initial Regions
    regions: {
        'r1': { id: 'r1', label: 'North America', x: 900, y: 1500, width: 800, height: 600, geoId: 'North America' }
    },

    edges: {
        'e1': { id: 'e1', source: 'internet-1', target: 'func-1' },
        'e2': { id: 'e2', source: 'func-1', target: 'sql-1' },
        'e3': { id: 'e3', source: 'func-1', target: 'blob-1' }
    },
    packets: [],
    money: 5000, // Higher starting capital for complex setup
    recentIncome: 0,
    incomeEvents: [],
    totalDrops: 0,
    recentDrops: 0,
    dropEvents: [],
    nodeLastDrop: {},
    nodeLastCacheHit: {},
    score: 0,
    fps: 60,
    spawnRate: 999999, // Essentially paused until game starts




    sandboxMode: false,

    // Selection
    selectedNodeIds: new Set(),
    selectedRegionId: null,
    selectedEdgeId: null,
    selectionBox: null,

    setSelectedNodes: (ids) => set({ selectedNodeIds: ids }),
    toggleNodeSelection: (id, multi) => set((state) => {
        const next = new Set(multi ? state.selectedNodeIds : []);
        if (state.selectedNodeIds.has(id)) {
            if (multi) next.delete(id);
            else return { selectedNodeIds: new Set([id]) }; // If single select, ensure it is selected
        } else {
            next.add(id);
        }
        return { selectedNodeIds: next };
    }),
    setSelectedRegion: (id) => set({ selectedRegionId: id }),
    setSelectedEdge: (id) => set({ selectedEdgeId: id }),
    setSelectionBox: (box) => set({ selectionBox: box }),

    // Game Mode
    gameMode: null, // Start at menu
    storyStage: 0,
    setGameMode: (mode) => set({ gameMode: mode }),
    setStoryStage: (stage) => set({ storyStage: stage }),
    resetToStoryState: () => set({
        gameMode: 'story',
        money: 500, // Harder start
        regions: {}, // No regions

        // Minimal Global Setup
        nodes: {
            'internet-1': { id: 'internet-1', type: 'internet', position: { x: 1300, y: 1300 }, label: 'Internet', queue: [], maxQueueSize: 0, processingSpeed: 0, utilization: 0 },
            'func-1': { id: 'func-1', type: 'function-app', position: { x: 1300, y: 1600 }, label: 'Function App', queue: [], maxQueueSize: 10, processingSpeed: 2, processingMultiplier: 1.2, utilization: 0, freeRequestsRemaining: 1000 },
            'sql-1': { id: 'sql-1', type: 'sql-db', position: { x: 1150, y: 1900 }, label: 'Azure SQL', queue: [], maxQueueSize: 100, processingSpeed: 5, processingMultiplier: 1.5, utilization: 0 },
            'blob-1': { id: 'blob-1', type: 'blob-storage', position: { x: 1450, y: 1900 }, label: 'Blob Storage', queue: [], maxQueueSize: 50, processingSpeed: 20, utilization: 0 },
        },
        nodeIds: ['internet-1', 'func-1', 'sql-1', 'blob-1'],
        edges: {
            'e1': { id: 'e1', source: 'internet-1', target: 'func-1' },
            'e2': { id: 'e2', source: 'func-1', target: 'sql-1' },
            'e3': { id: 'e3', source: 'func-1', target: 'blob-1' }
        },
        packets: [],
        storyStage: 0
    }),

    // Notifications
    notifications: [],
    addNotification: (message, type = 'info') => set((state) => ({
        notifications: [
            ...state.notifications,
            { id: Math.random().toString(36).substr(2, 9), message, type, timestamp: Date.now() }
        ]
    })),
    removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
    })),

    addNode: (node) => set((state) => ({
        nodes: { ...state.nodes, [node.id]: node },
        nodeIds: [...state.nodeIds, node.id]
    })),
    updateNode: (id, updates) => set((state) => ({
        nodes: { ...state.nodes, [id]: { ...state.nodes[id], ...updates } }
    })),
    toggleSandboxMode: () => set((state) => ({ sandboxMode: !state.sandboxMode })),
    setSpawnRate: (rate) => set({ spawnRate: rate }),
    updateNodePosition: (id, position) => set((state) => {
        // If the node being moved is part of a selection, we must move ALL selected nodes by the delta
        // BUT `updateNodePosition` is usually called with absolute position for the dragged node.
        // We need to calculate delta from the dragged node's current position.

        const draggedNode = state.nodes[id];
        if (!draggedNode) return {};

        const dx = position.x - draggedNode.position.x;
        const dy = position.y - draggedNode.position.y;

        const nodesToUpdate = state.selectedNodeIds.has(id)
            ? Array.from(state.selectedNodeIds)
            : [id];

        const updatedNodes: Record<string, GameNode> = {};

        nodesToUpdate.forEach(nid => {
            const n = state.nodes[nid];
            if (!n) return;

            // Calculate new pos
            const nx = (nid === id) ? position.x : n.position.x + dx;
            const ny = (nid === id) ? position.y : n.position.y + dy;

            // Containment Logic
            let regionId: string | undefined = undefined;
            Object.values(state.regions).forEach(r => {
                if (nx >= r.x && nx <= r.x + r.width &&
                    ny >= r.y && ny <= r.y + r.height) {
                    regionId = r.id;
                }
            });

            updatedNodes[nid] = { ...n, position: { x: nx, y: ny }, regionId };
        });

        return {
            nodes: { ...state.nodes, ...updatedNodes }
        };
    }),
    removeNode: (id) => set((state) => {
        const { [id]: _, ...remainingNodes } = state.nodes;
        // Also remove connected edges
        const remainingEdges = Object.fromEntries(
            Object.entries(state.edges).filter(([_, edge]) => edge.source !== id && edge.target !== id)
        );
        return {
            nodes: remainingNodes,
            nodeIds: state.nodeIds.filter(nid => nid !== id),
            edges: remainingEdges
        };
    }),
    addEdge: (edge) => set((state) => ({ edges: { ...state.edges, [edge.id]: edge } })),
    removeEdge: (id) => set((state) => {
        const { [id]: _, ...remainingEdges } = state.edges;
        return { edges: remainingEdges };
    }),


    // Region Actions
    // regions initialized above
    addRegion: (region) => set((state) => {
        // 1. Add the new region
        const newRegions = { ...state.regions, [region.id]: region };

        // 2. Check all nodes to see if they fall into this NEW region
        // (We can just check against this one new region since it's the latest "layer" if we assume simple Z-ordering or just "last added wins" which is typical for simple checks, 
        //  BUT to be consistent with updateNodePosition, we should probably check all regions for correctness if overlaps exist. 
        //  However, if we just want to see if they are in *this* one, we can check this one.
        //  If we want strict correctness for "topmost" region, we should re-evaluate all. Let's re-evaluate all for consistency.)
        const updatedNodes = { ...state.nodes };
        let hasUpdates = false;

        state.nodeIds.forEach(nodeId => {
            const node = updatedNodes[nodeId];
            const pos = node.position;

            // Re-calculate region usage using the NEW set of regions
            let bestRegionId: string | undefined = undefined;
            Object.values(newRegions).forEach(r => {
                if (pos.x >= r.x && pos.x <= r.x + r.width &&
                    pos.y >= r.y && pos.y <= r.y + r.height) {
                    bestRegionId = r.id;
                }
            });

            if (node.regionId !== bestRegionId) {
                updatedNodes[nodeId] = { ...node, regionId: bestRegionId };
                hasUpdates = true;
            }
        });

        return {
            regions: newRegions,
            nodes: hasUpdates ? updatedNodes : state.nodes
        };
    }),
    updateRegion: (id, updates) => set((state) => {
        // 1. Update the region
        const currentRegion = state.regions[id];
        if (!currentRegion) return {}; // Should not happen

        const updatedRegion = { ...currentRegion, ...updates };
        const newRegions = { ...state.regions, [id]: updatedRegion };

        // 2. Re-evaluate ALL nodes because moving a region might:
        //    a) Capture nodes (now inside)
        //    b) Release nodes (now outside)
        //    c) Change ownership (overlapping regions)
        const updatedNodes = { ...state.nodes };
        let hasUpdates = false;

        state.nodeIds.forEach(nodeId => {
            const node = updatedNodes[nodeId];
            const pos = node.position;

            let bestRegionId: string | undefined = undefined;
            Object.values(newRegions).forEach(r => {
                if (pos.x >= r.x && pos.x <= r.x + r.width &&
                    pos.y >= r.y && pos.y <= r.y + r.height) {
                    bestRegionId = r.id;
                }
            });

            if (node.regionId !== bestRegionId) {
                updatedNodes[nodeId] = { ...node, regionId: bestRegionId };
                hasUpdates = true;
            }
        });

        return {
            regions: newRegions,
            nodes: hasUpdates ? updatedNodes : state.nodes
        };
    }),
    removeRegion: (id) => set((state) => {
        const { [id]: _, ...remainingRegions } = state.regions;

        // Also need to update nodes that were in this region!
        const updatedNodes = { ...state.nodes };
        let hasUpdates = false;

        state.nodeIds.forEach(nodeId => {
            const node = updatedNodes[nodeId];
            if (node.regionId === id) {
                // It was in the removed region. Is it in another one now underneath?
                // We must check remainingRegions.
                const pos = node.position;
                let bestRegionId: string | undefined = undefined;
                Object.values(remainingRegions).forEach(r => {
                    if (pos.x >= r.x && pos.x <= r.x + r.width &&
                        pos.y >= r.y && pos.y <= r.y + r.height) {
                        bestRegionId = r.id;
                    }
                });

                updatedNodes[nodeId] = { ...node, regionId: bestRegionId };
                hasUpdates = true;
            }
        });

        return {
            regions: remainingRegions,
            nodes: hasUpdates ? updatedNodes : state.nodes
        };
    }),

    updatePackets: (packets: Packet[]) => set({ packets }),

    duplicateNodes: (idsToDuplicate: string[]) => {
        let newIds: string[] = [];
        set((state) => {
            const idMap = new Map<string, string>();
            const newNodes: Record<string, GameNode> = {};
            const newEdges: Record<string, GameEdge> = {};

            // 1. Clone Nodes
            idsToDuplicate.forEach((oldId: string) => {
                const oldNode = state.nodes[oldId];
                if (!oldNode) return;

                const newId = `${oldNode.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                idMap.set(oldId, newId);

                newNodes[newId] = {
                    ...oldNode,
                    id: newId,
                    position: { x: oldNode.position.x + 50, y: oldNode.position.y + 50 },
                    // Reset transient state
                    queue: [],
                    activeTasks: [],
                    utilization: 0
                };
                newIds.push(newId);
            });

            // 2. Clone Internal Edges
            Object.values(state.edges).forEach(edge => {
                if (idMap.has(edge.source) && idMap.has(edge.target)) {
                    // This is an internal edge within the selection
                    const newSource = idMap.get(edge.source)!;
                    const newTarget = idMap.get(edge.target)!;
                    const newEdgeId = `e-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

                    newEdges[newEdgeId] = {
                        ...edge,
                        id: newEdgeId,
                        source: newSource,
                        target: newTarget
                    };
                }
            });

            return {
                nodes: { ...state.nodes, ...newNodes },
                nodeIds: [...state.nodeIds, ...newIds],
                edges: { ...state.edges, ...newEdges }
            };
        });
        return newIds;
    },

    addDrop: (event) => set((state) => {
        const now = Date.now();
        const events = [...state.dropEvents, { t: now, nodeId: event.nodeId, x: event.x, y: event.y }];
        // keep recent events for 5s to allow visuals
        const cutoff = now - 5000;
        const kept = events.filter(e => e.t >= cutoff);
        // recentDrops over 1s
        const cutoffRecent = now - 1000;
        const recent = kept.filter(e => e.t >= cutoffRecent).length;
        const nodeLast = { ...state.nodeLastDrop };
        if (event.nodeId) nodeLast[event.nodeId] = now;
        return { dropEvents: kept, totalDrops: state.totalDrops + 1, recentDrops: recent, nodeLastDrop: nodeLast };
    }),
    addCacheHit: (nodeId) => set((state) => ({
        nodeLastCacheHit: { ...state.nodeLastCacheHit, [nodeId]: Date.now() }
    })),
    updateMoney: (amount) => set((state) => {
        const now = Date.now();
        const events: IncomeEvent[] = [...(state.incomeEvents || []), { t: now, amt: amount }];
        const cutoff = now - 1000;
        const kept = events.filter(e => e.t >= cutoff);
        const recentIncome = kept.reduce((s, e) => s + e.amt, 0);
        return { money: state.money + amount, incomeEvents: kept, recentIncome };
    }),
    setFps: (fps) => set({ fps }),
}));
