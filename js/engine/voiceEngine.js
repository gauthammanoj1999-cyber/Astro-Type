class VoiceEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.enabled = localStorage.getItem('audioEnabled') !== 'false';
        this.voice = null;
        this.initialized = false;
        
        // Load voices asynchronously
        if (this.synth) {
            this.synth.onvoiceschanged = () => {
                this.loadVoice();
            };
            this.loadVoice(); // Try immediately as well
        }
    }

    init() {
        if (this.initialized || !this.synth) return;
        // Silent utterance to unlock audio context on mobile
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        this.synth.speak(utterance);
        this.initialized = true;
    }

    loadVoice() {
        if (!this.synth) return;
        const voices = this.synth.getVoices();
        if (voices.length === 0) return;
        
        // Try to find a robotic/authoritative English voice
        this.voice = voices.find(v => v.name.includes('Daniel') || v.name.includes('Google UK English Male') || v.name.includes('Samantha') || v.lang.startsWith('en-'));
        if (!this.voice) this.voice = voices[0];
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled && this.synth) {
            this.synth.cancel();
        }
    }

    speak(text, priority = false) {
        if (!this.enabled || !this.synth || !this.initialized) return;
        
        // Always cancel to clear stuck browser queues
        this.synth.cancel();
        
        console.log('[Voice]', text);
        
        const utterance = new SpeechSynthesisUtterance(text);
        if (this.voice) utterance.voice = this.voice;
        
        // Tactical robotic parameters
        utterance.pitch = 0.8;
        utterance.rate = 1.1;
        utterance.volume = 0.6; // Keep it slightly under the SFX volume
        
        this.synth.speak(utterance);
    }

    announceWaveStart(level) {
        this.speak(`Warning. Wave ${level} incoming.`);
    }

    announceWaveCleared(level) {
        this.speak(`Wave ${level} cleared.`, true);
    }

    announceBreach() {
        this.speak(`Warning. Hull breached.`, true);
    }

    announceGameStart() {
        this.speak(`Defense grid initialized.`, true);
    }

    announceGameOver() {
        this.speak(`Hull destroyed. Sector fallen.`, true);
    }
}

export const voiceEngine = new VoiceEngine();
