import { textGenerator } from './textGenerator.js';
import { statsManager, leaderboardManager } from './stats.js';
import { audioEngine } from './audioEngine.js';
import { hapticsEngine } from './haptics.js';
import { voiceEngine } from './voiceEngine.js';

export class GameEngine {
    constructor(renderer) {
        this.renderer = renderer;
        this.asteroids = [];
        this.activeAsteroid = null;
        
        this.isPaused = true;
        this.isGameOver = true;
        
        this.lastTime = 0;
        
        this.charIndex = 0;
        this.currentAsteroidPerfect = true;
        
        this.waveAsteroidsSpawned = 0;
        this.waveAsteroidsTotal = 0;
        
        this.transitioningWave = false;
        this.transitionTimer = 0;
        this.bannerText = "";
        this.bannerAlpha = 0;
        this.announcedIncoming = false;
        
        this.animationFrameId = null;
    }
    
    get currentLevel() { return statsManager.session.level; }
    get score() { return statsManager.session.score; }
    
    start(mode) {
        if (!this.isGameOver) return; // Guard against screen-tap double starts
        
        this.isPaused = false;
        this.isGameOver = false;
        
        this.asteroids = [];
        this.activeAsteroid = null;
        this.renderer.clearAll();
        
        statsManager.startSession(mode);
        
        voiceEngine.announceGameStart();
        audioEngine.startDrone();
        
        this.startWave();
        
        this.lastTime = performance.now();
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
        
        document.getElementById('modal-menu').classList.remove('active');
        document.getElementById('modal-gameover').classList.remove('active');
        document.getElementById('modal-leaderboard').classList.remove('active');
        document.getElementById('modal-callsign').classList.remove('active');
        
        const banner = document.getElementById('wave-banner');
        if (banner) banner.classList.remove('visible');
    }
    
    startWave() {
        this.waveAsteroidsTotal = statsManager.session.level;
        this.waveAsteroidsSpawned = 0;
        this.transitioningWave = false;
        this.announcedIncoming = false;
        
        this.spawnAsteroid();
    }
    
    togglePause() {
        if (this.isGameOver) return;
        this.isPaused = !this.isPaused;
        
        if (this.onPause) this.onPause(this.isPaused);
        
        if (!this.isPaused) {
            audioEngine.startDrone();
            this.lastTime = performance.now();
            this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
        } else {
            audioEngine.stopDrone();
        }
    }
    
    endGame() {
        this.isGameOver = true;
        this.isPaused = true;
        
        audioEngine.stopDrone();
        voiceEngine.announceGameOver();
        
        // Final UI Updates
        document.getElementById('final-score').textContent = statsManager.session.score;
        document.getElementById('final-level').textContent = statsManager.session.level;
        document.getElementById('final-wpm').textContent = statsManager.getWPM();
        document.getElementById('final-acc').textContent = `${statsManager.getAccuracy()}%`;
        
        document.getElementById('modal-gameover').classList.add('active');
        
        // Zen mode doesn't save to leaderboard
        if (statsManager.session.mode === 'zen') return;
        
        // Check for high score
        if (leaderboardManager.isHighScore(statsManager.session.mode, statsManager.session.score)) {
            setTimeout(() => {
                document.getElementById('modal-callsign').classList.add('active');
                document.querySelector('.callsign-input').focus();
            }, 500);
        }
    }
    
    spawnAsteroid() {
        if (this.waveAsteroidsSpawned >= this.waveAsteroidsTotal) return;
        if (this.asteroids.length >= 4) return; // Max 4 active
        
        const wordCount = 1 + Math.floor((statsManager.session.level - 1) / 10);
        const text = textGenerator.generateWords(wordCount);
        
        const id = Date.now() + Math.random().toString(36).substr(2, 5);
        const margin = 100;
        const x = margin + Math.random() * (window.innerWidth - margin * 2);
        const y = -50 - (Math.random() * 50);
        
        let baseSpeed = 0.02 + (statsManager.session.level * 0.001);
        if (statsManager.session.mode === 'zen') {
            baseSpeed *= 0.75; // Slower in Zen
        } else if (statsManager.session.mode === 'blitz') {
            baseSpeed *= 2.0; // 2x faster in Blitz mode
        }
        
        const speedMultiplier = Math.max(0.2, 5 / text.length);
        const speed = baseSpeed * speedMultiplier;
        
        const self = this;
        const asteroidObj = {
            id, text, wordCount, x, y, speed,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.02,
            get remainingText() {
                return this.id === self.activeAsteroid?.id ? this.text.substring(self.charIndex) : this.text;
            }
        };
        
        this.asteroids.push(asteroidObj);
        this.waveAsteroidsSpawned++;
    }
    
    setActiveAsteroid(ast) {
        this.activeAsteroid = ast;
        this.charIndex = 0;
        this.currentAsteroidPerfect = true;
    }
    
    handleChar(char) {
        this.handleTyping(char);
    }
    
    handleTyping(key) {
        if (this.isPaused || this.isGameOver || !this.activeAsteroid || this.transitioningWave || this.activeAsteroid.y < 60) return;
        
        const targetChar = this.activeAsteroid.text[this.charIndex];
        
        if (key === targetChar) {
            statsManager.recordChar(true);
            this.charIndex++;
            this.renderer.fireLaser(this.activeAsteroid.x, this.activeAsteroid.y, false);
            
            audioEngine.playLaserHit();
            hapticsEngine.playLaserHit();
            
            if (this.charIndex === this.activeAsteroid.text.length) {
                this.completeAsteroid(this.activeAsteroid);
            }
        } else {
            statsManager.recordChar(false);
            this.currentAsteroidPerfect = false;
            this.renderer.createParticles(this.renderer.shipPos.x, this.renderer.shipPos.y, '#ff2a5f', 5);
            
            audioEngine.playMisfire();
            
            if (statsManager.session.mode === 'sniper') {
                audioEngine.playSiren();
                hapticsEngine.playBreach();
                const isDead = statsManager.loseShield();
                if (isDead) {
                    this.endGame();
                    return;
                }
            }
        }
        
        this.updateHUD();
    }
    
    completeAsteroid(ast) {
        statsManager.recordAsteroidDestroyed(ast.wordCount, this.currentAsteroidPerfect);
        
        if (statsManager.session.mode === 'blitz' && this.currentAsteroidPerfect) {
            statsManager.session.timeRemaining += (ast.wordCount === 1) ? 2 : 5;
        }
        
        this.renderer.fireLaser(ast.x, ast.y, true);
        this.asteroids = this.asteroids.filter(a => a.id !== ast.id);
        
        audioEngine.playExplosion();
        hapticsEngine.playExplosion();
        
        this.checkWaveProgress();
        
        // Blitz mode: Instantly queue the next spawn to keep the screen packed
        if (statsManager.session.mode === 'blitz' && this.asteroids.length < 4 && this.waveAsteroidsSpawned < this.waveAsteroidsTotal) {
            this.spawnAsteroid();
        }
    }
    
    escapeAsteroid(ast) {
        this.asteroids = this.asteroids.filter(a => a.id !== ast.id);
        
        if (statsManager.session.mode === 'zen') {
            // Dissolve effect
            this.renderer.createParticles(ast.x, ast.y, '#b53cff', 10);
        } else {
            // Damage effect
            this.renderer.createParticles(this.renderer.shipPos.x, this.renderer.shipPos.y, '#ffaa00', 50);
            audioEngine.playSiren();
            hapticsEngine.playBreach();
            voiceEngine.announceBreach();
            
            const isDead = statsManager.loseShield();
            if (isDead) {
                this.endGame();
                return;
            }
        }
        
        this.checkWaveProgress();
    }
    
    checkWaveProgress() {
        if (this.asteroids.length > 0) {
            if (!this.activeAsteroid || !this.asteroids.find(a => a.id === this.activeAsteroid.id)) {
                const visible = this.asteroids.filter(a => a.y >= 60);
                if (visible.length > 0) {
                    const lowest = visible.reduce((prev, curr) => (prev.y > curr.y) ? prev : curr);
                    this.setActiveAsteroid(lowest);
                } else {
                    this.setActiveAsteroid(null);
                }
            }
            if (this.waveAsteroidsSpawned < this.waveAsteroidsTotal && this.asteroids.length < 4) {
                this.spawnAsteroid();
            }
        } else {
            this.setActiveAsteroid(null);
            
            if (this.waveAsteroidsSpawned >= this.waveAsteroidsTotal) {
                // Wave Complete!
                this.triggerWaveTransition();
            } else {
                this.spawnAsteroid();
            }
        }
    }
    
    triggerWaveTransition() {
        this.transitioningWave = true;
        this.transitionTimer = 3000; // 3 seconds total transition
        voiceEngine.speak(`Wave ${statsManager.session.level} cleared!`, true);
        
        const banner = document.getElementById('wave-banner');
        if (banner) {
            banner.textContent = `WAVE ${statsManager.session.level} CLEARED`;
            banner.classList.add('visible');
        }
    }
    
    updateHUD() {
        this.renderer.updateHUD(
            statsManager.session.level,
            statsManager.getWPM(),
            statsManager.getAccuracy(),
            statsManager.session.shields,
            statsManager.session.score,
            statsManager.session.mode,
            statsManager.session.timeRemaining
        );
    }
    
    loop(timestamp) {
        if (this.isPaused || this.isGameOver) return;
        
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        if (statsManager.session.mode === 'blitz') {
            statsManager.session.timeRemaining -= dt / 1000;
            if (statsManager.session.timeRemaining <= 0) {
                statsManager.session.timeRemaining = 0;
                this.endGame();
                return;
            }
        }
        
        if (this.transitioningWave) {
            this.transitionTimer -= dt;
            
            if (this.transitionTimer > 1500) {
                // Banner showing "WAVE CLEARED"
            } else if (this.transitionTimer > 0) {
                if (!this.announcedIncoming) {
                    voiceEngine.speak(`Wave ${statsManager.session.level + 1}. Prepare for battle!`, true);
                    this.announcedIncoming = true;
                    const banner = document.getElementById('wave-banner');
                    if (banner) banner.textContent = `PREPARE FOR WAVE ${statsManager.session.level + 1}`;
                }
            } else {
                // Done transitioning
                this.transitioningWave = false;
                const banner = document.getElementById('wave-banner');
                if (banner) banner.classList.remove('visible');
                statsManager.session.level++;
                this.startWave();
            }
        } else {
            // Physics
            for (let i = this.asteroids.length - 1; i >= 0; i--) {
                const ast = this.asteroids[i];
                ast.y += ast.speed * dt;
                ast.rotation += ast.rotSpeed;
                
                if (ast.y > this.renderer.shipPos.y - 30) {
                    this.escapeAsteroid(ast);
                }
            }
            
            // Auto-lock onto newly visible asteroids if we don't have a target
            if (!this.activeAsteroid && this.asteroids.length > 0) {
                const visible = this.asteroids.filter(a => a.y >= 60);
                if (visible.length > 0) {
                    const lowest = visible.reduce((prev, curr) => (prev.y > curr.y) ? prev : curr);
                    this.setActiveAsteroid(lowest);
                }
            }
        }
        
        this.updateHUD();
        
        this.renderer.draw({
            asteroids: this.asteroids,
            activeAsteroid: this.activeAsteroid,
            charIndex: this.charIndex
        }, dt);
        
        this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }
}
