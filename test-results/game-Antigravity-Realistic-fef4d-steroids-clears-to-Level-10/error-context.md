# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: game.spec.js >> Antigravity Realistic Auto-Play Bot: Waits for visible asteroids & clears to Level 10
- Location: game.spec.js:3:5

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 10
Received:    7
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - textbox
  - banner:
    - generic:
      - generic:
        - generic: LEVEL
        - generic: "7"
      - generic:
        - generic: SCORE
        - generic: "24240"
      - generic:
        - generic: WPM
        - generic: "8"
      - generic:
        - generic: ACC
        - generic: 100%
    - generic:
      - generic:
        - generic: HULL INTEGRITY
        - generic:
          - generic: ⬢
          - generic: ⬢
          - generic: ⬢
    - button "Pause Menu" [ref=e2] [cursor=pointer]
  - main [ref=e5]:
    - generic: Tap to Deploy Fire Controls
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Antigravity Realistic Auto-Play Bot: Waits for visible asteroids & clears to Level 10', async ({ page }) => {
  4  |     test.setTimeout(180000);
  5  | 
  6  |     await page.goto('http://localhost:8000');
  7  |     await expect(page.locator('canvas')).toBeVisible();
  8  | 
  9  |     const startBtn = page.locator('button[data-mode="campaign"], button:has-text("Campaign")').first();
  10 |     await startBtn.click();
  11 | 
  12 |     await page.waitForTimeout(1000);
  13 | 
  14 |     const results = await page.evaluate(async () => {
  15 |         const engine = window.gameEngine;
  16 |         if (!engine) return { error: 'No gameEngine found' };
  17 | 
  18 |         const targetLevel = 10;
  19 |         const maxDurationMs = 150000;
  20 |         const start = Date.now();
  21 |         let totalKeys = 0;
  22 | 
  23 |         while (Date.now() - start < maxDurationMs) {
  24 |             if (engine.isGameOver || engine.currentLevel >= targetLevel) break;
  25 | 
  26 |             // Only pick asteroids that are visible on screen (y >= 80)
  27 |             const visibleAsteroids = (engine.asteroids || []).filter(a => a.y >= 80);
  28 | 
  29 |             const active = engine.activeAsteroid || (visibleAsteroids.length > 0 ? visibleAsteroids[0] : null);
  30 | 
  31 |             if (active && (active.y >= 80 || engine.activeAsteroid)) {
  32 |                 const text = active.remainingText || active.word || '';
  33 |                 if (text.length > 0) {
  34 |                     const char = text[0];
  35 | 
  36 |                     if (typeof engine.handleChar === 'function') {
  37 |                         engine.handleChar(char);
  38 |                     } else if (typeof engine.handleTyping === 'function') {
  39 |                         engine.handleTyping(char);
  40 |                     }
  41 | 
  42 |                     totalKeys++;
  43 |                 }
  44 |             }
  45 | 
  46 |             // 100ms cadence gives a realistic ~100 WPM flow with visible asteroid travel
  47 |             await new Promise(r => setTimeout(r, 100));
  48 |         }
  49 | 
  50 |         return {
  51 |             totalKeys,
  52 |             finalLevel: engine.currentLevel,
  53 |             finalScore: engine.score,
  54 |             isGameOver: engine.isGameOver
  55 |         };
  56 |     });
  57 | 
  58 |     console.log('\n--- REALISTIC AUTO-PLAY RESULTS ---', results);
> 59 |     expect(results.finalLevel).toBeGreaterThanOrEqual(10);
     |                                ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  60 | });
```