const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 850 } });
  const errors = []; page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + '\n' + (e.stack||'').split('\n')[1]));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto('file://' + __dirname + '/../public/index.html');
  await page.click('#sizes button[data-s="56"]'); await page.click('#startbtn');
  await page.waitForTimeout(250);

  // --- HOLD POSITION: unit must not chase a distant enemy
  const hold = await page.evaluate(() => {
    const hq = buildings[0];
    const t = spawnUnit(0, 'trooper', hq.tx + 2, hq.ty + 8); t.stance = 'hold'; setPost(t);
    const e = spawnUnit(1, 'trooper', hq.tx + 12, hq.ty + 8); e.stance = 'passive';
    const start = [t.x, t.y];
    for (let i = 0; i < 400; i++) { update(); e.target = null; e.state = 'idle'; }
    return { moved: Math.round(Math.hypot(t.x - start[0], t.y - start[1])), state: t.state, enemyHp: e.hp };
  });
  console.log('hold-position', JSON.stringify(hold));

  // --- AGGRESSIVE: same setup, unit should close and kill
  const aggro = await page.evaluate(() => {
    const hq = buildings[0];
    const t = spawnUnit(0, 'trooper', hq.tx + 2, hq.ty + 10); t.stance = 'aggressive'; setPost(t);
    const e = spawnUnit(1, 'trooper', hq.tx + 9, hq.ty + 10); e.stance = 'passive';
    const start = [t.x, t.y];
    for (let i = 0; i < 700; i++) { update(); if (!e.dead) { e.target = null; e.state = 'idle'; } }
    return { moved: Math.round(Math.hypot(t.x - start[0], t.y - start[1])), enemyDead: e.dead, wrecks: wrecks.length };
  });
  console.log('aggressive', JSON.stringify(aggro));

  // --- DEFENSIVE: engages then returns to post (leash)
  const def = await page.evaluate(() => {
    const hq = buildings[0];
    const t = spawnUnit(0, 'trooper', hq.tx + 2, hq.ty + 12); t.stance = 'defensive'; setPost(t);
    const post = t.post.slice();
    const e = spawnUnit(1, 'mounted', hq.tx + 5, hq.ty + 12); e.stance = 'passive'; e.hp = 9999; e.maxHp = 9999;
    let maxDist = 0;
    for (let i = 0; i < 500; i++) {
      update(); e.target = null; e.state = 'idle';
      if (i === 120) { e.x += 25 * 32; } // enemy flees far away
      maxDist = Math.max(maxDist, Math.hypot(t.x - post[0], t.y - post[1]) / 32);
    }
    const back = Math.hypot(t.x - post[0], t.y - post[1]) / 32;
    return { maxLeashTiles: +maxDist.toFixed(1), backToPostTiles: +back.toFixed(1), state: t.state };
  });
  console.log('defensive-leash', JSON.stringify(def));

  // --- PATROL via UI
  await page.evaluate(() => {
    const hq = buildings[0];
    units.filter(u => u.team !== 0 || u.type !== 'worker').forEach(u => { if (u.team === 1) kill(u); });
    window.__p = spawnUnit(0, 'trooper', hq.tx + 3, hq.ty - 4);
    sel = [window.__p]; lastCmdKey = ''; refreshPanel();
    cam.x = window.__p.x - VW / 2; cam.y = window.__p.y - VH / 2; clampCam();
  });
  await page.keyboard.press('z'); await page.waitForTimeout(100);
  const sp = await page.evaluate(() => [(window.__p.x - cam.x) * zoom + 200, (window.__p.y - cam.y) * zoom]);
  await page.mouse.click(sp[0], sp[1]); await page.waitForTimeout(150);
  const pat = await page.evaluate(() => {
    const u = window.__p; const seen = new Set(); let flips = 0, last = u.pTo;
    for (let i = 0; i < 1400; i++) { update(); if (u.pTo !== last) { flips++; last = u.pTo; } seen.add(Math.round(u.x / 32)); }
    return { state: u.state, flips, spanTiles: seen.size, hasRoute: !!(u.pa && u.pb) };
  });
  console.log('patrol', JSON.stringify(pat));

  // --- ARTILLERY shell: travels, arcs, splashes a clump
  const arty = await page.evaluate(() => {
    const hq = buildings[0]; techs[0].add('tech2'); techs[0].add('tech3');
    const a = spawnUnit(0, 'artillery', hq.tx + 2, hq.ty + 16); a.stance = 'aggressive';
    const vics = []; for (let i = 0; i < 4; i++) { const v = spawnUnit(1, 'trooper', hq.tx + 9 + (i % 2), hq.ty + 16 + Math.floor(i / 2)); if (v) vics.push(v); }
    vics.forEach(v => { v.stance = 'passive'; });
    let sawShell = false, maxH = 0;
    for (let i = 0; i < 300; i++) {
      update(); vics.forEach(v => { if (!v.dead) { v.target = null; v.state = 'idle'; } });
      const sh = projectiles.find(p => p.shell); if (sh) { sawShell = true; maxH = Math.max(maxH, sh.h); } window.__mshake = Math.max(window.__mshake||0, shake);
    }
    return { sawShell, arcHeight: Math.round(maxH), hurt: vics.filter(v => v.dead || v.hp < v.maxHp).length, ofN: vics.length, peakShake: +(window.__mshake||0).toFixed(1) };
  });
  console.log('artillery-shell', JSON.stringify(arty));

  // --- selection grid + stance buttons through the UI
  await page.evaluate(() => {
    const hq = buildings[0];
    sel = []; for (let i = 0; i < 6; i++) { const u = spawnUnit(0, 'trooper', hq.tx + 6 + i, hq.ty - 6); if (u) sel.push(u); }
    lastCmdKey = ''; refreshPanel();
  });
  await page.waitForTimeout(150);
  console.log('grid present', await page.evaluate(() => { const c = document.getElementById('selcv'); return c ? c.width + 'x' + c.height : 'none'; }));
  await page.keyboard.press('h'); await page.waitForTimeout(120);
  console.log('stance via hotkey', await page.evaluate(() => sel.map(u => u.stance).join(',')));
  // click an icon to single out
  await page.evaluate(() => { const c = document.getElementById('selcv'); const r = c.getBoundingClientRect(); window.__gr = [r.left + 15, r.top + 15]; });
  const gr = await page.evaluate(() => window.__gr);
  await page.mouse.click(gr[0], gr[1]); await page.waitForTimeout(150);
  console.log('icon click selects one', await page.evaluate(() => sel.length));
  // idle production building cycle
  await page.evaluate(() => { res[0].carbon += 999; const s = findBuildSpot(0, 'troop'); placeBuilding(0, 'troop', s[0], s[1], true); });
  await page.keyboard.press('/'); await page.waitForTimeout(150);
  console.log('idle-building hotkey', await page.evaluate(() => ({ n: idleProd(0).length, selType: sel[0] && sel[0].type })));
  console.log('ERRORS:', errors);
  await browser.close();
})();
