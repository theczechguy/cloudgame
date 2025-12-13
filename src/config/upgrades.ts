import type { NodeType } from '../engine/types';

export interface UpgradeDefinition {
    id: string;
    label: string;
    description: string;
    cost: number;
    validTypes: NodeType[];
}

export const UPGRADES: Record<string, UpgradeDefinition> = {
    'smart-routing': {
        id: 'smart-routing',
        label: 'Smart Routing (Least Queue)',
        description: 'Routes traffic to the node with the shortest queue. Balances load effectively between VMs and Functions.',
        cost: 200,
        validTypes: ['load-balancer', 'traffic-manager']
    }
    // Future upgrades:
    // 'deep-inspection': { id: 'deep-inspection', label: 'Deep Packet Inspection', ... validTypes: ['firewall'] }
    // 'read-replicas': { id: 'read-replicas', label: 'Read Replicas', ... validTypes: ['sql-db-premium'] }
};
