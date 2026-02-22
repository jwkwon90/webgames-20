const puppeteer = require('puppeteer');
const http = require('http');
const serveHandler = require('serve-handler');

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

(async () => {
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

    // wait for game to initialize
    await sleep(500);

    // ensure ball exists and is attached
    let ballYbefore = await page.evaluate(() => {
      const g = window.game; if(!g) return null;
      const s = g.scene.scenes[0]; if(!s) return null;
      return s.ball ? s.ball.y : null;
    });

    // try launch with click and space
    await page.mouse.click(100, 520);
    await page.keyboard.press('Space');
    await sleep(600);

    let ballYafter = await page.evaluate(() => {
      const g = window.game; if(!g) return null;
      const s = g.scene.scenes[0]; if(!s) return null;
      return s.ball ? s.ball.y : null;
    });

    // check ball moved up
    const launchOk = (ballYbefore !== null && ballYafter !== null && ballYafter < ballYbefore);

    // Wait a bit and check a brick was hit (remainingBricks decreased)
    const remainingBefore = await page.evaluate(() => {
      const g = window.game; if(!g) return null; const s = g.scene.scenes[0]; if(!s) return null; return s.remainingBricks;
    });

    // wait up to 4s for brick to change
    let remainingAfter = remainingBefore;
    for(let i=0;i<8;i++){
      await sleep(500);
      remainingAfter = await page.evaluate(() => {
        const g = window.game; if(!g) return null; const s = g.scene.scenes[0]; if(!s) return null; return s.remainingBricks;
      });
      if(remainingAfter < remainingBefore) break;
    }

    const brickHit = (remainingBefore !== null && remainingAfter !== null && remainingAfter < remainingBefore);

    // simulate ball fall to test lives decrement: set ball velocity downwards and wait
    await page.evaluate(() => {
      const g = window.game; if(!g) return; const s = g.scene.scenes[0]; if(!s || !s.ball) return; s.ball.body.setVelocity(0, 800);
    });
    await sleep(1000);
    const livesAfter = await page.evaluate(() => {
      const g = window.game; if(!g) return null; const s = g.scene.scenes[0]; if(!s) return null; return s.lives;
    });

    const livesDecreased = (livesAfter !== null && livesAfter < 3);

    // report
    if (errors.length) {
      console.error('Console errors detected:', errors.join('\n'));
      process.exitCode = 2;
    } else if (!launchOk) {
      console.error('Ball did not launch upwards as expected');
      process.exitCode = 3;
    } else if (!brickHit) {
      console.error('No brick hit detected within wait interval');
      process.exitCode = 4;
    } else if (!livesDecreased) {
      console.error('Lives did not decrease after forcing ball fall');
      process.exitCode = 5;
    } else {
      console.log('Smoke test passed: launch, brick hit, lives decrease OK');
    }
  } catch (e) {
    console.error('Smoke test exception', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
