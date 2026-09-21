const { chromium } = require('playwright');
const path = 'file://' + __dirname + '/../public/index.html';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 850 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await page.goto(path);
  await page.click('#maps button[data-mt="plateaus"]');
  await page.click('#sizes button[data-s="72"]');
  await page.click('#startbtn');
  await page.waitForTimeout(250);

  // --- cliffs block ground, ramps let it through
  console.log('elevation', JSON.stringify(await page.evaluate(() => {
    // find a high tile with a low neighbour that is NOT a ramp
    let cliff = null, rampT = null;
    for (let y = 2; y < MH - 2 && !cliff; y++) for (let x = 2; x < MW - 2; x++) {
      const i = idx(x, y);
      if (height[i] === 1 && !ramp[i] && hAt(x, y + 1) === 0 && !isRamp(x, y + 1)) { cliff = [x, y]; break; }
    }
    for (let i = 0; i < MW * MH && !rampT; i++) if (ramp[i]) rampT = [i % MW, (i / MW) | 0];
    const res2 = {};
    if (cliff) {
      res2.cliffStepBlocked = !canStep(cliff[0], cliff[1], cliff[0], cliff[1] + 1);
      // a ground unit standing below cannot walk straight up
      const u = spawnUnit(0, 'trooper', cliff[0], cliff[1] + 2);
      if (u) { const p = findPath(cliff[0], cliff[1] + 2, cliff[0], cliff[1], 0); res2.pathUpLen = p ? p.length : null; kill(u); }
    }
    if (rampT) res2.rampStepOk = canStep(rampT[0], rampT[1], rampT[0], rampT[1] + 1) || canStep(rampT[0], rampT[1], rampT[0] + 1, rampT[1]);
    // high ground damage bonus
    const hiTile = rampT, loTile = [rampT[0], rampT[1] + 3];
    const hi = spawnUnit(0, 'trooper', 0, 0), lo = spawnUnit(1, 'trooper', 0, 0);
    if (hi && lo) {
      let hx = null; for (let i = 0; i < MW * MH; i++) if (height[i] === 1 && !ramp[i]) { hx = [i % MW, (i / MW) | 0]; break; }
      hi.x = hx[0] * 32 + 16; hi.y = hx[1] * 32 + 16;
      let lx = null; for (let i = 0; i < MW * MH; i++) if (height[i] === 0 && grid[i] === 0) { lx = [i % MW, (i / MW) | 0]; break; }
      lo.x = lx[0] * 32 + 16; lo.y = lx[1] * 32 + 16;
      res2.downhill = calcDmg(hi, lo); res2.uphill = calcDmg(lo, hi);
      kill(hi); kill(lo);
    }
    return res2;
  })));

  // --- garrison: troops enter a building, shoot out, and pop when it dies
  console.log('garrison', JSON.stringify(await page.evaluate(() => {
    const hq = buildings.find(b => b.team === 0 && b.type === 'hq');
    const troops = []; for (let i = 0; i < 4; i++) { const u = spawnUnit(0, 'trooper', hq.tx + 1 + i, hq.ty + 5); if (u) troops.push(u); }
    sel = troops.slice(); troops.forEach(u => applyOrder(u, cx(hq), cy(hq), hq));
    const unitsBefore = units.length;
    for (let i = 0; i < 400; i++) update();
    const inside = hq.gar.length;
    const popWith = popUsed(0);
    // an enemy walks up; the garrison should shoot it
    const e = spawnUnit(1, 'trooper', hq.tx + 3, hq.ty + 4); e.stance = 'passive';
    const hp0 = e.hp;
    for (let i = 0; i < 240; i++) { update(); e.target = null; e.state = 'idle'; }
    const shotAt = e.dead || e.hp < hp0;
    // unload
    const out = ungarrison(hq);
    return { inside, unitsRemoved: unitsBefore - units.length + out.length - out.length, popCountsGarrison: popWith >= 4, garrisonShoots: shotAt, unloaded: out.length, backInUnits: units.filter(u => out.includes(u)).length };
  })));

  // --- building death ejects the garrison at half health
  console.log('eject', JSON.stringify(await page.evaluate(() => {
    const sh = placeBuilding(0, 'shelter', 6, MH - 16, true);
    const t = []; for (let i = 0; i < 3; i++) { const u = spawnUnit(0, 'trooper', 8 + i, MH - 14); if (u) { u.hp = u.maxHp; t.push(u); garrisonUnit(u, sh); } }
    const n = sh.gar.length;
    kill(sh);
    for (let i = 0; i < 5; i++) update();
    const back = units.filter(u => t.includes(u));
    return { garrisoned: n, ejected: back.length, halfHp: back.every(u => u.hp <= u.maxHp * 0.5 + 1) };
  })));

  // --- transport: load, fly over a cliff, unload
  console.log('transport', JSON.stringify(await page.evaluate(() => {
    techs[0].add('tech2');
    const hq = buildings.find(b => b.team === 0 && b.type === 'hq');
    const d = spawnUnit(0, 'dropship', hq.tx + 6, hq.ty - 2);
    const troops = []; for (let i = 0; i < 3; i++) { const u = spawnUnit(0, 'trooper', hq.tx + 5 + i, hq.ty - 1); if (u) troops.push(u); }
    sel = troops.slice(); troops.forEach(u => applyOrder(u, d.x, d.y, d));
    for (let i = 0; i < 400; i++) update();
    const loaded = d.gar.length;
    // fly to a high plateau tile that ground units cannot reach directly
    let hx = null; for (let i = 0; i < MW * MH; i++) if (height[i] === 1 && !ramp[i] && grid[i] === 0) { hx = [i % MW, (i / MW) | 0]; break; }
    orderMove(d, hx[0], hx[1], false);
    for (let i = 0; i < 1200; i++) update();
    const arrived = Math.hypot(d.x - (hx[0] * 32 + 16), d.y - (hx[1] * 32 + 16)) < 48;
    const out = ungarrison(d);
    const onHigh = out.filter(u => hAt(...ut(u)) === 1).length;
    return { loaded, arrived, unloaded: out.length, landedOnHighGround: onHigh, dropCanFly: UNITS.dropship.fly };
  })));

  // --- save/load keeps elevation and garrison
  console.log('save/load', JSON.stringify(await page.evaluate(() => {
    const hq = buildings.find(b => b.team === 0 && b.type === 'hq');
    const u = spawnUnit(0, 'trooper', hq.tx + 1, hq.ty + 5); garrisonUnit(u, hq);
    const before = { gar: hq.gar.length, hi: height.reduce((a, b) => a + b, 0), mt: mapType };
    saveGame(); loadGame();
    const hq2 = buildings.find(b => b.team === 0 && b.type === 'hq');
    return { before, after: { gar: hq2.gar.length, hi: height.reduce((a, b) => a + b, 0), mt: mapType } };
  })));
  console.log('ERRORS:', errs.slice(0, 5));
  await browser.close();
})();
