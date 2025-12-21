import { create } from 'zustand';
import type { GameNode, GameEdge, GameState, Packet } from '../engine/types';
import type { TrafficConfig } from '../config/storyWaves';
// Base stats moved to catalog, but logic here mainly state container

type IncomeEvent = { t: number; amt: number; type?: 'bandwidth' | 'sla-loss' | 'reward' | 'drop'; region?: string; nodeId?: string };

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
    setWaveConfig: (config: TrafficConfig[] | null) => void;
    setWaveIndex: (index: number) => void;

    showStoryIntro: boolean;
    setShowStoryIntro: (show: boolean) => void;

    isPaused: boolean;
    togglePause: () => void;

    // Simulation Config
    activeTrafficConfig: TrafficConfig[] | null;

    // Notifications
    notifications: Array<{ id: string; message: string; type: 'info' | 'warning' | 'error'; timestamp: number }>;
    addNotification: (message: string, type?: 'info' | 'warning' | 'error') => void;
    removeNotification: (id: string) => void;

    // Derived Stats (for Monitor)
    refreshMetrics: () => void;
}

const calculateRecentStats = (incomeEvents: IncomeEvent[], dropEvents: Array<{ t: number }>) => {
    const now = Date.now();
    const cutoff5s = now - 5000;
    const cutoff1s = now - 1000;

    const keptIncome = incomeEvents.filter(e => e.t >= cutoff5s);
    const keptDropsVisual = dropEvents.filter(e => e.t >= cutoff5s); // Keep 5s for visuals
    const keptDropsStat = dropEvents.filter(e => e.t >= cutoff1s); // Only 1s for the HUD number

    const recentIncome = keptIncome.reduce((s, e) => s + e.amt, 0) / 5;
    const recentBandwidthCost = keptIncome.filter(e => e.type === 'bandwidth').reduce((s, e) => s + Math.abs(e.amt), 0) / 5;
    const recentSlaLoss = keptIncome.filter(e => e.type === 'sla-loss').reduce((s, e) => s + Math.abs(e.amt), 0) / 5;
    const recentDropLoss = keptIncome.filter(e => e.type === 'drop').reduce((s, e) => s + Math.abs(e.amt), 0) / 5;

    const recentSlaLossByRegion: Record<string, number> = {};
    keptIncome.filter(e => e.type === 'sla-loss' && e.region).forEach(e => {
        recentSlaLossByRegion[e.region!] = (recentSlaLossByRegion[e.region!] || 0) + (Math.abs(e.amt) / 5);
    });

    const recentDropLossByNode: Record<string, number> = {};
    keptIncome.filter(e => e.type === 'drop' && e.nodeId).forEach(e => {
        recentDropLossByNode[e.nodeId!] = (recentDropLossByNode[e.nodeId!] || 0) + (Math.abs(e.amt) / 5);
    });

    return {
        incomeEvents: keptIncome,
        dropEvents: keptDropsVisual,
        recentIncome,
        recentBandwidthCost,
        recentSlaLoss,
        recentSlaLossByRegion,
        recentDropLoss,
        recentDropLossByNode,
        recentDrops: keptDropsStat.length // Unsmoothed 1s total
    };
};

export const useGameStore = create<GameStore>((set) => ({
    // ... initial state ...
    nodes: {
        'internet-1': { id: 'internet-1', type: 'internet', position: { x: 1300, y: 1300 }, label: 'Internet', queue: [], maxQueueSize: 0, processingSpeed: 0, utilization: 0 },
        // Security Layer
        'waf-1': { id: 'waf-1', type: 'waf', position: { x: 1300, y: 1450 }, regionId: 'r1', label: 'WAF', queue: [], maxQueueSize: 10, utilization: 0 },
        // Routing
        'lb-1': { id: 'lb-1', type: 'load-balancer', position: { x: 1300, y: 1600 }, regionId: 'r1', label: 'Load Balancer', queue: [], maxQueueSize: 20, utilization: 0 },

        // Compute Cluster (2 Funcs + 1 VM)
        'func-1': { id: 'func-1', type: 'function-app', position: { x: 1100, y: 1800 }, regionId: 'r1', label: 'Func A', queue: [], maxQueueSize: 10, processingSpeed: 2, processingMultiplier: 1.2, utilization: 0, freeRequestsRemaining: 100 },
        'func-2': { id: 'func-2', type: 'function-app', position: { x: 1300, y: 1800 }, regionId: 'r1', label: 'Func B', queue: [], maxQueueSize: 10, processingSpeed: 2, processingMultiplier: 1.2, utilization: 0, freeRequestsRemaining: 100 },
        'vm-1': { id: 'vm-1', type: 'vm', position: { x: 1500, y: 1800 }, regionId: 'r1', label: 'VM C', queue: [], maxQueueSize: 50, processingSpeed: 8, processingMultiplier: 1.5, utilization: 0 },

        // Data Layer
        'sql-1': { id: 'sql-1', type: 'sql-db', position: { x: 1200, y: 2100 }, regionId: 'r1', label: 'Azure SQL', queue: [], maxQueueSize: 100, processingSpeed: 5, processingMultiplier: 1.5, utilization: 0 },
        'blob-1': { id: 'blob-1', type: 'blob-storage', position: { x: 1400, y: 2100 }, regionId: 'r1', label: 'Blob Storage', queue: [], maxQueueSize: 50, processingSpeed: 20, utilization: 0 },
    },
    nodeIds: ['internet-1', 'waf-1', 'lb-1', 'func-1', 'func-2', 'vm-1', 'sql-1', 'blob-1'],

    // Initial Regions
    regions: {
        'r1': { id: 'r1', label: 'North America', x: 900, y: 1400, width: 800, height: 900, geoId: 'North America' }
    },

    edges: {
        // Internet -> WAF -> LB
        'e1': { id: 'e1', source: 'internet-1', target: 'waf-1' },
        'e2': { id: 'e2', source: 'waf-1', target: 'lb-1' },

        // LB -> Compute
        'e3': { id: 'e3', source: 'lb-1', target: 'func-1' },
        'e4': { id: 'e4', source: 'lb-1', target: 'func-2' },
        'e5': { id: 'e5', source: 'lb-1', target: 'vm-1' },

        // Compute -> Data
        'e6': { id: 'e6', source: 'func-1', target: 'sql-1' },
        'e7': { id: 'e7', source: 'func-1', target: 'blob-1' },

        'e8': { id: 'e8', source: 'func-2', target: 'sql-1' },
        'e9': { id: 'e9', source: 'func-2', target: 'blob-1' },

        'e10': { id: 'e10', source: 'vm-1', target: 'sql-1' },
        'e11': { id: 'e11', source: 'vm-1', target: 'blob-1' },
    },
    packets: [],
    money: 500,
    recentIncome: 0,
    recentBandwidthCost: 0,
    recentSlaLoss: 0,
    recentDropLoss: 0,
    recentSlaLossByRegion: {},
    recentDropLossByNode: {},
    incomeEvents: [],
    totalDrops: 0,
    recentDrops: 0,
    dropEvents: [],
    nodeLastDrop: {},
    nodeLastCacheHit: {},
    score: 0,
    fps: 60,
    spawnRate: 999999, // Essentially paused until game starts
    activeTrafficConfig: null, // Default to all
    currentWaveIndex: 0,
    isGameOver: false,
    gameOverReason: null,




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
        money: 750, // Harder start (was 500)
        regions: {}, // No regions

        // Minimal Global Setup
        currentWaveIndex: 0,
        nodes: {
            'internet-1': { id: 'internet-1', type: 'internet', position: { x: 1300, y: 1300 }, label: 'Internet', queue: [], maxQueueSize: 0, processingSpeed: 0, utilization: 0 },
            'func-1': { id: 'func-1', type: 'function-app', position: { x: 1300, y: 1600 }, label: 'Function App', queue: [], maxQueueSize: 10, processingSpeed: 2, processingMultiplier: 1.2, utilization: 0, freeRequestsRemaining: 100 },
        },
        nodeIds: ['internet-1', 'func-1'],
        edges: {
            'e1': { id: 'e1', source: 'internet-1', target: 'func-1' },
        },
        packets: [],
        storyStage: 0,
        activeTrafficConfig: [{ type: 'http-compute', rate: 2000 }], // Start with simple compute only (Wave 1)
        showStoryIntro: true,
        isGameOver: false,
        gameOverReason: null
    }),

    showStoryIntro: false,
    setShowStoryIntro: (show) => set({ showStoryIntro: show }),

    isPaused: false,
    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

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
    setWaveConfig: (config) => set({ activeTrafficConfig: config }), // NEW
    setWaveIndex: (index) => set({ currentWaveIndex: index }),
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
    addEdge: (edge) => set((state) => {
        const sourceNode = state.nodes[edge.source];
        const targetNode = state.nodes[edge.target];

        // 1. Warning: Connection to Internet as a Sink
        // We allow it (direction independence), but let's notify the user if they might be confused
        // about data flow (requests always start FROM the internet).
        if (targetNode?.type === 'internet' && sourceNode?.type !== 'internet') {
            // We don't block it anymore, but we can still notify if we want.
            // Actually, let's just make it silent and work.
        }

        // 2. Validation: Internet Node Limit (Outgoing)
        if (sourceNode?.type === 'internet') {
            const existingEdges = Object.values(state.edges).filter(e => e.source === edge.source);
            if (existingEdges.length >= 1) { // Allows 1 edge. If 1 exists, block 2nd.
                return {
                    notifications: [
                        ...state.notifications,
                        {
                            id: Math.random().toString(36).substr(2, 9),
                            message: "Internet Link Saturated! Use a Load Balancer to connect more nodes.",
                            type: 'warning',
                            timestamp: Date.now()
                        }
                    ]
                };
            }
        }

        return { edges: { ...state.edges, [edge.id]: edge } };
    }),
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

        const nodeLast = { ...state.nodeLastDrop };
        if (event.nodeId) nodeLast[event.nodeId] = now;

        const nextState = {
            dropEvents: events,
            totalDrops: state.totalDrops + 1,
            nodeLastDrop: nodeLast
        };

        // Trigger immediate recalculation
        const stats = calculateRecentStats(state.incomeEvents || [], events);
        return { ...nextState, ...stats };
    }),
    addCacheHit: (nodeId) => set((state) => ({
        nodeLastCacheHit: { ...state.nodeLastCacheHit, [nodeId]: Date.now() }
    })),
    updateMoney: (amount, type, region, nodeId) => set((state) => {
        const now = Date.now();
        const events: IncomeEvent[] = [...(state.incomeEvents || []), { t: now, amt: amount, type, region, nodeId }];

        const nextMoney = state.money + amount;
        const isGameOverThreshold = !state.sandboxMode && nextMoney <= -500;

        const nextState = {
            money: nextMoney,
            incomeEvents: events,
            isGameOver: state.isGameOver || isGameOverThreshold,
            gameOverReason: (state.isGameOver || isGameOverThreshold) ? (state.gameOverReason || "BANKRUPTCY: Your cash reserves hit -$500. The cloud provider has revoked your access.") : null,
            isPaused: state.isPaused || isGameOverThreshold
        };

        // Trigger immediate recalculation
        const stats = calculateRecentStats(events, state.dropEvents || []);
        return { ...nextState, ...stats };
    }),
    refreshMetrics: () => set((state) => {
        return calculateRecentStats(state.incomeEvents || [], state.dropEvents || []);
    }),
    setFps: (fps) => set({ fps }),
}));
