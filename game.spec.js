import { test, expect } from '@playwright/test';

test('Antigravity Realistic Auto-Play Bot: Waits for visible asteroids & clears to Level 10', async ({ page }) => {
    test.setTimeout(180000);

    await page.goto('http://localhost:8000');
    await expect(page.locator('canvas')).toBeVisible();

    const startBtn = page.locator('button[data-mode="campaign"], button:has-text("Campaign")').first();
    await startBtn.click();

    await page.waitForTimeout(1000);

    const results = await page.evaluate(async () => {
        const engine = window.gameEngine;
        if (!engine) return { error: 'No gameEngine found' };

        const targetLevel = 10;
        const maxDurationMs = 150000;
        const start = Date.now();
        let totalKeys = 0;

        while (Date.now() - start < maxDurationMs) {
            if (engine.isGameOver || engine.currentLevel >= targetLevel) break;

            // Only pick asteroids that are visible on screen (y >= 80)
            const visibleAsteroids = (engine.asteroids || []).filter(a => a.y >= 80);

            const active = engine.activeAsteroid || (visibleAsteroids.length > 0 ? visibleAsteroids[0] : null);

            if (active && (active.y >= 80 || engine.activeAsteroid)) {
                const text = active.remainingText || active.word || '';
                if (text.length > 0) {
                    const char = text[0];

                    if (typeof engine.handleChar === 'function') {
                        engine.handleChar(char);
                    } else if (typeof engine.handleTyping === 'function') {
                        engine.handleTyping(char);
                    }

                    totalKeys++;
                }
            }

            // 100ms cadence gives a realistic ~100 WPM flow with visible asteroid travel
            await new Promise(r => setTimeout(r, 100));
        }

        return {
            totalKeys,
            finalLevel: engine.currentLevel,
            finalScore: engine.score,
            isGameOver: engine.isGameOver
        };
    });

    console.log('\n--- REALISTIC AUTO-PLAY RESULTS ---', results);
    expect(results.finalLevel).toBeGreaterThanOrEqual(10);
});