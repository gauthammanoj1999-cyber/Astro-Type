class TextGenerator {
    constructor() {
        this.tier1 = [
            'System', 'Target', 'Deploy', 'Vector', 'Matrix', 'Nexus',
            'Orbit', 'Quantum', 'Plasma', 'Core', 'Node', 'Pulse',
            'Laser', 'Shield', 'Breach', 'NASA', 'AI', 'CPU', 'GPS',
            'v1.0', '2026', 'Auth', 'Data', 'Grid', 'Void'
        ];
        
        this.tier2 = [
            'Access Denied.', 'System Override!', 'Target locked.',
            'Vector aligned.', 'Shields offline.', 'Core breach!',
            'Sector 7G', 'Apollo 11', 'Data corrupted.', 'Signal lost.',
            'Deploy countermeasures.', 'Quantum flux.', 'Plasma vent.'
        ];
        
        this.tier3 = [
            'Warning: Hull breach imminent.', 'Deploying countermeasures now.',
            'Apollo 11 landed safely.', 'The AI singularity approaches.',
            'Reroute power to the shields!', 'Navigation systems are offline.',
            'Initiate the warp sequence.', 'Scanning for hostiles...',
            'Can you read me, HAL?', 'Transmission received from Earth.'
        ];
    }
    
    generateWords(count) {
        if (count === 1) {
            return this.tier1[Math.floor(Math.random() * this.tier1.length)];
        } else if (count === 2) {
            return this.tier2[Math.floor(Math.random() * this.tier2.length)];
        } else {
            return this.tier3[Math.floor(Math.random() * this.tier3.length)];
        }
    }
}

export const textGenerator = new TextGenerator();
