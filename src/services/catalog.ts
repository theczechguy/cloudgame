import type { NodeType } from '../engine/types';

export interface ServiceDefinition {
    type: NodeType;
    label: string;
    cost: number; // Cost to buy
    upkeep: number; // Cost per second
    description: string;
    icon: string;
    baseStats?: { // Added baseStats
        processingSpeed: number;
        maxQueueSize: number;
        maxConcurrent?: number;
    };
    processingMultiplier?: number; // Optional multiplier applied to processingSpeed
    // Optional consumption model for serverless
    freeRequests?: number; // free requests bucket per instance
    perRequestCost?: number; // cost after freeRequests exhausted
    perNodeUpkeep?: number; // Extra upkeep per node in the system (for monitoring)
}

export const SERVICE_CATALOG: ServiceDefinition[] = [
    {
        type: 'vm',
        label: 'Virtual Machine',
        cost: 100,
        upkeep: 5,
        description: 'Basic compute unit. Fixed capacity.',
        icon: '💻',
        baseStats: {
            processingSpeed: 8,
            maxQueueSize: 5, // Jitter buffer
            maxConcurrent: 2
        }
        ,
        processingMultiplier: 1.5
    },
    {
        type: 'app-service',
        label: 'App Service',
        cost: 200,
        upkeep: 8,
        description: 'Scalable web hosting. Handles more traffic.',
        icon: '📱',
        baseStats: {
            processingSpeed: 25,
            maxQueueSize: 10, // Scalable buffer
            maxConcurrent: 5
        }
        ,
        processingMultiplier: 2
    },
    {
        type: 'function-app',
        label: 'Function App',
        cost: 50,
        upkeep: 0, // Pay per execution (implemented in logic)
        description: 'Serverless. Cheap idle, expensive under load.',
        icon: '⚡'
        ,
        baseStats: {
            processingSpeed: 2, // Nerfed from 6 to 3 to 2
            maxQueueSize: 5, // Event buffer
            maxConcurrent: 2
        },
        processingMultiplier: 1.2,
        freeRequests: 1000,
        perRequestCost: 0.005
    },
    {
        type: 'sql-db',
        label: 'Azure SQL (Basic)',
        cost: 300,
        upkeep: 15,
        description: 'Standard relational database. Good for basic workloads.',
        icon: '🗄️',
        baseStats: {
            processingSpeed: 5,
            maxQueueSize: 10,
            maxConcurrent: 2
        },
        processingMultiplier: 1.5
    },
    {
        type: 'sql-db-premium',
        label: 'Azure SQL (Premium)',
        cost: 600,
        upkeep: 40,
        description: 'High-perf database. 2x speed & concurrency.',
        icon: '🚀',
        baseStats: {
            processingSpeed: 10, // 2x Basic
            maxQueueSize: 20,    // 2x Basic
            maxConcurrent: 4     // 2x Basic
        },
        processingMultiplier: 1.5
    },
    {
        type: 'cosmos-db',
        label: 'Azure Cosmos DB',
        cost: 1200,
        upkeep: 100,
        description: 'Global NoSQL database. Zero latency across regions.',
        icon: '🪐',
        baseStats: {
            processingSpeed: 20, // 2x Premium (10 -> 20)
            maxQueueSize: 50,    // > 2x Premium (20 -> 50)
            maxConcurrent: 10    // > 2x Premium (4 -> 10)
        },
        processingMultiplier: 1.5 // Match SQL multiplier for consistent math
    },
    {
        type: 'traffic-manager',
        label: 'Traffic Manager',
        cost: 50,
        upkeep: 2,
        description: 'Routes traffic to regions. Zero latency.',
        icon: '🌐',
        baseStats: {
            processingSpeed: 100,
            maxQueueSize: 20
        }
        ,
        processingMultiplier: 1
    },
    {
        type: 'load-balancer',
        label: 'Load Balancer',
        cost: 150,
        upkeep: 10,
        description: 'Distributes traffic to backend pools.',
        icon: '⚖️',
        baseStats: {
            processingSpeed: 50,
            maxQueueSize: 20
        }
        ,
        processingMultiplier: 1
    },
    {
        type: 'firewall',
        label: 'Firewall',
        description: 'Basic protection. Filters attacks.',
        cost: 100,
        upkeep: 5,
        icon: '🛡️',
        baseStats: {
            processingSpeed: 20, // Moderate speed
            maxQueueSize: 5, // Small buffer for jitter
            maxConcurrent: 1
        }
        ,
        processingMultiplier: 1
    },
    {
        type: 'waf',
        label: 'WAF',
        description: 'Elite protection. High throughput.',
        cost: 400,
        upkeep: 20,
        icon: '🏰',
        baseStats: {
            processingSpeed: 50, // Very fast
            maxQueueSize: 10,
            maxConcurrent: 5
        }
        ,
        processingMultiplier: 1
    },
    {
        type: 'storage-queue',
        label: 'Storage Queue',
        cost: 30,
        upkeep: 2,
        description: 'Buffers traffic to prevent drops. Supports backpressure.',
        icon: '📥',
        baseStats: {
            processingSpeed: 100, // Very fast "pipe"
            maxQueueSize: 50,
            maxConcurrent: 5
        }
    },
    {
        type: 'redis',
        label: 'Azure Cache for Redis',
        cost: 150,
        upkeep: 15,
        description: 'In-memory cache. 35% chance to skip DB query.',
        icon: '🚀',
        baseStats: {
            processingSpeed: 100,
            maxQueueSize: 0,
            maxConcurrent: 50
        }
    },
    {
        type: 'blob-storage',
        label: 'Blob Storage',
        cost: 100,
        upkeep: 5,
        description: 'For unstructured data. Parallel I/O.',
        icon: '🗃️',
        baseStats: {
            processingSpeed: 20,
            maxQueueSize: 20,
            maxConcurrent: 10
        }
    },
    {
        type: 'azure-monitor',
        label: 'Azure Monitor',
        cost: 500,
        upkeep: 20,
        perNodeUpkeep: 0.5,
        description: 'Unlocks visibility (utilization, queues). Critical for debugging.',
        icon: '📊',
        baseStats: {
            processingSpeed: 0,
            maxQueueSize: 0,
            maxConcurrent: 0
        }
    }
];
