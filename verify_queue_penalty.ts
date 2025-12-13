import { GameNode, GameEdge, Packet } from './src/engine/types';

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => 1;

// VERIFICATION SCENARIO: Queue Penalty Threshold (10%)
// VM-TenPerc: Max 50, Queue 5 (10%). Free: 45. Util: 0.
// VM-Zero:    Max 50, Queue 0 (0%).  Free: 50. Util: 0.

// Logic:
// VM-TenPerc: Free 45. QueueRatio 0.1 (>=0.1). Penalty 0.5.
//             Weight = 45 * 1.0 * 0.5 = 22.5
// VM-Zero:    Free 50. QueueRatio 0.0 (<0.1). Penalty 1.0.
//             Weight = 50 * 1.0 * 1.0 = 50.0

// Expected Ratio: 22.5 : 50 (~1 : 2.22)
// Expected Distribution: ~31% vs ~69%

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
    'vm-10perc': {
        id: 'vm-10perc',
        type: 'vm',
        position: { x: 100, y: 0 },
        label: 'VM 10%',
        queue: [{}, {}, {}, {}, {}] as Packet[], // 5 items
        maxQueueSize: 50,
        utilization: 0
    },
    'vm-zero': {
        id: 'vm-zero',
        type: 'vm',
        position: { x: 100, y: 50 },
        label: 'VM 0%',
        queue: [],
        maxQueueSize: 50,
        utilization: 0
    }
};

const edges: Record<string, GameEdge> = {
    'e1': { id: 'e1', source: 'lb-1', target: 'vm-10perc' },
    'e2': { id: 'e2', source: 'lb-1', target: 'vm-zero' }
};

// State sync
const nodeUpdates: Record<string, GameNode> = {
    'vm-10perc': { ...nodes['vm-10perc'] },
    'vm-zero': { ...nodes['vm-zero'] }
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

            // PENALTY LOGIC
            const queueRatio = t.maxQueueSize > 0 ? currentQueueLen / t.maxQueueSize : 0;
            const queuePenalty = queueRatio >= 0.1 ? 0.5 : 1.0;

            const weight = (freeSlots * cpuFactor * queuePenalty) + 0.1;

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
const counts = { 'vm-10perc': 0, 'vm-zero': 0 };

for (let i = 0; i < iterations; i++) {
    const targetId = routePacket();
    counts[targetId]++;
}

console.log(`Results after ${iterations} iterations:`);
console.log(`VM 10% Full: ${counts['vm-10perc']} (${(counts['vm-10perc'] / iterations * 100).toFixed(1)}%)`);
console.log(`VM 0% Full:  ${counts['vm-zero']} (${(counts['vm-zero'] / iterations * 100).toFixed(1)}%)`);

// Check logic: VM Zero should have roughly 2.2x traffic of VM 10%
const ratio = counts['vm-zero'] / counts['vm-10perc'];
console.log(`Ratio Zero/Ten: ${ratio.toFixed(2)} (Expected ~2.2)`);

if (ratio > 2.0) {
    console.log("SUCCESS: 10% threshold penalty applied successfully.");
} else {
    console.log("FAIL: Distribution too even, penalty likely not applied.");
}
