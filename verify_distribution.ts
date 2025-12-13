import { GameNode, GameEdge, Packet } from './src/engine/types';

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => 1;

// VERIFICATION SCENARIO: Dampened Distribution (Fairness)
// VM-Big:  50 Free Slots.
// VM-Small: 5 Free Slots.
// Util: 0. QueuePenalty: 1.0 (Both empty).

// OLD FORMULA (Linear): 50 vs 5 -> 10:1 Ratio. (Big ~91%, Small ~9%)
// NEW FORMULA (Sqrt + 2.0 Base): 
// Big:   sqrt(50) + 2 = 7.07 + 2 = 9.07
// Small: sqrt(5) + 2  = 2.23 + 2 = 4.23
// Ratio: 9.07 / 4.23 = ~2.14 : 1
// Expected: Big ~68%, Small ~32%

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
        maxQueueSize: 50,
        utilization: 0
    },
    'vm-small': {
        id: 'vm-small',
        type: 'vm',
        position: { x: 100, y: 50 },
        label: 'VM Small',
        queue: [],
        maxQueueSize: 5,
        utilization: 0
    }
};

const edges: Record<string, GameEdge> = {
    'e1': { id: 'e1', source: 'lb-1', target: 'vm-big' },
    'e2': { id: 'e2', source: 'lb-1', target: 'vm-small' }
};

// State sync
const nodeUpdates: Record<string, GameNode> = {
    'vm-big': { ...nodes['vm-big'] },
    'vm-small': { ...nodes['vm-small'] }
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
            const cpuFactor = Math.max(0.1, 1.1 - utilization);
            const queueRatio = t.maxQueueSize > 0 ? currentQueueLen / t.maxQueueSize : 0;
            const queuePenalty = queueRatio >= 0.1 ? 0.5 : 1.0;

            // NEW FORMULA
            const weight = (Math.sqrt(freeSlots) * cpuFactor * queuePenalty) + 2.0;

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
const counts = { 'vm-big': 0, 'vm-small': 0 };

for (let i = 0; i < iterations; i++) {
    const targetId = routePacket();
    counts[targetId]++;
}

console.log(`Results after ${iterations} iterations:`);
console.log(`VM Big (50 slots): ${counts['vm-big']} (${(counts['vm-big'] / iterations * 100).toFixed(1)}%)`);
console.log(`VM Small (5 slots): ${counts['vm-small']} (${(counts['vm-small'] / iterations * 100).toFixed(1)}%)`);

// Expected: Ratio < 3.0 (Significantly dampened from 10.0)
const ratio = counts['vm-big'] / counts['vm-small'];
console.log(`Ratio Big/Small: ${ratio.toFixed(2)} (Expected ~2.1-2.2)`);

if (ratio < 3.0 && ratio > 1.5) {
    console.log("SUCCESS: Distribution is dampened and fairer.");
} else {
    console.log("FAIL: Distribution still too skewed.");
}
