class HapticsEngine {
    constructor() {
        this.enabled = localStorage.getItem('hapticsEnabled') !== 'false';
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('hapticsEnabled', enabled);
    }

    vibrate(pattern) {
        if (!this.enabled || !navigator.vibrate) return;
        try {
            navigator.vibrate(pattern);
        } catch(e) {
            // Ignore failures on unsupported devices
        }
    }

    playLaserHit() {
        this.vibrate(10);
    }

    playExplosion() {
        this.vibrate(50);
    }

    playBreach() {
        this.vibrate([120, 60, 120]);
    }
}

export const hapticsEngine = new HapticsEngine();
