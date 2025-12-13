import { GameNode, GameEdge, Packet } from './src/engine/types';

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => 1;

// VERIFICATION SCENARIO: Processing Power Aware
// VM-Big:   Speed 8, Max 50. Empty.
// Func-Small: Speed 2, Max 5.  Empty.

// OLD (Dampened Only): ~2.1x Traffic to VM.
// NEW (Speed Aware): 
// VM:   8 * sqrt(50) + 2 = 8 * 7.07 + 2 = 58.56
// Func: 2 * sqrt(5)  + 2 = 2 * 2.23 + 2 = 6.46
// Ratio: ~9.06 : 1
// Result: VM takes ~90% of traffic, Func takes ~10%.
// This matches the 4x speed difference + queue capacity difference.

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
        utilization: 0,
        processingSpeed: 8
    },
    'func-small': {
        id: 'func-small',
        type: 'function-app',
        position: { x: 100, y: 50 },
        label: 'Func Small',
        queue: [],
        maxQueueSize: 5,
        utilization: 0,
        processingSpeed: 2
    }
};

const edges: Record<string, GameEdge> = {
    'e1': { id: 'e1', source: 'lb-1', target: 'vm-big' },
    'e2': { id: 'e2', source: 'lb-1', target: 'func-small' }
};

// State sync
const nodeUpdates: Record<string, GameNode> = {
    'vm-big': { ...nodes['vm-big'] },
    'func-small': { ...nodes['func-small'] }
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
            const speed = t.processingSpeed || 1;

            // NEW FORMULA
            const weight = (speed * Math.sqrt(freeSlots) * cpuFactor * queuePenalty) + 2.0;

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
const counts = { 'vm-big': 0, 'func-small': 0 };

for (let i = 0; i < iterations; i++) {
    const targetId = routePacket();
    counts[targetId]++;
}

console.log(`Results after ${iterations} iterations:`);
console.log(`VM Big (Speed 8): ${counts['vm-big']} (${(counts['vm-big'] / iterations * 100).toFixed(1)}%)`);
console.log(`Func Small (Speed 2): ${counts['func-small']} (${(counts['func-small'] / iterations * 100).toFixed(1)}%)`);

const ratio = counts['vm-big'] / counts['func-small'];
console.log(`Ratio Big/Small: ${ratio.toFixed(2)} (Expected ~9.0)`);

if (ratio > 7.0) {
    console.log("SUCCESS: Processing Speed successfully skewed traffic heavy to VM.");
} else {
    console.log("FAIL: Processing Speed logic ineffective.");
}
