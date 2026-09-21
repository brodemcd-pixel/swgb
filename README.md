# Galactic Battlegrounds Lite

A real-time strategy game that runs entirely in the browser. One self-contained HTML
file, no dependencies, no server, no build tooling required to play.

```sh
./build.sh                                  # -> public/index.html
cd public && python3 -m http.server 8000    # open http://localhost:8000
```

Deployment is covered in [DEPLOY.md](DEPLOY.md) — this repo is set up for Netlify, but
the built `public/` folder works on any static host.

## The game

Gather Food, Carbon, Ore and Nova. Advance through four Tech Levels, keep your
production powered, research upgrades, and destroy every enemy Command Center and
military building.

- **Four civilisations**, each with bonuses and a unique unit
- **Twelve unit types** with a rock-paper-scissors counter system — Anti-Air beats
  aircraft, Mech Destroyers beat mechs, Artillery and Bombers beat buildings, Mystics
  convert enemy units outright
- **Elevation** with ramps: cliffs are walls, shooting downhill hits 25% harder
- **Garrisoning** troops into buildings, and Dropships to carry them over terrain
- **Unit stances** — Aggressive, Defensive, Hold Position, Passive — plus patrol,
  attack-move and queued orders
- **A six-mission campaign** with objectives and scripted events, and skirmish against
  up to three allied opponents with distinct AI personalities
- Fog of war, four map types, three terrain themes, save/load

Press **F1** in game for the full guide: every unit, building, upgrade and control.

## Controls

| | |
| --- | --- |
| Left click / drag | Select |
| Right click | Move, gather, attack, build, garrison, set rally |
| Shift + right click | Queue orders |
| Arrows / screen edge | Scroll · **Wheel** zooms |
| Space | Jump to base |
| `.` `,` `/` | Cycle idle workers / army / production buildings |
| Shift+1-5 / 1-5 | Set and recall control groups |
| F2 · F1 · Esc | Pause · Guide · Cancel |

## Editing

Source is in `src/`, one file per responsibility. `build.sh` concatenates it into
`public/index.html` — that is the entire build. There is no bundler and no module
system: every file shares one scope, exactly as if you had one long `<script>`. That is
deliberate, and it is why the shipped artifact is a single portable file.

| File | What lives there |
| --- | --- |
| `01-shell.html` | Document head, all CSS, the DOM |
| `02-data.js` | Civilisations, unit/building/research tables, themes, AI personalities |
| `10-state.js` | Global state, team & alliance helpers, utilities |
| `11-map.js` | Map generation, elevation and ramps, resources, terrain canvas |
| `12-path.js` | A* pathfinding, including elevation rules |
| `13-entities.js` | Spawning, movement, projectiles, damage, death |
| `14-fog.js` | Power coverage, fog of war and remembered buildings, shields |
| `15-orders.js` | Orders and production commands |
| `16-behaviour.js` | Unit state machine, building production, crowd separation |
| `20-campaign.js` | Mission helpers, the six missions, campaign progress |
| `30-ai.js` | The computer opponent |
| `31-update.js` | The simulation tick |
| `32-render.js` | All drawing |
| `33-ui.js` | Command panel, tooltips, selection grid, objectives, guide |
| `34-sound.js` | Synthesised sound effects |
| `35-save.js` | Save/load |
| `36-input.js` | Mouse, keyboard, start screen |
| `37-loop.js` | Animation loop and the `window.__gb` debug handle |

### Common edits

**Balance** — every number is in `src/02-data.js`: `UNITS`, `BLD`, `TECHS`, `CIVS`,
`AI_TYPES`. Nothing else needs touching to retune the game.

**A new unit** — add an entry to `UNITS`, list it in the `trains` array of the building
that makes it, and add a `case` to the sprite switch in `src/32-render.js`. Menus,
tooltips, the guide and the AI's counter logic all read from the table.

**A new mission** — append an object to `MISSIONS` in `src/20-campaign.js`. A mission is
`setup()`, `objectives[]`, `triggers[]` (fire at a tick or when a condition goes true)
and `win`/`lose` predicates.

**Custom art** — no code change needed. Select a unit in game and drag an image file
onto the map, or call `setSprite('heavy','walker.png',{mode:'rotate',scale:1.2})` from
the console. `clearSprites()` reverts.

## Tests

`tests/` drives the real game headlessly in Chromium. Run `./build.sh` first — the tests
load `public/index.html`.

```sh
npm i -D playwright && npx playwright install chromium
./build.sh && node tests/phase3.js
```

| Script | Covers |
| --- | --- |
| `test.js` | Long AI simulation, per-tick cost |
| `test2.js` | Building, training, research, hunting, save/load round-trip |
| `zoomtest.js` | Zoom, selection and orders at zoom, sprite API |
| `stancetest.js` | Stances, leashing, patrol, artillery shells, selection grid |
| `camptest.js` | All six missions boot and evaluate objectives |
| `winlose.js` | Mission win/lose paths and campaign unlock progression |
| `multi.js` | Multiple allied opponents, AI personality divergence |
| `phase3.js` | Cliffs, ramps, high ground, garrison, transports |
| `fogtest.js` | Remembered enemy buildings behave correctly |
| `ramp.js` | Ground units route around cliffs to a ramp |

## Notes on the simulation

The tick is fixed at 1/60s and the loop runs up to six catch-up ticks per frame; the
renderer reads state and never mutates it, so the simulation is frame-rate independent.
Crowd separation buckets units into a reused spatial grid rather than comparing every
pair, the per-tick list cleanups compact in place so a busy tick allocates nothing, and
a per-tick budget caps how many A* searches run in one tick so a large group order
spreads over a few frames instead of spiking. Median tick is about 0.1 ms with 100
units.

## Known limitations

- **Desktop only.** Keyboard and mouse, with right-click as a core control. Phones and
  tablets are not supported.
- **Balance is untuned.** The numbers were set by judgement, not by measured play.
- All art is original. No third-party assets are used or included.
