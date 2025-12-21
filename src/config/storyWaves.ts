import type { PacketType } from '../engine/types';

export interface TrafficConfig {
    type: PacketType;
    rate: number; // ms between requests for this specific type
}

export interface StoryWave {
    name: string;
    duration: number; // Seconds
    traffic: TrafficConfig[];
    message: string;
}

export const STORY_WAVES: StoryWave[] = [
    // --- INTRO ---
    {
        name: "Stage 1: Hello World",
        duration: 30,
        traffic: [{ type: 'http-compute', rate: 2000 }],
        message: "Startup launched! Initial user traffic detected. Keep an eye on your Function App."
    },
    {
        name: "Stage 2: The Traction",
        duration: 22,
        traffic: [{ type: 'http-compute', rate: 500 }],
        message: "We're getting featured on tech blogs! Traffic is growing fast. Scale up!"
    },
    // --- STABILITY 1 ---
    {
        name: "Phase: Stability",
        duration: 30,
        traffic: [{ type: 'http-compute', rate: 1000 }],
        message: "Traffic holding steady. Build up your cash reserves."
    },


    // --- DATABASE ---
    {
        name: "Stage 3: Data Persistence",
        duration: 30,
        traffic: [
            { type: 'http-compute', rate: 400 },
            { type: 'http-db', rate: 400 }
        ],
        message: "Users are creating accounts. We need a Database! Deploy Azure SQL now."
    },
    // --- STABILITY 2 ---
    {
        name: "Phase: Observability",
        duration: 30,
        traffic: [
            { type: 'http-compute', rate: 800 },
            { type: 'http-db', rate: 800 }
        ],
        message: "Complexity increasing. Deploy Azure Monitor to identify bottlenecks before the next major spike!"
    },


    // --- SPIKE ---
    {
        name: "Stage 4: The Viral Spike",
        duration: 15,
        traffic: [
            { type: 'http-compute', rate: 100 },
            { type: 'http-db', rate: 200 }
        ],
        message: "VIRAL HIT! Massive traffic spike. Watch your queues!"
    },
    // --- RECOVERY ---
    {
        name: "Phase: Post-Spike Lull",
        duration: 22,
        traffic: [
            { type: 'http-compute', rate: 400 },
            { type: 'http-db', rate: 400 }
        ],
        message: "Traffic normalizing after the spike. Good time to repair and upgrade."
    },


    // --- STORAGE ---
    {
        name: "Stage 5: Rich Media",
        duration: 30,
        traffic: [
            { type: 'http-compute', rate: 300 },
            { type: 'http-db', rate: 500 },
            { type: 'http-storage', rate: 300 }
        ],
        message: "Feature update: Image uploads enabled. Deploy Blob Storage to handle the load."
    },
    // --- STABILITY 3 ---
    {
        name: "Phase: Storage Growth",
        duration: 30,
        traffic: [
            { type: 'http-compute', rate: 400 },
            { type: 'http-db', rate: 600 },
            { type: 'http-storage', rate: 400 }
        ],
        message: "Media serving is steady. Ensure you have enough Blob redundancy."
    },


    // --- SECURITY ---
    {
        name: "Stage 6: Security Incident",
        duration: 22,
        traffic: [
            { type: 'http-compute', rate: 400 },
            { type: 'http-db', rate: 600 },
            { type: 'http-storage', rate: 400 },
            { type: 'http-attack', rate: 200 }
        ],
        message: "WARNING: DDoS detected! Malicious traffic incoming. Hope you have a firewall!"
    },
    // --- STABILITY 4 ---
    {
        name: "Phase: Security Review",
        duration: 30,
        traffic: [
            { type: 'http-compute', rate: 400 },
            { type: 'http-db', rate: 600 },
            { type: 'http-storage', rate: 400 }
        ],
        message: "Attacks have subsided. Analysis complete. Resume normal operations."
    },


    // --- REGIONALITY ---
    {
        name: "Stage 7: Regional Compliance",
        duration: 35,
        traffic: [
            { type: 'http-compute', rate: 250 },
            { type: 'http-db', rate: 400 },
            { type: 'http-storage', rate: 300 }
        ],
        message: "Legal update: New data residency laws require us to keep customer data within North America. Create a 'North America' region, set its Geo Location in the Inspector, and move your services inside!"
    },
    {
        name: "Phase: Residency Audit",
        duration: 25,
        traffic: [
            { type: 'http-compute', rate: 300 },
            { type: 'http-db', rate: 500 },
            { type: 'http-storage', rate: 400 }
        ],
        message: "Auditors are happy. Your data is secure and compliant within the US borders."
    },

    // --- DOMESTIC GROWTH ---
    {
        name: "Stage 8: North American Growth",
        duration: 40,
        traffic: [
            { type: 'http-compute', rate: 150 },
            { type: 'http-db', rate: 250 },
            { type: 'http-storage', rate: 200 }
        ],
        message: "Our US marketing campaign is a hit! Traffic is surging. Make sure your single region can scale to meet the demand."
    },
    {
        name: "Phase: Capacity Management",
        duration: 30,
        traffic: [
            { type: 'http-compute', rate: 200 },
            { type: 'http-db', rate: 300 },
            { type: 'http-storage', rate: 250 }
        ],
        message: "You've successfully handled the domestic surge. The platform is robust."
    },


    // --- GLOBAL EXPANSION ---
    {
        name: "Stage 9: The Global Move",
        duration: 45,
        traffic: [
            { type: 'http-compute', rate: 300 },
            { type: 'http-db', rate: 500 },
            { type: 'http-storage', rate: 300 }
        ],
        message: "We're going global! Traffic from Europe is lagging. Deploy a second region in Europe and use Traffic Manager to route them locally for better performance."
    },
    {
        name: "Phase: Regional Tuning",
        duration: 30,
        traffic: [
            { type: 'http-compute', rate: 300 },
            { type: 'http-db', rate: 500 },
            { type: 'http-storage', rate: 300 }
        ],
        message: "Ensure your European cluster has its own local DB or use Cosmos DB for global sync!"
    },


    // --- PERFORMANCE & CACHING ---
    {
        name: "Stage 10: The Database Bottleneck",
        duration: 45,
        traffic: [
            { type: 'http-compute', rate: 100 },
            { type: 'http-db', rate: 100 }
        ],
        message: "Our database is struggling with repeated queries. Deploy Azure Cache for Redis to offload the pressure!"
    },
    {
        name: "Phase: Cache Optimization",
        duration: 30,
        traffic: [
            { type: 'http-compute', rate: 150 },
            { type: 'http-db', rate: 150 }
        ],
        message: "Redis is helping! 35% of queries are being served from memory now."
    },


    // --- DECOUPLING & BACKPRESSURE ---
    {
        name: "Stage 11: The Asynchronous Pattern",
        duration: 45,
        traffic: [
            { type: 'http-compute', rate: 100 },
            { type: 'http-db', rate: 200 },
            { type: 'http-storage', rate: 100 }
        ],
        message: "Processing is taking too long during peaks. Use Storage Queues to buffer requests and avoid dropping traffic."
    },
    {
        name: "Phase: Queue Leveling",
        duration: 30,
        traffic: [
            { type: 'http-compute', rate: 150 },
            { type: 'http-db', rate: 300 },
            { type: 'http-storage', rate: 150 }
        ],
        message: "Queues are smoothing out the bursts. Your throughput is much more stable."
    },


    // --- ADVANCED SECURITY ---
    {
        name: "Stage 12: Elite Security",
        duration: 30,
        traffic: [
            { type: 'http-compute', rate: 100 },
            { type: 'http-db', rate: 200 },
            { type: 'http-storage', rate: 100 },
            { type: 'http-attack', rate: 100 }
        ],
        message: "Standard firewalls aren't enough for this level of attack. We need a Web Application Firewall (WAF)!"
    },
    {
        name: "Phase: Secure & Scale",
        duration: 30,
        traffic: [
            { type: 'http-compute', rate: 150 },
            { type: 'http-db', rate: 300 },
            { type: 'http-storage', rate: 150 }
        ],
        message: "Security posture is strong. Prepare for the final growth spurt."
    },


    // --- ENDGAME ---
    {
        name: "Stage 13: Unicorn Status",
        duration: 9999, // Infinite
        traffic: [
            { type: 'http-compute', rate: 40 },
            { type: 'http-db', rate: 60 },
            { type: 'http-storage', rate: 40 }
        ],
        message: "We've made it! Sustained massive load. Optimize your architecture for maximum profitability and 100% SLA."
    }
];
