import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { SERVICE_CATALOG } from '../services/catalog';
import type { Packet, GameNode, PacketType } from './types';

const PACKET_SPEED = 0.5; // Progress per second

export const useGameLoop = () => {
    const requestRef = useRef<number | undefined>(undefined);
    const previousTimeRef = useRef<number | undefined>(undefined);
    const lastSpawnTimeRef = useRef<number>(0);

    const updateMoney = useGameStore((state) => state.updateMoney);

    // Failed request penalty tracking
    const penalizedRequestsRef = useRef<Record<string, number>>({});
    const FAILED_REQUEST_PENALTY = 10; // dollars per failed logical request
    const PENALTY_WINDOW = 10000; // ms during which the same request is not double-penalized

    // Upkeep Timer
    const lastUpkeepTimeRef = useRef<number>(0);
    const UPKEEP_INTERVAL = 1000; // 1 second

    const animate = (time: number) => {
        if (previousTimeRef.current !== undefined) {
            const deltaTime = (time - previousTimeRef.current) / 1000; // Seconds

            // FPS Calculation (simple)
            const fps = Math.round(1 / deltaTime);
            if (time % 10 < deltaTime) useGameStore.getState().setFps(fps);

            const { nodes, edges, packets, regions, isPaused } = useGameStore.getState();

            if (isPaused) {
                previousTimeRef.current = time;
                requestRef.current = requestAnimationFrame(animate);
                return;
            }

            const penalizeIfNeeded = (packetId: string, packetType: PacketType, nodeId?: string, pos?: { x: number, y: number }) => {
                // Only penalize customer-facing flows (exclude attacks)
                const customerTypes: PacketType[] = ['http-compute', 'http-db', 'http-storage', 'db-query', 'db-result', 'http-response', 'storage-op', 'storage-result'];
                if (!customerTypes.includes(packetType)) return;

                const rootId = packetId.split('-hop')[0];
                const now = Date.now();
                const last = penalizedRequestsRef.current[rootId] || 0;
                if (now - last > PENALTY_WINDOW) {
                    penalizedRequestsRef.current[rootId] = now;
                    updateMoney(-FAILED_REQUEST_PENALTY);
                    // Emit drop event for visuals
                    useGameStore.getState().addDrop({ nodeId, x: pos?.x, y: pos?.y });
                }
            };

            // --- SIMULATION STEP ---

            // 0. Upkeep (Recurring Cost) — use SERVICE_CATALOG upkeep values when available
            if (time - lastUpkeepTimeRef.current > UPKEEP_INTERVAL) {
                let totalUpkeep = 0;
                let hasMonitor = false;

                Object.values(nodes).forEach(node => {
                    const def = SERVICE_CATALOG.find(s => s.type === node.type);
                    if (def && typeof def.upkeep === 'number') {
                        totalUpkeep += def.upkeep;
                    }
                    if (node.type === 'azure-monitor') hasMonitor = true;
                });

                // Base upkeep
                totalUpkeep += 20;

                // Region Upkeep
                // Each region costs extra (Infrastructure)
                const regionCount = Object.keys(regions).length;
                totalUpkeep += regionCount * 50;

                if (totalUpkeep > 0) updateMoney(-totalUpkeep);
                lastUpkeepTimeRef.current = time;

                // Monitor Visibility Check
                const wasMonitored = useGameStore.getState().isMonitored;
                if (wasMonitored !== hasMonitor) {
                    useGameStore.setState({ isMonitored: hasMonitor });
                }
            }

            // 1. Move Packets
            const nextPackets: Packet[] = [];
            const packetsToRemove: Set<string> = new Set();
            const nodeUpdates: Record<string, GameNode> = {};

            const getNode = (id: string) => nodeUpdates[id] || nodes[id];

            packets.forEach(p => {
                // TELEMETRY MOVEMENT (Direct Flight)
                if (p.type === 'log-entry' && p.targetNodeId && p.routeStack[0]) {
                    const sourceNode = nodes[p.routeStack[0]];
                    const targetNode = nodes[p.targetNodeId];
                    if (sourceNode && targetNode) {
                        const dx = targetNode.position.x - sourceNode.position.x;
                        const dy = targetNode.position.y - sourceNode.position.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        // Move fixed distance
                        const travel = p.speed * deltaTime;
                        p.progress += travel / dist;

                        if (p.progress >= 1.0) {
                            packetsToRemove.add(p.id); // Consumed
                        } else {
                            nextPackets.push(p);
                        }
                    } else {
                        packetsToRemove.add(p.id); // Invalid path
                    }
                    return; // Skip standard edge logic
                }

                const edge = edges[p.edgeId];
                if (!edge) {
                    // No route — treat as dropped
                    penalizeIfNeeded(p.id, p.type);
                    packetsToRemove.add(p.id);
                    return;
                }

                // LATENCY CALCULATION
                // Check if crossing regions
                let speedMultiplier = 1.0;
                const source = nodes[edge.source];
                const target = nodes[edge.target];

                if (source && target && source.regionId && target.regionId && source.regionId !== target.regionId) {
                    // Cross-Region Traffic is SLOW
                    // 0.25 = 4x latency penalty
                    speedMultiplier = 0.25;
                }

                p.progress += p.speed * speedMultiplier * deltaTime;

                if (p.progress >= 1.0) {
                    // Packet reached destination
                    const targetId = p.reversed ? edge.source : edge.target;
                    const targetNode = getNode(targetId);

                    if (targetNode) {
                        // SPECIAL: Internet Receiving Response = $$$ (award even if internet queue is 0)
                        if (targetNode.type === 'internet' && p.type === 'http-response') {
                            // Check for SLA Violation
                            const isViolated = p.slaViolated;
                            const reward = isViolated ? 25 : 50; // 50% penalty
                            updateMoney(reward);

                            if (isViolated) {
                                // Maybe add a small visual drop or alert?
                                // console.log("SLA Violation! Reduced income.");
                            }
                        } else {
                            // Logic: Can we accept this packet?
                            // Capacity = Buffer (Queue Size) + Available Processing Slots
                            // We check the *current* state (including updates this frame)

                            const def = SERVICE_CATALOG.find(s => s.type === targetNode.type);
                            // Re-calculate maxConcurrent (same logic as Step 2)
                            const baseSpeed = (typeof targetNode.processingSpeed === 'number' && targetNode.processingSpeed > 0)
                                ? targetNode.processingSpeed
                                : (def?.baseStats?.processingSpeed ?? 1);
                            const maxConcurrent = def?.baseStats?.maxConcurrent ?? Math.max(1, Math.floor(baseSpeed));

                            // Current Counts
                            const currentQueueLen = targetNode.queue.length;
                            const currentActiveCount = (targetNode.activeTasks || []).length;

                            // "Virtual" capacity: We can queue items BEYOND maxQueueSize *only if* they will inevitably move to activeTasks this tick
                            // i.e. we accept if we have room in queue OR room in processor
                            const availableProcessingSlots = Math.max(0, maxConcurrent - currentActiveCount);
                            // However, we must account for packets already in queue that are waiting for those slots
                            // If queue has 5 items and we have 1 slot, that slot is already "claimed" by the first queue item.
                            // So effectively, we only have space if queue < maxQueueSize.
                            // BUT if maxQueueSize is 0, we can accept IF queue is empty AND slots open.

                            if (currentQueueLen < (targetNode.maxQueueSize + availableProcessingSlots)) {
                                if (!nodeUpdates[targetId]) nodeUpdates[targetId] = { ...targetNode, queue: [...targetNode.queue], activeTasks: targetNode.activeTasks ? [...targetNode.activeTasks] : [] };
                                nodeUpdates[targetId].queue.push(p);
                            } else {
                                // Drop packet (Queue Full) — penalize customer request if applicable
                                penalizeIfNeeded(p.id, p.type, targetId, targetNode?.position);

                                // Record Drop Stat
                                if (!nodeUpdates[targetId]) nodeUpdates[targetId] = { ...targetNode, queue: [...targetNode.queue], activeTasks: targetNode.activeTasks ? [...targetNode.activeTasks] : [] };
                                const drops = nodeUpdates[targetId].droppedPackets || {};
                                nodeUpdates[targetId].droppedPackets = {
                                    ...drops,
                                    [p.type]: (drops[p.type] || 0) + 1
                                };
                            }
                        }
                    }
                    packetsToRemove.add(p.id);
                } else {
                    nextPackets.push(p);
                }
            });

            // 2. Process Queues (Compute) with concurrency / in-flight tasks
            const forwardedPackets: Packet[] = [];

            Object.keys(nodes).forEach(nodeId => {
                const node = getNode(nodeId);
                // Ensure nodeUpdates entry
                if (!nodeUpdates[nodeId]) nodeUpdates[nodeId] = { ...node, queue: [...node.queue], activeTasks: node.activeTasks ? [...node.activeTasks] : [] };
                const nup = nodeUpdates[nodeId];

                const def = SERVICE_CATALOG.find(s => s.type === node.type);
                const baseSpeed = (typeof node.processingSpeed === 'number' && node.processingSpeed > 0)
                    ? node.processingSpeed
                    : (def?.baseStats?.processingSpeed ?? 1);
                const multiplier = node.processingMultiplier ?? def?.processingMultiplier ?? 1;

                // Process completions
                const now = time;
                const completed: Array<{ packet: Packet }> = [];
                if (nup.activeTasks && nup.activeTasks.length > 0) {
                    const remainingTasks: typeof nup.activeTasks = [];
                    nup.activeTasks.forEach(t => {
                        if (t.completesAt <= now) {
                            completed.push({ packet: t.packet });
                        } else {
                            remainingTasks.push(t);
                        }
                    });
                    nup.activeTasks = remainingTasks;
                }

                // For each completed task, perform transformation and forward
                completed.forEach(c => {
                    const packet = c.packet;

                    // MARK VIOLATION IF COMPUTING IN WRONG REGION
                    const isCompute = ['vm', 'app-service', 'function-app'].includes(node.type);
                    if (isCompute && packet.originRegion && node.regionId) {
                        const region = regions[node.regionId];
                        // If region has a configured Geo ID and it doesn't match packet origin
                        if (region && region.geoId && region.geoId !== packet.originRegion) {
                            packet.slaViolated = true;
                        }
                    }

                    const outgoing = Object.values(edges).filter(e => e.source === nodeId).map(e => ({ ...e, reversed: false }));
                    const incoming = Object.values(edges).filter(e => e.target === nodeId).map(e => ({ ...e, reversed: true, source: e.target, target: e.source }));
                    const allEdges = [...outgoing, ...incoming];

                    // TRANSFORMATION LOGIC (on completion)
                    let nextType: PacketType = packet.type;
                    const isDB = node.type === 'sql-db';
                    const isRedis = node.type === 'redis';
                    const isBlob = node.type === 'blob-storage';
                    const isFirewall = node.type === 'firewall' || node.type === 'waf';

                    if (isFirewall && packet.type === 'http-response') {
                        // console.log(`[FW-Debug] Node ${nodeId} processing response. Stack:`, packet.routeStack); // Removed debug
                    }

                    // Security Blocking (Attack consumed processing and is now dropped)
                    if (isFirewall && packet.type === 'http-attack') {
                        return;
                    }

                    if (isCompute && (packet.type === 'http-compute' || packet.type === 'http-db' || packet.type === 'http-storage')) {
                        // Smart Routing Validation Logic
                        const connectedTypes = outgoing.map(e => nodes[e.target]?.type);
                        // FIX: Allow LB/TM as gateways to downstream resources
                        const isGateway = connectedTypes.includes('load-balancer') || connectedTypes.includes('traffic-manager');

                        const canDoDB = isGateway || connectedTypes.includes('sql-db') || connectedTypes.includes('redis');
                        const canDoBlob = isGateway || connectedTypes.includes('blob-storage');

                        // FAIL HARD if resources missing for specific intent
                        if (packet.type === 'http-db' && !canDoDB) {
                            penalizeIfNeeded(packet.id, packet.type, nodeId, node.position);

                            // Record Drop Stat (Missing Resource)
                            if (!nodeUpdates[nodeId]) nodeUpdates[nodeId] = { ...node, queue: [...node.queue], activeTasks: node.activeTasks ? [...node.activeTasks] : [] };
                            const drops = nodeUpdates[nodeId].droppedPackets || {};
                            nodeUpdates[nodeId].droppedPackets = { ...drops, [packet.type]: (drops[packet.type] || 0) + 1 };

                            return; // Drop
                        }
                        if (packet.type === 'http-storage' && !canDoBlob) {
                            penalizeIfNeeded(packet.id, packet.type, nodeId, node.position);

                            // Record Drop Stat (Missing Resource)
                            if (!nodeUpdates[nodeId]) nodeUpdates[nodeId] = { ...node, queue: [...node.queue], activeTasks: node.activeTasks ? [...node.activeTasks] : [] };
                            const drops = nodeUpdates[nodeId].droppedPackets || {};
                            nodeUpdates[nodeId].droppedPackets = { ...drops, [packet.type]: (drops[packet.type] || 0) + 1 };

                            return; // Drop
                        }

                        if (packet.type === 'http-compute') {
                            nextType = 'http-response';
                        } else if (packet.type === 'http-db') {
                            nextType = 'db-query';
                        } else if (packet.type === 'http-storage') {
                            nextType = 'storage-op';
                        }
                    } else if (isDB && packet.type === 'db-query') {
                        nextType = 'db-result';
                    } else if (isBlob && packet.type === 'storage-op') {
                        nextType = 'storage-result';
                    } else if (isCompute && (packet.type === 'db-result' || packet.type === 'storage-result')) {
                        nextType = 'http-response';
                    } else if (isRedis && packet.type === 'db-query') {
                        // Cache Check: 35% Hit Rate
                        if (Math.random() < 0.35) {
                            nextType = 'db-result'; // HIT: Short-circuit, return result
                            useGameStore.getState().addCacheHit(nodeId);
                        } else {
                            nextType = 'db-query'; // MISS: Continue to DB
                        }
                    }

                    const validTargets = allEdges.filter(edge => {
                        const target = getNode(edge.target);
                        if (!target) return false;

                        // Return-to-Sender: Pop stack for responses
                        if (['db-result', 'storage-result', 'http-response'].includes(nextType)) {
                            // Target MUST be the previous node in the stack
                            // Stack at this point: [..., Previous, Current]
                            // We want to go to Previous.
                            if (packet.routeStack && packet.routeStack.length >= 2) {
                                const intendedTargetId = packet.routeStack[packet.routeStack.length - 2];
                                if (edge.target === intendedTargetId) return true;
                                return false; // Invalid path
                            }
                            // Fallback if stack is corrupted/empty (should not happen): Allow valid types
                        }

                        // REQUESTS: Enforce Downstream Flow (No reversed edges)
                        if (!['http-response', 'db-result', 'storage-result'].includes(nextType) && edge.reversed) {
                            return false;
                        }

                        if (nextType === 'db-query') return ['sql-db', 'sql-db-premium', 'cosmos-db', 'storage-queue', 'redis', 'load-balancer', 'traffic-manager'].includes(target.type);
                        if (nextType === 'storage-op') return ['blob-storage', 'storage-queue', 'load-balancer', 'traffic-manager'].includes(target.type);

                        if (nextType === 'db-result' || nextType === 'storage-result') return ['vm', 'app-service', 'function-app', 'firewall', 'waf', 'storage-queue', 'load-balancer', 'traffic-manager'].includes(target.type);

                        if (nextType === 'http-response') return ['internet', 'traffic-manager', 'load-balancer', 'firewall', 'waf', 'storage-queue'].includes(target.type);
                        if (['http-compute', 'http-db', 'http-storage'].includes(nextType)) return ['vm', 'app-service', 'function-app', 'load-balancer', 'firewall', 'waf', 'storage-queue', 'traffic-manager'].includes(target.type);

                        return true;
                    });

                    if (validTargets.length > 0) {
                        let targetEdge: typeof validTargets[0] | undefined = undefined;

                        // REGION-AWARE ROUTING (Traffic Manager)
                        if (node.type === 'traffic-manager' && packet.originRegion) {
                            const geoTargets = validTargets.filter(e => {
                                const t = getNode(e.target);
                                if (!t || !t.regionId) return false;
                                const r = regions[t.regionId];
                                return r && r.geoId === packet.originRegion;
                            });

                            if (geoTargets.length > 0) {
                                targetEdge = geoTargets[Math.floor(Math.random() * geoTargets.length)];
                            }
                        }


                        // Local / Default Routing (Load Balancer or Fallback for TM)
                        // If multiple targets exist, prefer those in the SAME region as the current node (Performance Mode)
                        if (!targetEdge && ['traffic-manager', 'load-balancer'].includes(node.type) && validTargets.length > 1) {

                            // UPGRADE CHECK: Smart Routing (Weighted Availability)
                            if (node.upgrades?.includes('smart-routing')) {
                                // Calculate weights based on available capacity (Max Queue - Current Queue)
                                const candidates = validTargets.map(edge => {
                                    const t = getNode(edge.target);
                                    if (!t) return { edge, weight: 0 }; // Should not happen with validTargets
                                    // CRITICAL FIX: Check nodeUpdates for pending queue additions in this frame
                                    const pendingUpdate = nodeUpdates[t.id];
                                    const currentQueueLen = pendingUpdate ? pendingUpdate.queue.length : t.queue.length;
                                    const utilization = t.utilization || 0; // 0.0 to 1.0

                                    // Weight = Free Slots * (One minus Utilization).
                                    // (1.1 - util) ensures even 100% utilized nodes have a tiny non-zero weight (0.1) to avoid absolute starvation if queue exists.
                                    const freeSlots = Math.max(0, t.maxQueueSize - currentQueueLen);
                                    const cpuFactor = Math.max(0.1, 1.1 - utilization);

                                    // QUEUE PENALTY: If >10% full, penalize weight significantly
                                    const queueRatio = t.maxQueueSize > 0 ? currentQueueLen / t.maxQueueSize : 0;
                                    const queuePenalty = queueRatio >= 0.1 ? 0.5 : 1.0;

                                    // DAMPENING: Use Sqrt of free slots so huge nodes don't dominate completely (50 slots vs 5 slots -> 7 vs 2.2, not 10 vs 1)
                                    // OFFSET: +2.0 ensures even small nodes get a baseline "Participation Weight" so traffic is distributed more evenly.
                                    // SPEED: Multiply by processing speed. A VM (Speed 8) can handle 4x the load of a Func (Speed 2), so it should attract 4x the traffic.
                                    const speed = t.processingSpeed || 1;
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
                                // Fallback to first if sort failed (rare) or random fallback if totalWeight 0
                                if (!targetEdge) targetEdge = validTargets[0];
                            } else {
                                // Default Behavior: Round Robin (per User Request)
                                // Only applies to Load Balancers & Traffic Managers (if not geo-routed)
                                if (validTargets.length > 0) {
                                    // 1. Sort targets deterministically to ensure stable rotation
                                    // (Edge IDs are unique and stable)
                                    validTargets.sort((a, b) => a.id.localeCompare(b.id));

                                    // 2. Get current rotation index
                                    // Check pending update first, then current state
                                    const pendingUpdate = nodeUpdates[node.id];
                                    let rrIndex = pendingUpdate?.roundRobinIndex ?? node.roundRobinIndex ?? 0;

                                    // 3. Select Target
                                    targetEdge = validTargets[rrIndex % validTargets.length];

                                    // 4. Increment Index (and save to update)
                                    rrIndex++;
                                    if (!nodeUpdates[node.id]) nodeUpdates[node.id] = { ...node };
                                    nodeUpdates[node.id].roundRobinIndex = rrIndex;
                                }
                            }
                        }

                        // Final Fallback: Random Choice (should rarely be hit if above logic works)
                        if (!targetEdge) {
                            targetEdge = validTargets[Math.floor(Math.random() * validTargets.length)];
                        }


                        // BACKPRESSURE LOGIC (Storage Queue)
                        let blocked = false;
                        if (node.type === 'storage-queue') {
                            const targetNode = getNode(targetEdge.target);
                            if (targetNode) {
                                // Check if target can accept more work
                                const tDef = SERVICE_CATALOG.find(s => s.type === targetNode.type);
                                const tBaseSpeed = (typeof targetNode.processingSpeed === 'number' && targetNode.processingSpeed > 0)
                                    ? targetNode.processingSpeed
                                    : (tDef?.baseStats?.processingSpeed ?? 1);
                                const tMaxConcurrent = tDef?.baseStats?.maxConcurrent ?? Math.max(1, Math.floor(tBaseSpeed));

                                const tQueueLen = targetNode.queue.length; // Use current state (approx)
                                const tActive = (targetNode.activeTasks || []).length;

                                // Count packets we already decided to forward to this target in this very frame
                                // This prevents "Race Condition" where multiple queue items flood a single slot before update
                                const inflight = forwardedPackets.filter(p => {
                                    const e = edges[p.edgeId];
                                    // Note: p.edgeId matches targetEdge.id. targetEdge.target matches targetNode.id
                                    return e && e.target === targetNode.id;
                                }).length;

                                const tEffectiveActive = tActive + inflight;
                                const tCapacity = targetNode.maxQueueSize + Math.max(0, tMaxConcurrent - tEffectiveActive);

                                // If target is full, hold back
                                if (tQueueLen >= tCapacity) {
                                    blocked = true;
                                }
                            }
                        }

                        if (blocked) {
                            // Retry later (Head-of-line blocking or re-queue)
                            // We push it back to activeTasks with a short delay to check again
                            nup.activeTasks = nup.activeTasks || [];
                            nup.activeTasks.push({ completesAt: now + 200, packet });
                        } else {
                            // Stack Manipulation Logic
                            let newStack = [...(packet.routeStack || [])];

                            // If Moving Forward (Request phase)
                            // We are at 'nodeId' (Source). Moving to 'targetEdge.target' (Target).
                            // Append Target to stack.
                            // BUT: Ideally stack represents "Where I have been".
                            // If I am at Source, stack should end with Source.
                            // If I move to Target, new stack should end with Target.
                            // However, we handle the push *here* at the edge transition.

                            if (['http-response', 'db-result', 'storage-result'].includes(nextType)) {
                                // Moving Backward (Response phase)
                                // We are Popping.
                                // Current Stack: [..., Prev, Current]
                                // Transform to: [..., Prev]
                                newStack.pop();
                            } else {
                                // Moving Forward
                                newStack.push(targetEdge.target);
                            }

                            if (nodeId === 'fw-1' && nextType === 'http-response') {
                                // console.log(`[FW-Forward] FW forwarding response to ${targetEdge.target}. NewStack:`, newStack); // Removed debug
                            }

                            forwardedPackets.push({
                                ...packet,
                                id: `${packet.id.split('-hop')[0]}-hop-${Date.now()}-${Math.random()}`,
                                edgeId: targetEdge.id,
                                reversed: targetEdge.reversed,
                                type: nextType,
                                routeStack: newStack,
                                progress: 0
                            });
                        }
                    }
                });

                // Start new tasks up to concurrency limit
                const maxConcurrent = def?.baseStats?.maxConcurrent ?? Math.max(1, Math.floor(baseSpeed));
                nup.activeTasks = nup.activeTasks || [];
                let availableSlots = Math.max(0, maxConcurrent - nup.activeTasks.length);

                while (availableSlots > 0 && nup.queue.length > 0) {
                    const packet = nup.queue.shift();
                    if (!packet) break;



                    // For function-app, apply per-execution billing on start
                    if (node.type === 'function-app' && ['http-compute', 'http-db', 'http-storage'].includes(packet.type)) {
                        const fdef = SERVICE_CATALOG.find(s => s.type === 'function-app');
                        const freeLeft = nup.freeRequestsRemaining ?? fdef?.freeRequests ?? 0;
                        if (freeLeft > 0) {
                            nup.freeRequestsRemaining = freeLeft - 1;
                        } else if (fdef?.perRequestCost) {
                            updateMoney(-fdef.perRequestCost);
                        }
                    }

                    // Compute execution duration (ms)
                    let execMs = Math.max(20, Math.round(1000 / (baseSpeed * multiplier)));

                    // LATENCY PENALTY (Cross-Region Compute)
                    // If processing a request from a specific region, but this node is in a DIFFERENT Geo Region (or none)
                    // Also applies to Databases (unless Cosmos)
                    const isComputeOrDB = ['vm', 'app-service', 'function-app', 'sql-db', 'sql-db-premium', 'cosmos-db'].includes(node.type);
                    if (isComputeOrDB && packet.originRegion && node.regionId) {
                        const region = regions[node.regionId];
                        if (!region || !region.geoId || region.geoId !== packet.originRegion) {
                            // Penalty: 50% Slower
                            // EXCEPTION: Cosmos DB is Globally Distributed (No Penalty)
                            if (node.type !== 'cosmos-db') {
                                execMs = Math.round(execMs * 1.5);
                            }
                        }
                    }

                    nup.activeTasks.push({ completesAt: now + execMs, packet });
                    availableSlots--;
                }
                // Update utilization (0..1) based on active tasks vs concurrency
                const used = (nup.activeTasks || []).length;
                const maxC = def?.baseStats?.maxConcurrent ?? Math.max(1, Math.floor(baseSpeed));
                const targetUtil = Math.min(1, used / Math.max(1, maxC));
                const currentUtil = node.utilization || 0;
                nup.utilization = currentUtil + (targetUtil - currentUtil) * 0.1;
            });

            // 3. Spawn Packets
            const spawnedPackets: Packet[] = [];
            const spawnRate = useGameStore.getState().spawnRate;

            if (time - lastSpawnTimeRef.current > spawnRate) {
                Object.values(nodes).forEach(node => {
                    if (node.type === 'internet') {
                        const connectedEdges = Object.values(edges).filter(e => e.source === node.id);
                        connectedEdges.forEach(edge => {
                            // Attack Logic:
                            // 1. Default (Sandbox): Random 30% chance.
                            // 2. Story Mode (Active Types): Only if 'http-attack' is explicitly allowed.

                            const activeTypes = useGameStore.getState().activePacketTypes;
                            let isAttack = false;

                            if (activeTypes && activeTypes.length > 0) {
                                // Story Mode / Restricted
                                if (activeTypes.includes('http-attack')) {
                                    isAttack = Math.random() < 0.3;
                                }
                            } else {
                                // Sandbox / Open
                                isAttack = Math.random() < 0.3;
                            }

                            let candidateType: PacketType = 'http-compute';

                            if (activeTypes && activeTypes.length > 0) {
                                // Pick specific allowed type
                                const allowedForSpawn = activeTypes.filter(t => t !== 'http-attack'); // specific content types
                                if (allowedForSpawn.length > 0) {
                                    const typeStr = allowedForSpawn[Math.floor(Math.random() * allowedForSpawn.length)];
                                    candidateType = typeStr as PacketType;
                                }
                            } else {
                                // Default Mix
                                candidateType = Math.random() < 0.33 ? 'http-compute' :
                                    Math.random() < 0.5 ? 'http-db' : 'http-storage';
                            }

                            // Determine Origin
                            // If node has hardcoded origin, use it. Otherwise random.
                            const GEO_REGIONS = ['North America', 'Europe', 'Asia Pacific', 'South America'];
                            const origin = node.trafficOrigin || GEO_REGIONS[Math.floor(Math.random() * GEO_REGIONS.length)];

                            spawnedPackets.push({
                                id: `p-${Date.now()}-${Math.random()}`,
                                edgeId: edge.id,
                                progress: 0,
                                type: isAttack ? 'http-attack' : candidateType,
                                routeStack: [node.id, edge.target], // Include Source AND Target (First Hop)
                                speed: PACKET_SPEED,
                                originRegion: origin
                            });
                        });
                    }
                });
                lastSpawnTimeRef.current = time;
            }

            // 3b. Telemetry Spawning (Independent Loop)
            const isMonitored = useGameStore.getState().isMonitored;

            if (isMonitored && Math.random() < 0.05) {
                const monitorId = Object.keys(nodes).find(id => nodes[id].type === 'azure-monitor');
                if (monitorId) {
                    const potentialNodes = Object.values(nodes).filter(n => n.type !== 'azure-monitor' && n.type !== 'internet');
                    if (potentialNodes.length > 0) {
                        const source = potentialNodes[Math.floor(Math.random() * potentialNodes.length)];
                        // Check if we didn't just spawn one from here (limit visual clutter)
                        if (Math.random() < 0.5) {
                            nextPackets.push({
                                id: `log-${Date.now()}-${Math.random()}`,
                                type: 'log-entry',
                                progress: 0,
                                speed: 600, // Fast
                                routeStack: [source.id],
                                targetNodeId: monitorId,
                                edgeId: '' // No Edge
                            });
                        }
                    }
                }
            }

            // 4. Update State
            if (Object.keys(nodeUpdates).length > 0 || forwardedPackets.length > 0 || spawnedPackets.length > 0 || packetsToRemove.size > 0 || packets.length > 0) {
                useGameStore.setState(state => {
                    const newPackets = [
                        ...nextPackets,
                        ...forwardedPackets,
                        ...spawnedPackets
                    ];
                    return {
                        nodes: { ...state.nodes, ...nodeUpdates },
                        packets: newPackets
                    };
                });
            }
        }

        previousTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);
};
