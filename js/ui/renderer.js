export class Renderer {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.stars = [];
        this.particles = [];
        this.lasers = [];

        this.shipPos = { x: 0, y: 0 };
        this.shipAngle = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.initStars();
    }

    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container ? container.clientWidth : window.innerWidth;
        this.canvas.height = container ? container.clientHeight : window.innerHeight;
        this.shipPos.x = this.canvas.width / 2;
        this.shipPos.y = this.canvas.height - 70;
    }

    initStars() {
        for (let i = 0; i < 150; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2,
                speed: Math.random() * 0.5 + 0.1
            });
        }
    }

    clearAll() {
        this.particles = [];
        this.lasers = [];
    }

    createParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color,
                size: Math.random() * 3 + 1
            });
        }
    }

    fireLaser(targetX, targetY, isMissile = false) {
        const dx = targetX - this.shipPos.x;
        const dy = targetY - this.shipPos.y;
        const angle = Math.atan2(dy, dx);

        this.lasers.push({
            x: this.shipPos.x,
            y: this.shipPos.y,
            vx: Math.cos(angle) * (isMissile ? 12 : 20),
            vy: Math.sin(angle) * (isMissile ? 12 : 20),
            targetX, targetY,
            isMissile,
            life: 1.0
        });
    }

    draw(state, dt) {
        // Clear canvas with deep space color
        this.ctx.fillStyle = '#080910';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawStars(dt);
        this.drawAsteroids(state.asteroids, state.activeAsteroid, state.charIndex);

        // Calculate ship angle if active target exists
        if (state.activeAsteroid) {
            const dx = state.activeAsteroid.x - this.shipPos.x;
            const dy = state.activeAsteroid.y - this.shipPos.y;
            this.shipAngle = Math.atan2(dy, dx) + Math.PI / 2; // +90 deg because ship draws facing up
        } else {
            // Revert to pointing straight up smoothly
            this.shipAngle += (0 - this.shipAngle) * 0.1;
        }

        this.drawShip();
        this.updateAndDrawLasers(dt);
        this.updateAndDrawParticles(dt);
    }

    drawStars(dt) {
        this.ctx.fillStyle = '#ffffff';
        this.stars.forEach(star => {
            star.y += star.speed;
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }
            this.ctx.globalAlpha = star.speed;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;
    }

    drawShip() {
        this.ctx.save();
        this.ctx.translate(this.shipPos.x, this.shipPos.y);
        this.ctx.rotate(this.shipAngle);

        // Draw geometric ship (Wireframe style)
        this.ctx.strokeStyle = '#00f0ff';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';

        this.ctx.beginPath();
        this.ctx.moveTo(0, -20); // Nose
        this.ctx.lineTo(15, 15); // Right wing
        this.ctx.lineTo(0, 5);   // Center engine
        this.ctx.lineTo(-15, 15); // Left wing
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Engine glow
        this.ctx.fillStyle = '#ffaa00';
        this.ctx.beginPath();
        this.ctx.arc(0, 10, 4 + Math.random() * 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawAsteroids(asteroids, activeAsteroid, activeCharIndex) {
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        asteroids.forEach(ast => {
            const isActive = activeAsteroid && activeAsteroid.id === ast.id;

            // Draw Asteroid Shape (Procedural polygon)
            this.ctx.save();
            this.ctx.translate(ast.x, ast.y);
            this.ctx.rotate(ast.rotation || 0);

            this.ctx.strokeStyle = isActive ? '#b53cff' : '#4a557a';
            this.ctx.lineWidth = isActive ? 2 : 1;
            this.ctx.fillStyle = 'rgba(15, 17, 28, 0.8)';

            this.ctx.beginPath();
            // Simplified asteroid polygon
            const sides = 8;
            const size = isActive ? 35 : 30;
            for (let i = 0; i < sides; i++) {
                const a = (Math.PI * 2 / sides) * i;
                const r = size + (Math.sin(a * 3) * 5); // bumpy
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.restore();

            // Draw Text
            this.ctx.font = 'bold 20px "JetBrains Mono"';

            if (isActive) {
                // Split text into typed and untyped
                const typed = ast.text.substring(0, activeCharIndex);
                const untyped = ast.text.substring(activeCharIndex);

                // Measure to center the whole string
                const totalWidth = this.ctx.measureText(ast.text).width;
                let startX = ast.x - totalWidth / 2;

                this.ctx.textAlign = 'left';

                // Typed (Cyan)
                this.ctx.fillStyle = '#00f0ff';
                this.ctx.fillText(typed, startX, ast.y - 45);

                // Untyped (White/Muted)
                const typedWidth = this.ctx.measureText(typed).width;
                this.ctx.fillStyle = '#e0e5ff';
                this.ctx.fillText(untyped, startX + typedWidth, ast.y - 45);

            } else {
                this.ctx.fillStyle = '#626a85';
                this.ctx.fillText(ast.text, ast.x, ast.y - 45);
            }
        });
    }

    updateAndDrawLasers(dt) {
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.x += laser.vx;
            laser.y += laser.vy;

            // Check target hit (approximate distance)
            const dist = Math.hypot(laser.targetX - laser.x, laser.targetY - laser.y);
            if (dist < 15 || laser.y < 0) {
                // Hit! Create spark
                this.createParticles(laser.x, laser.y, laser.isMissile ? '#b53cff' : '#00f0ff', laser.isMissile ? 30 : 5);
                this.lasers.splice(i, 1);
                continue;
            }

            this.ctx.beginPath();
            if (laser.isMissile) {
                this.ctx.strokeStyle = '#b53cff';
                this.ctx.lineWidth = 4;
                this.ctx.moveTo(laser.x, laser.y);
                this.ctx.lineTo(laser.x - laser.vx * 2, laser.y - laser.vy * 2);
            } else {
                this.ctx.strokeStyle = '#00f0ff';
                this.ctx.lineWidth = 2;
                this.ctx.moveTo(laser.x, laser.y);
                this.ctx.lineTo(laser.x - laser.vx, laser.y - laser.vy);
            }
            this.ctx.stroke();
        }
    }

    updateAndDrawParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;
    }

    drawWaveBanner(text, alpha) {
        // Obsolete: Handled by HTML overlay
    }

    updateHUD(level, wpm, acc, shields, score, mode, timeRemaining) {
        document.getElementById('hud-level').textContent = level;
        document.getElementById('hud-wpm').textContent = wpm;
        document.getElementById('hud-acc').textContent = `${acc}%`;
        document.getElementById('hud-score').textContent = score;

        // Mode specific UI
        if (mode === 'blitz') {
            document.getElementById('hud-level-group').style.display = 'none';
            document.getElementById('hud-timer-group').style.display = 'flex';

            // Format time MM:SS
            const mins = Math.floor(timeRemaining / 60);
            const secs = Math.floor(timeRemaining % 60);
            document.getElementById('hud-timer').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            document.getElementById('hud-level-group').style.display = 'flex';
            document.getElementById('hud-timer-group').style.display = 'none';
        }

        // Update shields
        const shieldElements = document.getElementById('hud-shields').children;
        const shieldContainer = document.getElementById('hud-shields').parentElement;

        if (mode === 'zen') {
            shieldContainer.style.display = 'none';
        } else {
            shieldContainer.style.display = 'flex';
            for (let i = 0; i < 3; i++) {
                if (i < shields) {
                    shieldElements[i].classList.add('active');
                } else {
                    shieldElements[i].classList.remove('active');
                }
            }
        }
    }
}
