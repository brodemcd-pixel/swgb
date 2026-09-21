const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto('file://' + __dirname + '/../public/index.html');
  await page.click('#sizes button[data-s="56"]'); await page.click('#startbtn');
  await page.waitForTimeout(300);
  // zoom in with wheel over a point, then check a click selects the unit under the cursor
  const r = await page.evaluate(() => {
    const w = units.find(u => u.team === 0 && u.type === 'worker');
    cam.x = w.x - VW / 2; cam.y = w.y - VH / 2; clampCam();
    return [w.x - cam.x, w.y - cam.y, w.id];
  });
  await page.mouse.move(r[0], r[1]);
  await page.mouse.wheel(0, -400); await page.waitForTimeout(150);
  const z = await page.evaluate(() => ({ zoom: +zoom.toFixed(3), VW: VW | 0, VH: VH | 0 }));
  console.log('after zoom in', JSON.stringify(z));
  // the point under the cursor should still be the same world point -> clicking selects that worker
  const pos = await page.evaluate(() => { const w = units.find(u => u.id === window.__wid); return null; });
  await page.evaluate(id => window.__wid = id, r[2]);
  const screenPt = await page.evaluate(() => { const w = units.find(u => u.id === window.__wid); return [(w.x - cam.x) * zoom, (w.y - cam.y) * zoom]; });
  await page.mouse.click(screenPt[0], screenPt[1]); await page.waitForTimeout(150);
  console.log('click-at-zoom selects', await page.evaluate(() => sel.length && sel[0].id === window.__wid));
  // box select at zoom
  await page.mouse.move(screenPt[0] - 80, screenPt[1] - 80); await page.mouse.down(); await page.mouse.move(screenPt[0] + 80, screenPt[1] + 80, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(120);
  console.log('box select at zoom', await page.evaluate(() => sel.length));
  // right-click order at zoom lands at cursor world point
  const before = await page.evaluate(() => { const u = sel[0]; return u ? [u.id] : null; });
  await page.mouse.click(screenPt[0] + 120, screenPt[1] + 60, { button: 'right' }); await page.waitForTimeout(150);
  console.log('order target', await page.evaluate(() => { const u = sel[0]; return u && u.dest ? JSON.stringify({ dest: u.dest, pulse: [Math.round(pulse.x / 32), Math.round(pulse.y / 32)] }) : 'none'; }));
  // zoom out fully, check clamp keeps map on screen
  await page.evaluate(() => { setZoom(0.55); });
  console.log('zoom out', await page.evaluate(() => ({ zoom: +zoom.toFixed(2), cam: [cam.x | 0, cam.y | 0], VW: VW | 0 })));
  await page.evaluate(() => setZoom(1));
  // sprite API: set a tiny data-uri sprite on trooper and verify it renders without error
  await page.evaluate(() => {
    const cvs2 = document.createElement('canvas'); cvs2.width = cvs2.height = 16;
    const c2 = cvs2.getContext('2d'); c2.fillStyle = '#f0f'; c2.fillRect(0, 0, 16, 16);
    setSprite('trooper', cvs2.toDataURL(), { mode: 'flip', scale: 1.3 });
    const hq = buildings[0]; for (let i = 0; i < 3; i++) spawnUnit(0, 'trooper', hq.tx + 5 + i, hq.ty + 5);
  });
  await page.waitForTimeout(400);
  console.log('sprite stored', await page.evaluate(() => ({ cfg: !!SPRITES.trooper, loaded: !!(SPRITE_IMG.trooper && SPRITE_IMG.trooper.ok), ls: !!localStorage.getItem('gbl_sprites') })));
  await page.waitForTimeout(200);
  await page.evaluate(() => { clearSprites(); });
  console.log('cleared', await page.evaluate(() => Object.keys(SPRITES).length));
  console.log('ERRORS:', errors);
  await browser.close();
})();
