import { Renderer } from './ui/renderer.js';
import { GameEngine } from './engine/gameEngine.js';
import { InputHandler } from './ui/inputHandler.js';
import { leaderboardManager, statsManager } from './engine/stats.js';
import { audioEngine } from './engine/audioEngine.js';
import { hapticsEngine } from './engine/haptics.js';
import { voiceEngine } from './engine/voiceEngine.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize systems
    const renderer = new Renderer();
    renderer.resize();
    window.addEventListener('resize', () => renderer.resize());

    const gameEngine = new GameEngine(renderer);
    window.gameEngine = gameEngine; // Expose for Playwright testing
    const inputHandler = new InputHandler(gameEngine);

    // Initial render call
    renderer.draw({ asteroids: [], activeAsteroid: null, charIndex: 0 }, 16);

    // Load Settings
    let audioEnabled = localStorage.getItem('audioEnabled') !== 'false';
    let hapticsEnabled = localStorage.getItem('hapticsEnabled') !== 'false';

    const updateSettingsUI = () => {
        document.getElementById('btn-toggle-audio').textContent = `AUDIO: ${audioEnabled ? 'ON' : 'OFF'}`;
        document.getElementById('btn-toggle-haptics').textContent = `HAPTICS: ${hapticsEnabled ? 'ON' : 'OFF'}`;
    };
    updateSettingsUI();

    // History API for Android back button
    window.addEventListener('popstate', (e) => {
        if (!gameEngine.isGameOver && !gameEngine.isPaused) {
            gameEngine.togglePause();
            showModal('modal-pause');
            return;
        }

        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        if (gameEngine.isGameOver) {
            document.getElementById('modal-menu').classList.add('active');
        }
    });

    const showModal = (id) => {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        history.pushState({ modal: id }, '');
    };

    history.replaceState({ modal: 'modal-menu' }, '');

    // Pause / Unpause logic bridging InputHandler and UI
    gameEngine.onPause = (paused) => {
        if (paused) {
            showModal('modal-pause');
        } else {
            document.getElementById('modal-pause').classList.remove('active');
        }
    };

    document.getElementById('btn-pause').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        gameEngine.togglePause();
    });

    // Mode Buttons
    document.querySelectorAll('.btn-mode').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            // Unlock sensory engines
            audioEngine.init();
            voiceEngine.init();

            const mode = e.currentTarget.getAttribute('data-mode');
            gameEngine.start(mode);

            if (window.matchMedia("(pointer: coarse)").matches) {
                document.getElementById('mobile-input').focus();
            }
        });
    });

    // Pause Menu Buttons
    document.getElementById('btn-resume').addEventListener('click', (e) => {
        e.preventDefault();
        gameEngine.togglePause();
    });

    document.getElementById('btn-restart-sector').addEventListener('click', (e) => {
        e.preventDefault();
        gameEngine.start(statsManager.session.mode);
    });

    document.getElementById('btn-toggle-audio').addEventListener('click', (e) => {
        e.preventDefault();
        audioEnabled = !audioEnabled;
        audioEngine.setEnabled(audioEnabled);
        voiceEngine.setEnabled(audioEnabled);
        updateSettingsUI();
    });

    document.getElementById('btn-toggle-haptics').addEventListener('click', (e) => {
        e.preventDefault();
        hapticsEnabled = !hapticsEnabled;
        hapticsEngine.setEnabled(hapticsEnabled);
        updateSettingsUI();
        if (hapticsEnabled && navigator.vibrate) {
            navigator.vibrate(50);
        }
    });

    document.getElementById('btn-abort-mission').addEventListener('click', (e) => {
        e.preventDefault();
        gameEngine.endGame();
        showModal('modal-menu');
        renderer.clearAll();
        renderer.draw({ asteroids: [], activeAsteroid: null, charIndex: 0 }, 16);
    });

    // GameOver Buttons
    document.getElementById('btn-restart').addEventListener('click', (e) => {
        e.preventDefault();
        gameEngine.start(statsManager.session.mode);
    });

    document.getElementById('btn-mainmenu').addEventListener('click', (e) => {
        e.preventDefault();
        showModal('modal-menu');
        renderer.clearAll();
        renderer.draw({ asteroids: [], activeAsteroid: null, charIndex: 0 }, 16);
    });

    // Leaderboards
    const renderLeaderboardTable = (mode) => {
        const tbody = document.getElementById('lb-tbody');
        tbody.innerHTML = '';
        const scores = leaderboardManager.getScores(mode);

        if (scores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No records found.</td></tr>`;
            return;
        }

        scores.forEach((s, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${s.callsign}</td>
                <td>${s.score}</td>
                <td>${s.levelReached}</td>
                <td>${s.wpm}</td>
                <td>${s.accuracy}%</td>
            `;
            tbody.appendChild(tr);
        });
    };

    document.getElementById('btn-show-leaderboard').addEventListener('click', (e) => {
        e.preventDefault();
        showModal('modal-leaderboard');
        document.querySelector('.lb-tab[data-tab="campaign"]').click();
    });

    document.getElementById('btn-close-leaderboard').addEventListener('click', (e) => {
        e.preventDefault();
        history.back();
        showModal('modal-menu');
    });

    document.querySelectorAll('.lb-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderLeaderboardTable(e.target.getAttribute('data-tab'));
        });
    });

    // Callsign Entry
    const callsignInput = document.getElementById('callsign-input');

    document.getElementById('btn-save-callsign').addEventListener('click', (e) => {
        e.preventDefault();
        let callsign = callsignInput.value.trim();
        if (callsign.length === 0) callsign = "ANON";

        leaderboardManager.addScore(
            statsManager.session.mode,
            callsign,
            statsManager.session.score,
            statsManager.getWPM(),
            statsManager.getAccuracy(),
            statsManager.session.level
        );

        showModal('modal-leaderboard');
        document.querySelector(`.lb-tab[data-tab="${statsManager.session.mode}"]`).click();
    });

    document.getElementById('btn-skip-callsign').addEventListener('click', (e) => {
        e.preventDefault();
        showModal('modal-gameover');
    });

    // Settings & Privacy
    document.getElementById('btn-show-settings').addEventListener('click', (e) => {
        e.preventDefault();
        showModal('modal-settings');
    });

    document.getElementById('btn-close-settings').addEventListener('click', (e) => {
        e.preventDefault();
        history.back();
        showModal('modal-menu');
    });

    document.getElementById('btn-clear-data').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm("Are you sure? This will permanently delete all high scores and local data.")) {
            leaderboardManager.clearAllData();
            alert("Data cleared.");
            location.reload();
        }
    });

    document.getElementById('btn-show-privacy').addEventListener('click', (e) => {
        e.preventDefault();
        showModal('modal-privacy');
    });

    document.getElementById('btn-close-privacy').addEventListener('click', (e) => {
        e.preventDefault();
        history.back();
        showModal('modal-settings');
    });

    // Service Worker (Disabled for development to prevent caching loops)
    /*
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(console.error);
        });
    }
    */
});
