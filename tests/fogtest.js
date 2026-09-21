const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 850 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file://' + __dirname + '/../public/index.html');
  await p.click('#opps button[data-o="3"]'); await p.click('#startbtn'); await p.waitForTimeout(200);

  console.log('all teams remembered', JSON.stringify(await p.evaluate(() => {
    const out = {};
    for (const t of [1, 2, 3]) {
      const hq = buildings.find(x => x.team === t && x.type === 'hq');
      // scout it with a flyer, then fly away
      const s = spawnUnit(0, 'fighter', hq.tx + 2, hq.ty + 6);
      for (let i = 0; i < 300 && !memBld.has(hq.id); i++) { s.x = cx(hq); s.y = cy(hq); update(); }
      out['team' + t + 'Remembered'] = memBld.has(hq.id);
      kill(s);
      for (let i = 0; i < 20; i++) update();
      out['team' + t + 'GhostKept'] = memBld.has(hq.id);
      out['team' + t + 'LiveHidden'] = !visibleE(hq);
    }
    return out;
  })));

  console.log('ghost is frozen, not live', JSON.stringify(await p.evaluate(() => {
    const hq = buildings.find(x => x.team === 1 && x.type === 'hq');
    const g = memBld.get(hq.id);
    const before = { ...g };
    const hpBefore = hq.hp;
    hq.hp = 200;                       // damage it while unobserved
    for (let i = 0; i < 40; i++) update();
    const after = memBld.get(hq.id);
    return { snapshotUnchanged: after.tx === before.tx && after.type === before.type, ghostHasNoHp: after.hp === undefined, liveHpHidden: !visibleE(hq), hpBefore, hpNow: hq.hp };
  })));

  console.log('destroyed while unseen stays ghosted, clears on look', JSON.stringify(await p.evaluate(() => {
    const hq = buildings.find(x => x.team === 1 && x.type === 'hq');
    const id = hq.id;
    kill(hq);
    for (let i = 0; i < 40; i++) update();
    const stillGhosted = memBld.has(id);
    // now go and look
    const s = spawnUnit(0, 'fighter', 5, 5);
    const g = memBld.get(id);
    for (let i = 0; i < 200 && memBld.has(id); i++) { s.x = (g.tx + 1) * 32; s.y = (g.ty + 1) * 32; update(); }
    return { stillGhostedWhileAway: stillGhosted, clearedAfterLooking: !memBld.has(id) };
  })));

  console.log('right-clicking a ghost attack-moves', JSON.stringify(await p.evaluate(() => {
    const hq = buildings.find(x => x.team === 2 && x.type === 'hq');
    const s = spawnUnit(0, 'fighter', hq.tx + 2, hq.ty + 6);
    for (let i = 0; i < 300 && !memBld.has(hq.id); i++) { s.x = cx(hq); s.y = cy(hq); update(); }
    kill(s); for (let i = 0; i < 20; i++) update();
    const t = spawnUnit(0, 'trooper', 6, MH - 8);
    sel = [t];
    issueOrder(cx(hq), cy(hq), false);
    return { ghostExists: !!ghostAt(cx(hq), cy(hq)), state: t.state, hasDest: !!t.dest };
  })));
  console.log('ERRORS:', errs.slice(0, 4));
  await b.close();
})();
