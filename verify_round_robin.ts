import { GameNode, GameEdge, Packet } from './src/engine/types';

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => 1;

// VERIFICATION SCENARIO: Round Robin (Default LB)
// LB -> A
// LB -> B
// Send 100 packets.
// Expected: A=50, B=50. Exactly.

const nodes: Record<string, GameNode> = {
    'lb-1': {
        id: 'lb-1',
        type: 'load-balancer',
        position: { x: 0, y: 0 },
        label: 'LB',
        queue: [],
        maxQueueSize: 0,
        // NO UPGRADES -> Default Round Robin
        roundRobinIndex: 0
    },
    'node-a': { id: 'node-a', type: 'vm', position: { x: 0, y: 0 }, label: 'A', queue: [], maxQueueSize: 10 },
    'node-b': { id: 'node-b', type: 'vm', position: { x: 0, y: 0 }, label: 'B', queue: [], maxQueueSize: 10 }
};

const edges: Record<string, GameEdge> = {
    'e1': { id: 'e1', source: 'lb-1', target: 'node-a' },
    'e2': { id: 'e2', source: 'lb-1', target: 'node-b' }
};

const nodeUpdates: Record<string, GameNode> = {
    'lb-1': { ...nodes['lb-1'] }
};

function routePacket() {
    const node = nodes['lb-1'];
    const validTargets = Object.values(edges).filter(e => e.source === node.id).map(e => ({ ...e, reversed: false }));
    let targetEdge;

    // --- GAME LOOP LOGIC COPY (Round Robin) ---
    // Default Behavior: Round Robin
    if (validTargets.length > 0) {
        validTargets.sort((a, b) => a.id.localeCompare(b.id)); // e1, e2

        const pendingUpdate = nodeUpdates[node.id];
        let rrIndex = pendingUpdate?.roundRobinIndex ?? node.roundRobinIndex ?? 0;

        targetEdge = validTargets[rrIndex % validTargets.length];

        rrIndex++;
        if (!nodeUpdates[node.id]) nodeUpdates[node.id] = { ...node };
        nodeUpdates[node.id].roundRobinIndex = rrIndex;
    }
    // ------------------------------------------

    return targetEdge.target;
}

const iterations = 100;
const counts = { 'node-a': 0, 'node-b': 0 };

for (let i = 0; i < iterations; i++) {
    const targetId = routePacket();
    counts[targetId]++;
}

console.log(`Results after ${iterations} iterations:`);
console.log(`Node A: ${counts['node-a']}`);
console.log(`Node B: ${counts['node-b']}`);

if (counts['node-a'] === 50 && counts['node-b'] === 50) {
    console.log("SUCCESS: Perfect Round Robin distribution.");
} else {
    console.log("FAIL: Distribution uneven.");
}
