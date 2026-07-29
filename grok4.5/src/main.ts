/**
 * Entry point — Phase 4: breaching charges + enemy reaction.
 */

import GUI, { type Controller } from 'lil-gui';
import { GameManager } from './game/GameManager';
import {
  BREACH_CHARGE_COUNT,
  DEFAULT_SEED,
  DEFAULT_TIME_SCALE,
  OXYGEN_MAX,
  PLAYER_MAX_HEALTH,
} from './shared/constants';

function main(): void {
  const canvas = document.getElementById('game-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('#game-canvas not found');
  }

  const seedDisplay = document.getElementById('seed-display');
  const updateSeedDisplay = (seed: number): void => {
    if (seedDisplay) {
      seedDisplay.textContent = `seed: ${seed}`;
    }
  };

  const game = new GameManager(canvas);
  game.onSeedChanged = (seed) => {
    updateSeedDisplay(seed);
    game.rng.setSeed(seed);
    // Rebuild procedural floor when seed changes
    game.interiorState?.interiorScene?.rebuildFromSeed(seed);
    console.log(`[debug] seed=${seed} → floor regenerated`);
  };
  updateSeedDisplay(game.seed);

  const gui = new GUI({ title: 'Debug' });

  const debug = {
    seed: DEFAULT_SEED,
    timeScale: DEFAULT_TIME_SCALE,
    showGrid: false,
    angledCamera: false,
    showStickArrows: true,
    speed: '0.00',
    velX: '0.00',
    velZ: '0.00',
    moveX: '0.00',
    moveZ: '0.00',
    aimX: '0.00',
    aimZ: '0.00',
    rawMoveX: '0.00',
    rawMoveY: '0.00',
    rawAimX: '0.00',
    rawAimY: '0.00',
    inputSource: 'none',
    facingDeg: '0.0',
    fire: 'false',
    health: String(PLAYER_MAX_HEALTH),
    enemies: '0',
    projectiles: '0',
    rooms: '0',
    pathOk: '—',
    breachable: '0',
    charges: String(BREACH_CHARGE_COUNT),
    fuse: '0.00',
    canPlant: 'no',
    oxygen: String(OXYGEN_MAX),
    vacuum: 'no',
    magBoots: 'off',
    hullHoles: '0',
    goInterior: () => game.transitionTo('Interior'),
    goResults: () => game.transitionTo('Results'),
    restart: () => game.interiorState?.interiorScene?.restartEncounter(),
    nextSeed: () => {
      debug.seed = (debug.seed + 1) >>> 0;
      game.seed = debug.seed;
    },
    randomSeed: () => {
      debug.seed = (Math.random() * 0xffffffff) >>> 0;
      game.seed = debug.seed;
    },
  };

  gui
    .add(debug, 'seed')
    .name('Seed')
    .step(1)
    .onChange((value: number) => {
      game.seed = value;
    });

  gui
    .add(debug, 'timeScale', 0, 2, 0.05)
    .name('Time scale')
    .onChange((value: number) => {
      game.timeScale = value;
    });

  gui
    .add(debug, 'showGrid')
    .name('Show grid')
    .onChange((value: boolean) => {
      game.showGrid = value;
    });

  const camFolder = gui.addFolder('Camera');
  camFolder
    .add(debug, 'angledCamera')
    .name('Angled camera')
    .onChange((value: boolean) => {
      game.interiorState?.interiorScene?.setAngledCamera(value);
    });
  camFolder
    .add(debug, 'showStickArrows')
    .name('Stick arrows')
    .onChange((value: boolean) => {
      const scene = game.interiorState?.interiorScene;
      if (scene) scene.showStickArrows = value;
    });

  const liveControllers: Controller[] = [];
  const moveFolder = gui.addFolder('Movement (live)');
  liveControllers.push(moveFolder.add(debug, 'speed').name('Speed'));
  liveControllers.push(moveFolder.add(debug, 'velX').name('Vel X'));
  liveControllers.push(moveFolder.add(debug, 'velZ').name('Vel Z'));
  liveControllers.push(moveFolder.add(debug, 'facingDeg').name('Facing °'));
  moveFolder.open();

  const stickFolder = gui.addFolder('Sticks (live)');
  liveControllers.push(stickFolder.add(debug, 'inputSource').name('Source'));
  liveControllers.push(stickFolder.add(debug, 'moveX').name('Move X'));
  liveControllers.push(stickFolder.add(debug, 'moveZ').name('Move Z'));
  liveControllers.push(stickFolder.add(debug, 'aimX').name('Aim X'));
  liveControllers.push(stickFolder.add(debug, 'aimZ').name('Aim Z'));
  liveControllers.push(stickFolder.add(debug, 'fire').name('Fire'));
  stickFolder.open();

  const combatFolder = gui.addFolder('Combat (live)');
  liveControllers.push(combatFolder.add(debug, 'health').name('Health'));
  liveControllers.push(combatFolder.add(debug, 'enemies').name('Enemies'));
  liveControllers.push(combatFolder.add(debug, 'projectiles').name('Projectiles'));
  combatFolder.add(debug, 'restart').name('Restart encounter');
  combatFolder.open();

  const breachFolder = gui.addFolder('Breach / Vacuum');
  liveControllers.push(breachFolder.add(debug, 'charges').name('Charges left'));
  liveControllers.push(breachFolder.add(debug, 'fuse').name('Fuse left'));
  liveControllers.push(breachFolder.add(debug, 'canPlant').name('Can plant'));
  liveControllers.push(breachFolder.add(debug, 'breachable').name('Breachable left'));
  liveControllers.push(breachFolder.add(debug, 'oxygen').name('Oxygen'));
  liveControllers.push(breachFolder.add(debug, 'vacuum').name('In vacuum'));
  liveControllers.push(breachFolder.add(debug, 'magBoots').name('Mag-boots'));
  liveControllers.push(breachFolder.add(debug, 'hullHoles').name('Hull holes'));
  breachFolder.open();

  const floorFolder = gui.addFolder('Floor');
  liveControllers.push(floorFolder.add(debug, 'rooms').name('Rooms'));
  liveControllers.push(floorFolder.add(debug, 'pathOk').name('Path OK'));
  floorFolder.add(debug, 'nextSeed').name('Next seed');
  floorFolder.add(debug, 'randomSeed').name('Random seed');
  floorFolder.open();

  const stateFolder = gui.addFolder('State');
  stateFolder.add(debug, 'goInterior').name('→ Interior');
  stateFolder.add(debug, 'goResults').name('→ Results');

  // Health + charges (minimal HUD)
  const healthHud = document.createElement('div');
  healthHud.id = 'health-hud';
  healthHud.innerHTML = `
    <div class="hp-label">HP</div>
    <div class="hp-track"><div class="hp-fill" id="hp-fill"></div></div>
    <div class="hp-num" id="hp-num">${PLAYER_MAX_HEALTH}</div>
    <div class="o2-label">O₂</div>
    <div class="hp-track o2-track"><div class="hp-fill o2-fill" id="o2-fill"></div></div>
    <div class="hp-num" id="o2-num">${OXYGEN_MAX}</div>
    <div class="charges-label" id="charges-label">CHG ${BREACH_CHARGE_COUNT}</div>
    <div class="status-pill" id="mag-pill">BOOTS</div>
    <div class="status-pill vac" id="vac-pill">VACUUM</div>
    <div class="plant-hint" id="plant-hint"></div>
  `;
  document.getElementById('app')?.appendChild(healthHud);

  const stickHud = document.createElement('div');
  stickHud.id = 'stick-hud';
  stickHud.innerHTML = `
    <div class="live-readout" id="live-readout">waiting…</div>
    <div class="stick-row">
      <div class="stick-box" id="stick-move"><div class="stick-nub" id="nub-move"></div><span>L</span></div>
      <div class="stick-box" id="stick-aim"><div class="stick-nub" id="nub-aim"></div><span>R</span></div>
    </div>
  `;
  Object.assign(stickHud.style, {
    position: 'absolute',
    left: '12px',
    bottom: '48px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: '5',
    pointerEvents: 'none',
  } as CSSStyleDeclaration);
  document.getElementById('app')?.appendChild(stickHud);

  const style = document.createElement('style');
  style.textContent = `
    #health-hud {
      position: absolute; top: 12px; left: 12px; z-index: 5;
      display: flex; align-items: center; gap: 8px;
      pointer-events: none;
      color: #c8d0e0; font: 12px ui-monospace, monospace;
    }
    .hp-track {
      width: 140px; height: 12px; background: rgba(0,0,0,0.55);
      border: 1px solid #4a6080; border-radius: 3px; overflow: hidden;
    }
    .hp-fill {
      height: 100%; width: 100%; background: linear-gradient(90deg, #22cc66, #88ffaa);
      transform-origin: left center; transition: width 0.05s linear;
    }
    .hp-fill.low { background: linear-gradient(90deg, #cc2222, #ff6644); }
    .charges-label {
      margin-left: 10px; color: #ffaa44; font-weight: bold;
      background: rgba(0,0,0,0.45); padding: 2px 8px; border-radius: 3px;
      border: 1px solid #886622;
    }
    .plant-hint {
      margin-left: 8px; color: #88ffaa; font-weight: bold;
      min-width: 120px;
    }
    .plant-hint.ready { color: #ffee66; text-shadow: 0 0 8px #ffaa00; }
    .plant-hint.danger { color: #66ccff; text-shadow: 0 0 10px #2288ff; }
    .o2-label { margin-left: 10px; }
    .o2-track { border-color: #3a7090; }
    .o2-fill { background: linear-gradient(90deg, #2288cc, #66ddff); }
    .o2-fill.low { background: linear-gradient(90deg, #cc4400, #ff8844); }
    .status-pill {
      margin-left: 8px; padding: 2px 8px; border-radius: 3px;
      border: 1px solid #445; background: rgba(0,0,0,0.4);
      opacity: 0.25; font-weight: bold; font-size: 11px;
    }
    .status-pill.on { opacity: 1; border-color: #44ffaa; color: #44ffaa; }
    .status-pill.vac.on { border-color: #66aaff; color: #88ccff; background: rgba(20,40,80,0.6); }
    .live-readout {
      color: #c8d0e0;
      font: 12px ui-monospace, monospace;
      background: rgba(0,0,0,0.55);
      padding: 4px 8px;
      border-radius: 4px;
      min-width: 260px;
    }
    .stick-row { display: flex; gap: 12px; }
    .stick-box {
      width: 72px; height: 72px; border-radius: 8px;
      border: 1px solid #4a6080; background: rgba(0,0,0,0.5);
      position: relative;
    }
    .stick-box span {
      position: absolute; bottom: 2px; right: 4px;
      color: #8090a8; font: 11px ui-monospace, monospace;
    }
    .stick-nub {
      width: 14px; height: 14px; border-radius: 50%;
      background: #33e0ff; position: absolute;
      left: 50%; top: 50%; transform: translate(-50%, -50%);
      box-shadow: 0 0 6px #33e0ff;
      will-change: transform;
    }
    #nub-aim { background: #ff6644; box-shadow: 0 0 6px #ff6644; }
  `;
  document.head.appendChild(style);

  const nubMove = document.getElementById('nub-move');
  const nubAim = document.getElementById('nub-aim');
  const liveReadout = document.getElementById('live-readout');
  const hpFill = document.getElementById('hp-fill');
  const hpNum = document.getElementById('hp-num');
  const chargesLabel = document.getElementById('charges-label');
  const plantHint = document.getElementById('plant-hint');
  const o2Fill = document.getElementById('o2-fill');
  const o2Num = document.getElementById('o2-num');
  const magPill = document.getElementById('mag-pill');
  const vacPill = document.getElementById('vac-pill');

  function syncDebugGui(): void {
    requestAnimationFrame(syncDebugGui);

    const d = game.phase1Debug;
    if (!d) {
      if (liveReadout) liveReadout.textContent = 'waiting for Interior…';
      return;
    }

    debug.speed = d.speed.toFixed(2);
    debug.velX = d.velX.toFixed(2);
    debug.velZ = d.velZ.toFixed(2);
    debug.moveX = d.moveX.toFixed(2);
    debug.moveZ = d.moveZ.toFixed(2);
    debug.aimX = d.aimX.toFixed(2);
    debug.aimZ = d.aimZ.toFixed(2);
    debug.rawMoveX = d.rawMoveX.toFixed(2);
    debug.rawMoveY = d.rawMoveY.toFixed(2);
    debug.rawAimX = d.rawAimX.toFixed(2);
    debug.rawAimY = d.rawAimY.toFixed(2);
    debug.inputSource = d.inputSource;
    debug.facingDeg = d.facingDeg.toFixed(1);
    debug.fire = d.fire ? 'true' : 'false';
    debug.health = d.playerHealth.toFixed(0);
    debug.enemies = String(d.enemyCount);
    debug.projectiles = String(d.projectileCount);
    debug.rooms = String(d.roomCount);
    debug.pathOk = d.pathOk ? 'yes' : 'NO';
    debug.breachable = String(d.breachableCount);
    debug.charges = String(d.charges);
    debug.fuse = d.fuseRemaining.toFixed(2);
    debug.canPlant = d.canPlant ? 'YES' : 'no';
    debug.oxygen = d.oxygen.toFixed(1);
    debug.vacuum = d.inVacuum ? 'YES' : 'no';
    debug.magBoots = d.magBoots ? 'ON' : 'off';
    debug.hullHoles = String(d.hullBreaches);

    for (const c of liveControllers) {
      c.updateDisplay();
    }

    const hpPct = Math.max(0, Math.min(1, d.playerHealth / PLAYER_MAX_HEALTH));
    if (hpFill) {
      hpFill.style.width = `${hpPct * 100}%`;
      hpFill.classList.toggle('low', hpPct < 0.35);
    }
    if (hpNum) hpNum.textContent = String(Math.round(d.playerHealth));

    const o2Pct = Math.max(0, Math.min(1, d.oxygen / d.oxygenMax));
    if (o2Fill) {
      o2Fill.style.width = `${o2Pct * 100}%`;
      o2Fill.classList.toggle('low', o2Pct < 0.3);
    }
    if (o2Num) o2Num.textContent = d.oxygen.toFixed(0);

    if (chargesLabel) {
      chargesLabel.textContent = `CHG ${d.charges}`;
      chargesLabel.style.opacity = d.charges <= 0 ? '0.45' : '1';
    }
    if (magPill) magPill.classList.toggle('on', d.magBoots);
    if (vacPill) vacPill.classList.toggle('on', d.inVacuum);

    if (plantHint) {
      if (d.fuseRemaining > 0) {
        plantHint.textContent = `FUSE ${d.fuseRemaining.toFixed(1)}s`;
        plantHint.className = d.plantIsOuterHull
          ? 'plant-hint danger'
          : 'plant-hint ready';
      } else if (d.canPlant) {
        plantHint.textContent = d.plantIsOuterHull
          ? 'E — OUTER HULL (VACUUM!)'
          : 'E — BREACH WALL';
        plantHint.className = d.plantIsOuterHull
          ? 'plant-hint danger'
          : 'plant-hint ready';
      } else {
        plantHint.textContent = '';
        plantHint.className = 'plant-hint';
      }
    }

    if (liveReadout) {
      liveReadout.textContent =
        `O₂ ${d.oxygen.toFixed(0)} | vac ${d.inVacuum ? 'Y' : 'n'} | boots ${d.magBoots ? 'ON' : 'off'} | CHG ${d.charges} | holes ${d.hullBreaches}`;
    }

    if (seedDisplay) {
      seedDisplay.textContent = `seed: ${d.layoutSeed} · holes ${d.hullBreaches} · O₂ ${d.oxygen.toFixed(0)}`;
    }

    placeNub(nubMove, d.rawMoveX, d.rawMoveY);
    placeNub(nubAim, d.rawAimX, d.rawAimY);
  }

  console.log('[main] Phase 5 — outer hull vacuum / oxygen / mag-boots');
  console.log('[main] Blue-glow hull walls = outer charge targets (risk vacuum)');
  console.log('[main] Mag-boots: B or Shift (gamepad LB) · Plant: E · Fire: LMB');

  game.start();
  requestAnimationFrame(syncDebugGui);
}

function placeNub(
  el: HTMLElement | null,
  x: number,
  y: number,
): void {
  if (!el) return;
  const cx = Math.max(-1, Math.min(1, x));
  const cy = Math.max(-1, Math.min(1, y));
  const px = cx * 26;
  const py = cy * 26;
  el.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
}

main();
