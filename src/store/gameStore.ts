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
}

export const useGameStore = create<GameStore>((set) => ({
    // ... initial state ...
    nodes: {
        'internet-1': { id: 'internet-1', type: 'internet', position: { x: 1300, y: 1300 }, label: 'Internet', queue: [], maxQueueSize: 0, processingSpeed: 0, utilization: 0 },
        'tm-1': { id: 'tm-1', type: 'traffic-manager', position: { x: 1300, y: 1500 }, label: 'Traffic Mgr', queue: [], maxQueueSize: 20, processingSpeed: 100, utilization: 0 },
        'fw-1': { id: 'fw-1', type: 'firewall', position: { x: 1300, y: 1700 }, label: 'Firewall', queue: [], maxQueueSize: 20, processingSpeed: 100, utilization: 0 },
        'lb-1': { id: 'lb-1', type: 'load-balancer', position: { x: 1300, y: 1900 }, label: 'Load Balancer', queue: [], maxQueueSize: 20, processingSpeed: 100, utilization: 0 },

        // Compute Layer
        'vm-1': { id: 'vm-1', type: 'vm', position: { x: 1000, y: 2200 }, regionId: 'r1', label: 'VM Cluster', queue: [], maxQueueSize: 10, processingSpeed: 10, processingMultiplier: 2, utilization: 0 },
        'app-1': { id: 'app-1', type: 'app-service', position: { x: 1300, y: 2200 }, regionId: 'r1', label: 'App Service', queue: [], maxQueueSize: 15, processingSpeed: 20, processingMultiplier: 3, utilization: 0 },
        'func-1': { id: 'func-1', type: 'function-app', position: { x: 1600, y: 2200 }, regionId: 'r1', label: 'Function App', queue: [], maxQueueSize: 5, processingSpeed: 6, processingMultiplier: 1.2, utilization: 0, freeRequestsRemaining: 1000 },

        // Data Layer
        'sql-1': { id: 'sql-1', type: 'sql-db', position: { x: 1150, y: 2600 }, regionId: 'r1', label: 'Primary DB', queue: [], maxQueueSize: 100, processingSpeed: 10, processingMultiplier: 1.5, utilization: 0 },
        'redis-1': { id: 'redis-1', type: 'redis', position: { x: 1300, y: 2500 }, regionId: 'r1', label: 'Redis Cache', queue: [], maxQueueSize: 0, processingSpeed: 100, utilization: 0 },
        'blob-1': { id: 'blob-1', type: 'blob-storage', position: { x: 1600, y: 2600 }, regionId: 'r1', label: 'Blob Storage', queue: [], maxQueueSize: 50, processingSpeed: 20, utilization: 0 },

        // Monitor
        'monitor-1': { id: 'monitor-1', type: 'azure-monitor', position: { x: 1800, y: 1400 }, label: 'Azure Monitor', queue: [], maxQueueSize: 0, processingSpeed: 0, utilization: 0 }
    },
    nodeIds: ['internet-1', 'tm-1', 'fw-1', 'lb-1', 'vm-1', 'app-1', 'func-1', 'sql-1', 'redis-1', 'blob-1', 'monitor-1'],

    // Initial Regions
    regions: {
        'r1': { id: 'r1', label: 'North America', x: 900, y: 2100, width: 900, height: 600, geoId: 'North America' }
    },

    edges: {
        'e1': { id: 'e1', source: 'internet-1', target: 'tm-1' },
        'e2': { id: 'e2', source: 'tm-1', target: 'fw-1' },
        'e3': { id: 'e3', source: 'fw-1', target: 'lb-1' },

        // Distribution
        'e4': { id: 'e4', source: 'lb-1', target: 'vm-1' },
        'e5': { id: 'e5', source: 'lb-1', target: 'app-1' },
        'e6': { id: 'e6', source: 'lb-1', target: 'func-1' },

        // Backend Connections
        'e7': { id: 'e7', source: 'vm-1', target: 'sql-1' },
        'e8': { id: 'e8', source: 'app-1', target: 'redis-1' },
        'e9': { id: 'e9', source: 'redis-1', target: 'sql-1' }, // Cache Miss Path
        'e10': { id: 'e10', source: 'func-1', target: 'blob-1' },

        // Missing Connectivity Fixes (prevent random drops)
        'e11': { id: 'e11', source: 'vm-1', target: 'blob-1' },
        'e12': { id: 'e12', source: 'app-1', target: 'blob-1' },
        'e13': { id: 'e13', source: 'func-1', target: 'sql-1' }
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
    spawnRate: 300, // Faster spawn rate for testing


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
