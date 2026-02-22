const puppeteer = require('puppeteer');
const http = require('http');
const serveHandler = require('serve-handler');

(async () => {
  // simple static server
  const server = http.createServer((req, res) => serveHandler(req, res, { public: '.' }));
  server.listen(5000);
  const base = 'http://127.0.0.1:5000/games/01-brick-breaker/index.html';

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.toString()));

  try {
    await page.goto(base, { waitUntil: 'networkidle2' });

    // ensure paddle exists
    const paddle = await page.$eval('body', () => true);

    // try launch sequence: click to launch
    await page.mouse.click(100, 520);
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // capture ball y before and after
    const ballYbefore = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      const game = window.game; // Phaser exposes game globally in this build
      try {
        return game.scene.scenes[0].ball ? game.scene.scenes[0].ball.y : null;
      } catch(e){ return null; }
    });

    await page.waitForTimeout(600);

    const ballYafter = await page.evaluate(() => {
      const game = window.game;
      try { return game.scene.scenes[0].ball ? game.scene.scenes[0].ball.y : null; } catch(e){ return null; }
    });

    console.log('ballYbefore', ballYbefore, 'ballYafter', ballYafter);

    if (errors.length) {
      console.error('Console errors detected:', errors.join('\n'));
      process.exitCode = 2;
    } else if (!ballYbefore || !ballYafter || ballYafter >= ballYbefore) {
      console.error('Ball did not launch upwards as expected');
      process.exitCode = 3;
    } else {
      console.log('Smoke test passed: ball launched upwards');
    }
  } catch (e) {
    console.error('Smoke test exception', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
