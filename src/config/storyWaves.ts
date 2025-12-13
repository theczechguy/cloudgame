import type { PacketType } from '../engine/types';

export interface StoryWave {
    name: string;
    duration: number; // Seconds
    rate: number;     // ms between requests (lower is faster)
    types: PacketType[]; // Allowed types for this wave. Include 'http-attack' to enable attacks.
    message: string;
}

export const STORY_WAVES: StoryWave[] = [
    // --- INTRO ---
    {
        name: "Stage 1: Hello World",
        duration: 30,
        rate: 2000, // 0.5 req/s
        types: ['http-compute'],
        message: "Startup launched! Initial user traffic detected. Keep an eye on your Function App."
    },
    {
        name: "Stage 2: The Traction",
        duration: 22,
        rate: 500, // 2.0 req/s (Doubled difficulty)
        types: ['http-compute'],
        message: "We're getting featured on tech blogs! Traffic is growing fast. Scale up!"
    },
    // --- STABILITY 1 ---
    {
        name: "Phase: Stability",
        duration: 30,
        rate: 1000, // 1 req/s
        types: ['http-compute'],
        message: "Traffic holding steady. Build up your cash reserves."
    },


    // --- DATABASE ---
    {
        name: "Stage 3: Data Persistence",
        duration: 30,
        rate: 200, // 5.0 req/s (Significant jump)
        types: ['http-compute', 'http-db'],
        message: "Users are creating accounts. We need a Database! Deploy Azure SQL now."
    },
    // --- STABILITY 2 ---
    {
        name: "Phase: Observability",
        duration: 30,
        rate: 400, // 2.5 req/s
        types: ['http-compute', 'http-db'],
        message: "Complexity increasing. Deploy Azure Monitor to identify bottlenecks before the next major spike!"
    },


    // --- SPIKE ---
    {
        name: "Stage 4: The Viral Spike",
        duration: 15,
        rate: 66, // ~15 req/s (Heavy Load)
        types: ['http-compute', 'http-db'],
        message: "VIRAL HIT! Massive traffic spike. Watch your queues!"
    },
    // --- RECOVERY ---
    {
        name: "Phase: Post-Spike Lull",
        duration: 22,
        rate: 200, // 5.0 req/s
        types: ['http-compute', 'http-db'],
        message: "Traffic normalizing after the spike. Good time to repair and upgrade."
    },


    // --- STORAGE ---
    {
        name: "Stage 5: Rich Media",
        duration: 30,
        rate: 125, // 8.0 req/s
        types: ['http-compute', 'http-db', 'http-storage'],
        message: "Feature update: Image uploads enabled. Deploy Blob Storage to handle the load."
    },
    // --- STABILITY 3 ---
    {
        name: "Phase: Storage Growth",
        duration: 30,
        rate: 166, // 6.0 req/s
        types: ['http-compute', 'http-db', 'http-storage'],
        message: "Media serving is steady. Ensure you have enough Blob redundancy."
    },


    // --- SECURITY ---
    {
        name: "Stage 6: Security Incident",
        duration: 22,
        rate: 100, // 10.0 req/s
        types: ['http-compute', 'http-db', 'http-storage', 'http-attack'],
        message: "WARNING: DDoS detected! Malicious traffic incoming. Hope you have a firewall!"
    },
    // --- STABILITY 4 ---
    {
        name: "Phase: Security Review",
        duration: 30,
        rate: 125, // 8.0 req/s
        types: ['http-compute', 'http-db', 'http-storage'], // Attacks stopped
        message: "Attacks have subsided. Analysis complete. Resume normal operations."
    },


    // --- ENDGAME ---
    {
        name: "Stage 7: Unicorn Status",
        duration: 9999, // Infinite
        rate: 33, // 30 req/s (Extreme)
        types: ['http-compute', 'http-db', 'http-storage'],
        message: "We've made it big! Sustained high load. Optimize for profitability."
    }
];
