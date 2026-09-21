const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 850 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/../public/index.html');
  await p.click('#maps button[data-mt="plateaus"]'); await p.click('#startbtn'); await p.waitForTimeout(200);
  console.log(JSON.stringify(await p.evaluate(() => {
    // pick a plateau interior tile that is high, free, and at least 3 tiles from any ramp
    let goal = null;
    for (let y = 3; y < MH - 3 && !goal; y++) for (let x = 3; x < MW - 3; x++) {
      const i = idx(x, y);
      if (height[i] !== 1 || ramp[i] || grid[i] !== 0) continue;
      let nearRamp = false;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (isRamp(x + dx, y + dy)) nearRamp = true;
      if (!nearRamp) { goal = [x, y]; break; }
    }
    if (!goal) return { note: 'no interior plateau tile found' };
    // put a trooper on low ground near the plateau
    let start = null;
    for (let r = 3; r < 14 && !start; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = goal[0] + dx, y = goal[1] + dy;
      if (!inMap(x, y) || height[idx(x, y)] !== 0 || grid[idx(x, y)] !== 0) continue;
      start = [x, y]; break;
    }
    const u = spawnUnit(0, 'trooper', start[0], start[1]);
    const path = findPath(start[0], start[1], goal[0], goal[1], 0);
    orderMove(u, goal[0], goal[1], false);
    let arrived = false, usedRamp = false;
    for (let i = 0; i < 4000; i++) {
      update();
      const t = ut(u);
      if (isRamp(t[0], t[1])) usedRamp = true;
      if (Math.abs(t[0] - goal[0]) <= 1 && Math.abs(t[1] - goal[1]) <= 1) { arrived = true; break; }
    }
    return { goal, start, pathLen: path ? path.length : null, arrived, usedRamp, endsHigh: hAt(...ut(u)) === 1, straightLine: Math.round(Math.hypot(goal[0] - start[0], goal[1] - start[1])) };
  })));
  console.log('ERRORS', errs);
  await b.close();
})();
