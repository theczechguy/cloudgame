import { useGameStore } from './src/store/gameStore';
import { GameNode, GameEdge } from './src/engine/types';

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => 1;

// REPRO SCENARIO:
// Compute -> LB -> SQL-DB
// We want to verify that if we have a 'db-query' packet at Compute, 
// and the ONLY path is through LB, that LB is considered a valid target.

const nodes: Record<string, GameNode> = {
    'func-1': { id: 'func-1', type: 'function-app', position: { x: 0, y: 0 }, label: 'Func', queue: [], maxQueueSize: 10 },
    'lb-1': { id: 'lb-1', type: 'load-balancer', position: { x: 100, y: 0 }, label: 'LB', queue: [], maxQueueSize: 0 },
    'db-1': { id: 'db-1', type: 'sql-db', position: { x: 200, y: 0 }, label: 'DB', queue: [], maxQueueSize: 10 }
};

const edges: Record<string, GameEdge> = {
    'e1': { id: 'e1', source: 'func-1', target: 'lb-1' },
    'e2': { id: 'e2', source: 'lb-1', target: 'db-1' }
};

// Logic extracted from GameLoop.ts (post-fix)
function testDBRouting() {
    const nextType = 'db-query'; // The packet has transformed from http-db to db-query
    const node = nodes['func-1']; // We are at the source node

    console.log(`Testing Routing for node: ${node.type} with packet type: ${nextType}`);

    const outgoing = Object.values(edges).filter(e => e.source === node.id).map(e => ({ ...e, reversed: false }));

    // We expect e1 (target: lb-1) to be valid
    const validTargets = outgoing.filter(edge => {
        const target = nodes[edge.target];
        if (!target) return false;

        // The logic we fixed:
        if (nextType === 'db-query') {
            const allowed = ['sql-db', 'sql-db-premium', 'cosmos-db', 'storage-queue', 'redis', 'load-balancer', 'traffic-manager'].includes(target.type);
            console.log(`Checking target ${target.type} (${target.id}): ${allowed}`);
            return allowed;
        }
        return false;
    });

    console.log("Valid Targets:", validTargets.map(e => e.target));
    return validTargets.map(e => nodes[e.target].type);
}

const results = testDBRouting();
if (results.includes('load-balancer')) {
    console.log("SUCCESS: Load Balancer is a valid target for DB Query.");
} else {
    console.log("FAIL: Load Balancer rejected.", results);
}
