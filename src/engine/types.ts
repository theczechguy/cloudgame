export type NodeType = 'internet' | 'vm' | 'app-service' | 'function-app' | 'sql-db' | 'sql-db-premium' | 'cosmos-db' | 'traffic-manager' | 'load-balancer' | 'storage-queue' | 'firewall' | 'waf' | 'redis' | 'blob-storage' | 'azure-monitor';


export type PacketType = 'http-compute' | 'http-db' | 'http-storage' | 'http-attack' | 'db-query' | 'db-result' | 'http-response' | 'storage-op' | 'storage-result' | 'log-entry';


export const GEO_REGIONS = ['North America', 'Europe', 'Asia Pacific', 'South America'];

export interface Packet {
    id: string;
    type: PacketType;

    // Movement State
    edgeId: string; // The edge this packet is currently traveling on
    reversed?: boolean; // If true, traveling Target -> Source
    progress: number; // 0.0 to 1.0 (Start to End)
    speed: number; // Units per second (relative to progress, needs calc based on length)
    routeStack: string[]; // Path history for strict return routing
    targetNodeId?: string; // For direct flight (e.g., telemetry)

    // Geo Routing
    originRegion?: string; // e.g. 'North America'
    slaViolated?: boolean; // If processed in wrong region
}

export interface GameEdge {
    id: string;
    source: string;
    target: string;
}

export interface Task {
    completesAt: number; // Timestamp
    packet: Packet;
}

export interface Region {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    geoId?: string; // e.g. 'North America'
}

export interface GameNode {
    id: string;
    type: NodeType;
    position: { x: number; y: number };
    label: string;
    regionId?: string; // region detection

    // State
    queue: Packet[];
    maxQueueSize: number;
    processingSpeed?: number; // Override catalog
    processingMultiplier?: number;
    activeTasks?: Task[];
    utilization?: number; // 0.0 to 1.0

    // Serverless specific
    freeRequestsRemaining?: number;

    // Internet specific
    trafficOrigin?: string; // Forced origin for spawned packets
}

export interface GameState {
    nodes: Record<string, GameNode>;
    nodeIds: string[]; // Optimization: Stable ID list
    edges: Record<string, GameEdge>;
    regions: Record<string, Region>; // Regional zones
    packets: Packet[];

    // Selection State (Moved from Board)
    selectedNodeIds: Set<string>;
    selectedRegionId: string | null;
    selectedEdgeId: string | null;
    selectionBox: { startX: number, startY: number, endX: number, endY: number } | null;

    // Economy
    money: number;
    score: number;
    recentIncome: number;
    incomeEvents?: Array<{ t: number; amt: number }>;

    // Monitoring
    isMonitored?: boolean; // True if Azure Monitor is active

    // Stats
    fps: number;

    // Visuals
    dropEvents?: Array<{ nodeId?: string, x?: number, y?: number, t: number }>;
    nodeLastDrop?: Record<string, number>;
    nodeLastCacheHit?: Record<string, number>;

    // Simulation
    spawnRate: number; // ms interval
    sandboxMode: boolean;

    // Actions
    updateMoney: (amount: number) => void;
    addNode: (node: GameNode) => void;
    updateNode: (id: string, updates: Partial<GameNode>) => void;
    removeNode: (id: string) => void;
    addEdge: (edge: GameEdge) => void;
    removeEdge: (id: string) => void;
    addRegion: (region: Region) => void;
    updateRegion: (id: string, updates: Partial<Region>) => void;
    removeRegion: (id: string) => void;
    setFps: (fps: number) => void;
    addDrop: (event: { nodeId?: string, x?: number, y?: number }) => void;
    addCacheHit: (nodeId: string) => void;
    setSpawnRate: (rate: number) => void;
    toggleSandboxMode: () => void;
    updateNodePosition: (id: string, position: { x: number, y: number }) => void;

    // Selection Actions
    setSelectedNodes: (ids: Set<string>) => void;
    toggleNodeSelection: (id: string, multi: boolean) => void;
    setSelectedRegion: (id: string | null) => void;
    setSelectedEdge: (id: string | null) => void;
    setSelectionBox: (box: { startX: number, startY: number, endX: number, endY: number } | null) => void;
}
