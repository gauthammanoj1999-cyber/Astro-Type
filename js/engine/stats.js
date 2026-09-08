class LeaderboardManager {
    constructor() {
        this.storageKey = 'antigravity_leaderboard';
        this.salt = "aG9seV9zaGllbGRfYmF0bWFu"; // Simple obfuscation salt
        this.load();
    }
    
    _generateHash(payloadStr) {
        let str = payloadStr + this.salt;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }
    
    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                const expectedHash = this._generateHash(JSON.stringify(parsed.payload));
                
                if (parsed.hash === expectedHash) {
                    this.scores = parsed.payload;
                } else {
                    console.warn("Anti-tamper: Hash mismatch. Leaderboard data invalidated.");
                    this.scores = { campaign: [], sniper: [], blitz: [] };
                }
            } else {
                this.scores = { campaign: [], sniper: [], blitz: [] };
            }
        } catch(e) {
            this.scores = { campaign: [], sniper: [], blitz: [] };
        }
    }
    
    save() {
        const payloadStr = JSON.stringify(this.scores);
        const hash = this._generateHash(payloadStr);
        const dataToSave = {
            payload: this.scores,
            hash: hash
        };
        localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
    }
    
    clearAllData() {
        localStorage.removeItem(this.storageKey);
        this.scores = { campaign: [], sniper: [], blitz: [] };
    }
    
    addScore(mode, callsign, score, wpm, accuracy, levelReached) {
        // Anti-Cheat Validation Pipeline: Reject physically impossible API submissions
        if (wpm > 350 || accuracy < 0 || accuracy > 100 || score < 0 || levelReached < 1) {
            console.warn("Anti-Cheat: Impossible mechanical stats detected. Score rejected.");
            return;
        }
        if (score > (levelReached * 50000)) {
            console.warn("Anti-Cheat: Anomalous score/level ratio detected. Score rejected.");
            return;
        }
        
        if (!this.scores[mode]) this.scores[mode] = [];
        
        this.scores[mode].push({
            callsign: callsign.toUpperCase(),
            score, wpm, accuracy, levelReached,
            date: new Date().toISOString()
        });
        
        // Sort descending by score, keep top 10
        this.scores[mode].sort((a, b) => b.score - a.score);
        this.scores[mode] = this.scores[mode].slice(0, 10);
        
        this.save();
    }
    
    isHighScore(mode, score) {
        if (score <= 0) return false;
        if (!this.scores[mode] || this.scores[mode].length < 10) return true;
        return score > this.scores[mode][9].score;
    }
    
    getScores(mode) {
        return this.scores[mode] || [];
    }
}

export const leaderboardManager = new LeaderboardManager();

class StatsManager {
    constructor() {
        this.resetSession();
    }
    
    resetSession() {
        this.session = {
            mode: 'campaign', // campaign, sniper, blitz
            startTime: null,
            timeRemaining: 90, // for blitz
            correctChars: 0,
            incorrectChars: 0,
            totalSentences: 0,
            level: 1,
            score: 0,
            shields: 3
        };
    }
    
    startSession(mode) {
        this.resetSession();
        this.session.mode = mode;
        this.session.startTime = Date.now();
        
        if (mode === 'sniper') {
            this.session.shields = 1; // 1 shield = sudden death
        } else if (mode === 'zen') {
            this.session.shields = Infinity;
        }
    }
    
    recordChar(isCorrect, isSniper) {
        if (isCorrect) {
            this.session.correctChars++;
            this.session.score += (this.session.level * 10);
        } else {
            this.session.incorrectChars++;
        }
    }
    
    recordAsteroidDestroyed(wordCount, perfect) {
        this.session.totalSentences++;
        
        // Score bonus
        let bonus = wordCount * 100 * this.session.level;
        if (perfect) bonus *= 2;
        this.session.score += bonus;
    }
    
    loseShield() {
        this.session.shields--;
        return this.session.shields <= 0;
    }
    
    getWPM() {
        if (!this.session.startTime) return 0;
        let elapsedMs = Date.now() - this.session.startTime;
        
        if (this.session.mode === 'blitz') {
            elapsedMs = (90 - this.session.timeRemaining) * 1000;
        }
        
        const minutes = elapsedMs / 60000;
        if (minutes < 0.05) return 0;
        
        const wpm = Math.round((this.session.correctChars / 5) / minutes);
        return Math.min(300, Math.max(0, wpm)); // Clamp to 300 Max
    }
    
    getAccuracy() {
        const total = this.session.correctChars + this.session.incorrectChars;
        if (total === 0) return 100;
        const acc = Math.round((this.session.correctChars / total) * 100);
        return Math.min(100, Math.max(0, acc)); // Clamp 0-100
    }
}

export const statsManager = new StatsManager();
