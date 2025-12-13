import { GameNode, GameEdge, Packet } from './src/engine/types';

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => 1;

// VERIFICATION SCENARIO: Utilization Comparison
// LB (Smart) -> VM-Idle (Queue: 0, Util: 0.1)
//            -> VM-Busy (Queue: 0, Util: 0.9)
// Both have 10 MaxQueue. Free Slots = 10.
// Expected Weights:
// Idle: 10 * (1.1 - 0.1) = 10 * 1.0 = 10
// Busy: 10 * (1.1 - 0.9) = 10 * 0.2 = 2
// Ratio: 5:1 traffic preference for Idle.

const nodes: Record<string, GameNode> = {
    'lb-1': {
        id: 'lb-1',
        type: 'load-balancer',
        position: { x: 0, y: 0 },
        label: 'LB',
        queue: [],
        maxQueueSize: 0,
        upgrades: ['smart-routing']
    },
    'vm-idle': {
        id: 'vm-idle',
        type: 'vm',
        position: { x: 100, y: 0 },
        label: 'VM Idle',
        queue: [],
        maxQueueSize: 10,
        utilization: 0.1
    },
    'vm-busy': {
        id: 'vm-busy',
        type: 'vm',
        position: { x: 100, y: 50 },
        label: 'VM Busy',
        queue: [],
        maxQueueSize: 10,
        utilization: 0.9
    }
};

const edges: Record<string, GameEdge> = {
    'e1': { id: 'e1', source: 'lb-1', target: 'vm-idle' },
    'e2': { id: 'e2', source: 'lb-1', target: 'vm-busy' }
};

const nodeUpdates: Record<string, GameNode> = {
    'vm-idle': { ...nodes['vm-idle'] },
    'vm-busy': { ...nodes['vm-busy'] }
};

function routePacket() {
    const node = nodes['lb-1'];
    const validTargets = Object.values(edges).filter(e => e.source === node.id).map(e => ({ ...e, reversed: false }));
    let targetEdge;

    if (node.upgrades?.includes('smart-routing')) {
        const candidates = validTargets.map(edge => {
            const t = nodes[edge.target];
            const pendingUpdate = nodeUpdates[t.id];
            const currentQueueLen = pendingUpdate ? pendingUpdate.queue.length : t.queue.length;
            const utilization = t.utilization || 0;

            const freeSlots = Math.max(0, t.maxQueueSize - currentQueueLen);
            // MATCHING GAMELOOP LOGIC
            const cpuFactor = Math.max(0.1, 1.1 - utilization);
            const weight = freeSlots * cpuFactor + 0.1;

            return { edge, weight };
        });

        const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
        if (totalWeight > 0) {
            let random = Math.random() * totalWeight;
            for (const candidate of candidates) {
                random -= candidate.weight;
                if (random <= 0) {
                    targetEdge = candidate.edge;
                    break;
                }
            }
        }
        if (!targetEdge) targetEdge = validTargets[0];
    } else {
        targetEdge = validTargets[0];
    }
    return targetEdge.target;
}

const iterations = 10000;
const counts = { 'vm-idle': 0, 'vm-busy': 0 };

for (let i = 0; i < iterations; i++) {
    const targetId = routePacket();
    counts[targetId]++;
}

console.log(`Results after ${iterations} iterations:`);
console.log(`VM Idle (Util 0.1): ${counts['vm-idle']} (${(counts['vm-idle'] / iterations * 100).toFixed(1)}%)`);
console.log(`VM Busy (Util 0.9): ${counts['vm-busy']} (${(counts['vm-busy'] / iterations * 100).toFixed(1)}%)`);

// Check if Idle got roughly 5x more traffic (ratio 5:1 implies ~83% vs ~17%)
if (counts['vm-idle'] > counts['vm-busy'] * 3) {
    console.log("SUCCESS: Idle VM received significantly more traffic.");
} else {
    console.log("FAIL: Utilization did not impact routing enough.");
}
