const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto('file://' + __dirname + '/../public/index.html');
  await page.screenshot({ path: __dirname + '/s0.png' });
  await page.click('#startbtn');
  await page.waitForTimeout(400);
  await page.screenshot({ path: __dirname + '/s1.png' });
  const r = await page.evaluate(() => {
    const g = window.__gb; const log = [];
    const snap = (label) => log.push(label + ' ' + JSON.stringify({ res: g.res.map(r => Object.values(r).map(v => v | 0)), tl: [techLevel(0), techLevel(1)], u: [units.filter(u => u.team === 0).length, units.filter(u => u.team === 1).length, units.filter(u => u.team === 2).length], b1: buildings.filter(b => b.team === 1).map(b => b.type + (b.done ? '' : '*')).join(','), pow: buildings.filter(b => b.team === 1 && BLD[b.type].power && b.done).map(b => b.powered ? 1 : 0).join(''), techs: [...techs[1]].join(','), st: units.filter(u => u.team === 1 && u.type === 'worker').map(u => u.state[0] + (u.ctype || '')[0]).join(' '), gameOver }));
    for (let m = 1; m <= 16; m++) { g.step(3600); snap('m' + m); }
    return log;
  });
  console.log(r.join('\n'));
  await page.screenshot({ path: __dirname + '/s2.png' });
  const t = await page.evaluate(() => { const s = performance.now(); window.__gb.step(120); return (performance.now() - s) / 120; });
  console.log('ms per tick', t.toFixed(2));
  console.log('ERRORS:', errors);
  await browser.close();
})();
