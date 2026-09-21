const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto('file://' + __dirname + '/../public/index.html');
  await page.click('#civs button:nth-child(2)'); // dominion
  await page.click('#sizes button[data-s="56"]');
  await page.click('#startbtn');
  await page.waitForTimeout(300);
  // select all workers via drag box
  const box = await page.evaluate(() => { const w = units.filter(u => u.team === 0); const xs = w.map(u => u.x - cam.x), ys = w.map(u => u.y - cam.y); return [Math.min(...xs) - 20, Math.min(...ys) - 20, Math.max(...xs) + 20, Math.max(...ys) + 20]; });
  await page.mouse.move(box[0], box[1]); await page.mouse.down(); await page.mouse.move(box[2], box[3], { steps: 5 }); await page.mouse.up();
  await page.waitForTimeout(250);
  console.log('sel', await page.evaluate(() => sel.length + ' cmds:' + currentCmds.map(c => c.hot).join('')));
  await page.keyboard.press('b'); await page.waitForTimeout(200);
  console.log('eco menu', await page.evaluate(() => currentCmds.map(c => c.label).join('|')));
  // place power core at valid spot
  const spot = await page.evaluate(() => { const s = findBuildSpot(0, 'core'); return [s[0] * TILE + 32 - cam.x, s[1] * TILE + 32 - cam.y]; });
  await page.mouse.move(spot[0], spot[1]); await page.keyboard.press('p'); await page.waitForTimeout(100); await page.mouse.click(spot[0], spot[1]); await page.waitForTimeout(150);
  // wall drag
  const w0 = await page.evaluate(() => { const hq = buildings[0]; return [(hq.tx - 2) * TILE + 16 - cam.x, (hq.ty - 3) * TILE + 16 - cam.y]; });
  await page.evaluate(() => { sel = units.filter(u => u.team === 0); menu = 'eco'; lastCmdKey = ''; refreshPanel(); });
  await page.keyboard.press('w'); await page.waitForTimeout(100);
  await page.mouse.move(w0[0], w0[1]); await page.mouse.down(); await page.mouse.move(w0[0] + 6 * 32, w0[1], { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(150);
  console.log('placed', await page.evaluate(() => ({ placing, b: buildings.filter(b => b.team === 0).map(b => b.type).join(','), res: res[0], states: units.filter(u => u.team === 0).map(u => u.state).join(',') })));
  // troop center at valid spot near core
  await page.evaluate(() => { const s = findBuildSpot(0, 'hq'); res[0].carbon += 500; const b = placeBuilding(0, 'troop', s[0], s[1], false); pay(0, BLD.troop.cost); units.filter(u => u.team === 0 && u.type === 'worker').forEach(w => orderBuild(w, b)); window.__gb.step(60 * 40); });
  console.log('after build', await page.evaluate(() => ({ b: buildings.filter(b => b.team === 0).map(b => b.type + (b.done ? '' : '*') + (b.powered ? '' : '!')).join(','), states: units.filter(u => u.team === 0).map(u => u.state + ':' + u.ctype).join(',') })));
  // select HQ, research tech2, train workers
  await page.evaluate(() => { res[0].food += 1000; res[0].nova += 500; sel = [buildings[0]]; lastCmdKey = ''; refreshPanel(); });
  await page.keyboard.press('t'); await page.keyboard.press('q'); await page.keyboard.press('q'); await page.waitForTimeout(100);
  console.log('hq queue', await page.evaluate(() => buildings[0].queue.join(',') + ' msgs:' + msgs.map(m => m.t).join('|')));
  // cancel one via panel
  await page.evaluate(() => { const q = document.querySelector('#info .q[data-i="2"]'); if (q) q.dispatchEvent(new MouseEvent('mousedown')); });
  console.log('after cancel', await page.evaluate(() => buildings[0].queue.join(',')));
  await page.evaluate(() => { window.__gb.step(60 * 60); });
  console.log('tech', await page.evaluate(() => ({ tl: techLevel(0), u: units.filter(u => u.team === 0).length })));
  // train troopers at troop center, set rally, attack move toward enemy, verify fog hides enemy
  await page.evaluate(() => { const tc = buildings.find(b => b.team === 0 && b.type === 'troop'); for (let i = 0; i < 5; i++) console.log(tryTrain(tc, 'trooper')); tc.rally = { x: tc.tx + 6, y: tc.ty }; window.__gb.step(60 * 50); });
  const vis0 = await page.evaluate(() => ({ visEnemy: units.filter(u => u.team === 1 && visibleE(u)).length, enemyB: buildings.filter(b => b.team === 1 && visibleE(b)).length, troopers: units.filter(u => u.team === 0 && u.type === 'trooper').map(u => u.state + '@' + ut(u)) }));
  console.log('fog', JSON.stringify(vis0));
  await page.screenshot({ path: __dirname + '/t2_a.png' });
  // save & load roundtrip
  await page.evaluate(() => saveGame());
  const before = await page.evaluate(() => ({ u: units.length, b: buildings.length, r: resources.length, tick }));
  await page.evaluate(() => loadGame());
  const after = await page.evaluate(() => ({ u: units.length, b: buildings.length, r: resources.length, tick }));
  console.log('save/load', JSON.stringify(before), JSON.stringify(after));
  await page.evaluate(() => window.__gb.step(600));
  // convert test: spawn mystic near an enemy trooper
  const conv = await page.evaluate(() => { techs[0].add('tech3'); const hq = buildings[0]; const e = spawnUnit(1, 'trooper', hq.tx + 8, hq.ty + 8); e.state = 'idle'; const m = spawnUnit(0, 'mystic', hq.tx + 6, hq.ty + 8); orderAttack(m, e); for (let i = 0; i < 400; i++) { update(); e.state = 'idle'; e.target = null; } return { team: e.team, mstate: m.state }; });
  console.log('convert', JSON.stringify(conv));
  // artillery min range & hunting
  const hunt = await page.evaluate(() => { const hq = buildings[0]; const g = spawnUnit(2, 'grazer', hq.tx + 8, hq.ty + 10); const w = units.find(u => u.team === 0 && u.type === 'worker'); orderAttack(w, g); for (let i = 0; i < 900; i++) update(); return { gdead: g.dead, wstate: w.state, ctype: w.ctype, carcass: resources.filter(r => r.carcass).length }; });
  console.log('hunt', JSON.stringify(hunt));
  await page.screenshot({ path: __dirname + '/t2_b.png' });
  // guide
  await page.keyboard.press('F1'); await page.waitForTimeout(100);
  console.log('guide rows', await page.evaluate(() => document.querySelectorAll('#guide tr').length));
  await page.screenshot({ path: __dirname + '/t2_guide.png' });
  console.log('ERRORS:', errors);
  await browser.close();
})();
