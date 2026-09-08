class AudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = localStorage.getItem('audioEnabled') !== 'false';
        this.initialized = false;
        
        // Sequencer state
        this.isPlaying = false;
        this.nextNoteTime = 0.0;
        this.currentStep = 0;
        this.tempo = 124; // BPM
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // s
        this.timerID = null;
        this.masterGain = null;
        
        // 16-step Synthwave Bassline Arpeggio (Minor pentatonic)
        // Values represent semitone offsets from a root note. null is a rest.
        this.sequence = [
            0, 0, 12, 0, 
            3, 0, 7, 0, 
            0, 0, 12, 0, 
            10, 0, 7, 3
        ];
        this.rootFreq = 65.41; // C2
    }

    init() {
        if (this.initialized) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.15; // Balanced volume for BGM
            this.masterGain.connect(this.ctx.destination);
            
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('audioEnabled', enabled);
        
        if (this.masterGain) {
            if (!enabled) {
                this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
            } else {
                this.masterGain.gain.setTargetAtTime(0.15, this.ctx.currentTime, 0.5);
            }
        }
    }

    // --- Sequencer Logic ---
    
    nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        // 16th notes = 0.25 beats
        this.nextNoteTime += 0.25 * secondsPerBeat;
        this.currentStep++;
        if (this.currentStep >= 16) {
            this.currentStep = 0;
        }
    }

    playNote(time, step) {
        const noteOffset = this.sequence[step];
        if (noteOffset === null) return;
        
        // Calculate frequency
        const freq = this.rootFreq * Math.pow(2, noteOffset / 12);
        
        // Create Synth Voice
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gainNode = this.ctx.createGain();
        
        osc.type = 'sawtooth'; // Classic 80s bass
        osc.frequency.value = freq;
        
        // Plucky envelope
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(1, time + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        
        // Filter sweep
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.1);
        filter.Q.value = 5; // Resonant squelch
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        osc.start(time);
        osc.stop(time + 0.15);
    }

    scheduler() {
        if (!this.isPlaying || !this.ctx) return;
        
        // Schedule notes while there are notes that will need to play before the next interval
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.playNote(this.nextNoteTime, this.currentStep);
            this.nextNote();
        }
        
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    startDrone() { // Kept name for compatibility with gameEngine
        if (!this.initialized) this.init();
        if (!this.enabled || !this.ctx) return;
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.currentStep = 0;
            this.nextNoteTime = this.ctx.currentTime + 0.1;
            this.scheduler();
        }
    }

    stopDrone() {
        this.isPlaying = false;
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
    }

    // --- Sound Effects ---

    playLaserHit() {
        if (!this.enabled || !this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        
        // High pitched chirp
        osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
        
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playMisfire() {
        if (!this.enabled || !this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime); // Low harsh buzz
        
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playExplosion() {
        if (!this.enabled || !this.ctx) return;
        
        const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // White noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        // Drop frequency to simulate explosion distance/bass
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.5);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        noise.start();
    }

    playSiren() {
        if (!this.enabled || !this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        
        // Warble
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.setValueAtTime(600, this.ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(800, this.ctx.currentTime + 0.4);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.6);
    }
}

export const audioEngine = new AudioEngine();
