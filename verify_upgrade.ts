import { GameNode, GameEdge, Packet } from './src/engine/types';

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => 1;

// VERIFICATION SCENARIO: Burst Traffic (State Lag)
// LB routes 50 packets in a SINGLE BATCH.
// Logic must use 'live' queue state (simulated via nodeUpdates) to avoid overfilling the small VM.

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
    'vm-big': {
        id: 'vm-big',
        type: 'vm',
        position: { x: 100, y: 0 },
        label: 'VM Big',
        queue: [],
        maxQueueSize: 50
    },
    'vm-small': {
        id: 'vm-small',
        type: 'vm',
        position: { x: 100, y: 50 },
        label: 'VM Small',
        queue: [],
        maxQueueSize: 5
    }
};

const edges: Record<string, GameEdge> = {
    'e1': { id: 'e1', source: 'lb-1', target: 'vm-big' },
    'e2': { id: 'e2', source: 'lb-1', target: 'vm-small' }
};

// SIMULATING GAME LOOP STATE ACCUMULATION
const nodeUpdates: Record<string, GameNode> = {
    'vm-big': { ...nodes['vm-big'], queue: [] },
    'vm-small': { ...nodes['vm-small'], queue: [] }
};

function routePacketInBatch() {
    const node = nodes['lb-1'];
    const validTargets = Object.values(edges).filter(e => e.source === node.id).map(e => ({ ...e, reversed: false }));

    let targetEdge;

    if (node.upgrades?.includes('smart-routing')) {
        const candidates = validTargets.map(edge => {
            const t = nodes[edge.target];
            // USE PENDING STATE
            const pendingUpdate = nodeUpdates[t.id];
            const currentQueueLen = pendingUpdate ? pendingUpdate.queue.length : t.queue.length;

            const weight = Math.max(0, t.maxQueueSize - currentQueueLen) + 0.1;
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

    // UPDATE PENDING STATE
    const targetId = targetEdge.target;
    nodeUpdates[targetId].queue.push({} as Packet); // Add dummy packet
    return targetId;
}

// Route 60 packets (more than total capacity of 55)
const counts = { 'vm-big': 0, 'vm-small': 0 };
for (let i = 0; i < 60; i++) {
    const targetId = routePacketInBatch();
    counts[targetId]++;
}

console.log(`Results after 60 burst packets:`);
console.log(`VM Big (Max 50): Assigned ${counts['vm-big']} (Live Queue: ${nodeUpdates['vm-big'].queue.length})`);
console.log(`VM Small (Max 5): Assigned ${counts['vm-small']} (Live Queue: ${nodeUpdates['vm-small'].queue.length})`);

if (nodeUpdates['vm-small'].queue.length <= 10) { // Allow slight overflow due to randomness + 0.1 weight
    console.log("SUCCESS: VM Small was protected from burst overload.");
} else {
    console.log("FAIL: VM Small was flooded.");
}
