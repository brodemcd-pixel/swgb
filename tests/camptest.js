const { chromium } = require('playwright');
const path = 'file://' + __dirname + '/../public/index.html';
(async () => {
  const browser = await chromium.launch();
  const errs = [];
  const page = await browser.newPage({ viewport: { width: 1300, height: 850 } });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await page.goto(path);

  // --- campaign menu
  await page.click('#modes button[data-mode="campaign"]');
  await page.waitForTimeout(150);
  console.log('mission rows', await page.evaluate(() => document.querySelectorAll('#missions .mrow').length),
    'locked', await page.evaluate(() => document.querySelectorAll('#missions .mrow.lock').length));

  // --- run each mission headlessly: setup must work and objectives evaluate
  for (const i of [0, 1, 2, 3, 4, 5]) {
    const r = await page.evaluate(idx2 => {
      try { localStorage.removeItem('gbl_campaign'); } catch (e) {}
      const m = MISSIONS[idx2];
      startMission(m);
      const before = { p: units.filter(u => u.team === 0).length, b0: buildings.filter(b => b.team === 0).length, b1: buildings.filter(b => b.team === 1).length, nP };
      for (let k = 0; k < 60 * 90; k++) update();   // 90 seconds
      refreshObjectives();
      return {
        id: m.id, nP: before.nP, start: before,
        objs: objectives.map(o => (typeof o.text === 'function' ? o.text() : o.text) + '=' + o.state),
        gameOver, units: [0, 1, 2].map(t => units.filter(u => u.team === t).length),
        hud: document.getElementById('obj').textContent.slice(0, 60)
      };
    }, i);
    console.log(JSON.stringify(r));
    await page.goto(path);
  }
  console.log('ERRORS:', errs.slice(0, 6));
  await browser.close();
})();
