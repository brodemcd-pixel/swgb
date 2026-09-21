const { chromium } = require('playwright');
const path = 'file://' + __dirname + '/../public/index.html';
(async () => {
  const browser = await chromium.launch();
  const errs = [];
  const page = await browser.newPage({ viewport: { width: 1300, height: 850 } });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]));
  await page.goto(path);

  // M1 WIN: destroy enemy buildings
  console.log('m1 win', await page.evaluate(() => {
    try { localStorage.removeItem('gbl_campaign'); } catch (e) {}
    startMission(MISSIONS[0]);
    buildings.filter(b => b.team === 1).forEach(b => kill(b));
    for (let i = 0; i < 40; i++) update();
    return { over: gameOver, h1: document.querySelector('#overlay h1').textContent, h2: document.querySelector('#overlay h2').textContent, saved: campaignDone(), hudHidden: document.getElementById('obj').classList.contains('hidden'), btn: document.getElementById('endbtns').textContent };
  }));
  // menu should now unlock mission 2
  await page.goto(path);
  await page.click('#modes button[data-mode="campaign"]'); await page.waitForTimeout(120);
  console.log('after win: locked rows', await page.evaluate(() => document.querySelectorAll('#missions .mrow.lock').length),
              'ticks', await page.evaluate(() => [...document.querySelectorAll('#missions i')].map(i => i.textContent).join('')));

  // M1 LOSE: kill all player units
  await page.goto(path);
  console.log('m1 lose', await page.evaluate(() => {
    startMission(MISSIONS[0]);
    units.filter(u => u.team === 0).forEach(u => kill(u));
    for (let i = 0; i < 40; i++) update();
    return { over: gameOver, h1: document.querySelector('#overlay h1').textContent, h2: document.querySelector('#overlay h2').textContent };
  }));

  // M4 WIN: teleport engineers to the zone
  await page.goto(path);
  console.log('m4 win', await page.evaluate(() => {
    startMission(MISSIONS[3]);
    const z = mFar();
    units.filter(u => u.team === 0 && u.type === 'worker').slice(0, 2).forEach((u, i) => { u.x = z[0] * 32 + i * 10; u.y = z[1] * 32; });
    for (let i = 0; i < 40; i++) update();
    return { over: gameOver, h2: document.querySelector('#overlay h2').textContent, objs: objectives.map(o => o.state) };
  }));

  // M4 LOSE: kill the engineers
  await page.goto(path);
  console.log('m4 lose', await page.evaluate(() => {
    startMission(MISSIONS[3]);
    units.filter(u => u.team === 0 && u.type === 'worker').forEach(u => kill(u));
    for (let i = 0; i < 40; i++) update();
    return { over: gameOver, h2: document.querySelector('#overlay h2').textContent };
  }));

  // M2 triggers: raids actually spawn
  await page.goto(path);
  console.log('m2 raids', await page.evaluate(() => {
    startMission(MISSIONS[1]);
    const counts = [];
    for (let m = 1; m <= 8; m++) { for (let i = 0; i < 3600; i++) update(); counts.push(units.filter(u => u.team === 1).length); }
    return { perMinute: counts, over: gameOver, h2: gameOver ? document.querySelector('#overlay h2').textContent : null, hqAlive: buildings.filter(b => b.team === 0 && b.type === 'hq').length };
  }));
  console.log('ERRORS:', errs.slice(0, 6));
  await browser.close();
})();
