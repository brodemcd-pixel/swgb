const { chromium } = require('playwright');
const path = 'file://' + __dirname + '/../public/index.html';
(async () => {
  const browser = await chromium.launch();
  const errs = [];
  const page = await browser.newPage({ viewport: { width: 1300, height: 850 } });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await page.goto(path);

  // 3 allied opponents via the UI
  await page.click('#opps button[data-o="3"]');
  await page.click('#sizes button[data-s="72"]');
  await page.click('#startbtn');
  await page.waitForTimeout(250);
  const r = await page.evaluate(() => {
    const snap = () => ({ pop: [0,1,2,3].map(t => units.filter(u => u.team === t).length), b: [0,1,2,3].map(t => buildings.filter(x => x.team === t).length), tl: [0,1,2,3].map(t => techLevel(t)) });
    const out = { nP, sides, pers: aiPers, start: snap() };
    for (let i = 0; i < 3600 * 8; i++) update();
    out.at8 = snap();
    out.allyFire = (() => { // an AI must never target its ally
      const a = units.find(u => u.team === 1 && UNITS[u.type].cls !== 'worker');
      const b = units.find(u => u.team === 2);
      return a && b ? foe(a.team, b.team) : 'n/a';
    })();
    out.playerIsFoe = foe(0, 1) && foe(0, 2) && foe(0, 3);
    out.gameOver = gameOver;
    return out;
  });
  console.log(JSON.stringify(r));

  // personality divergence: rusher should attack earlier than turtle
  for (const p of ['rusher', 'turtle', 'economist']) {
    await page.goto(path);
    const d = await page.evaluate(pp => {
      newGame({ civ: 'alliance', opponents: [{ civ: 'dominion', pers: pp }], ai: 0.85, size: 56, theme: 'desert' });
      let firstAttackTick = null, peakArmy = 0, workersAt6 = 0;
      for (let i = 0; i < 3600 * 10; i++) {
        update();
        const army = units.filter(u => u.team === 1 && UNITS[u.type].cls !== 'worker' && UNITS[u.type].cls !== 'animal');
        peakArmy = Math.max(peakArmy, army.length);
        if (!firstAttackTick && army.some(u => Math.hypot(u.x - cx(buildings.find(b => b.team === 0 && b.type === 'hq') || { tx: 0, ty: 0, w: 1, h: 1 }), u.y - 0) < 1e9 && u.state === 'amove')) firstAttackTick = tick;
        if (i === 3600 * 6) workersAt6 = units.filter(u => u.team === 1 && u.type === 'worker').length;
      }
      return { pers: pp, firstWaveMin: firstAttackTick ? +(firstAttackTick / 3600).toFixed(1) : null, peakArmy, workersAt6, turrets: buildings.filter(b => b.team === 1 && b.type === 'turret').length, tl: techLevel(1) };
    }, p);
    console.log(JSON.stringify(d));
  }
  console.log('ERRORS:', errs.slice(0, 5));
  await browser.close();
})();
