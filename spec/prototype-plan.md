# First Prototype Plan  
**Procedural Space Battleship Co-op**  
*(Approach Phase deferred to a later prototype)*

**Goal of this prototype**  
Prove the core interior fantasy and feel as quickly as possible:  
Top-down (orthographic) ship traversal using 3D meshes → combat under pressure → deliberate breaching with risk → one environmental system (hull breach + suction) → plant bomb → extract under timer.  

Success criteria: A single player can complete a short, tense run on a procedurally generated floor that feels readable and fun even with pure geometric 3D placeholders. Architecture must be ready to grow into local multiplayer and later online co-op + the Approach phase.

---

## 1. Scope (What is in / out)

### In Scope
- One procedural floor viewed from a top-down / orthographic (or lightly angled) camera
- **All assets and environment built with 3D meshes** (characters, walls, props, effects)
- Grid-based movement + basic shooting on the horizontal plane
- Starter weapons: **Standard Rifle** + **Breaching Charge**
- Wall damage rules (Hybrid): Rifle chips internal walls only; outer hull is extremely resistant to Rifle; Breaching Charge opens both; **Grenades can damage outer hull** (and therefore risk permanent depressurization). Full grenade implementation may follow the core loop.
- 1–2 enemy types (simple chase + simple ranged) with relatively heavy / pressuring fire
- Basic “enemies become more aggressive when a breach starts” reaction
- One environmental system: **outer hull breach → depressurization + suction + limited oxygen**
- Mag-boots (simple toggle that strongly reduces suction at the cost of mobility)
- Cover is **static** in the prototype (suction affects characters only). Longer-term intention: movable/unsecured cover will be affected by suction and can injure characters if it hits them hard enough while moving.
- Bomb plant objective + extraction point + session timer
- Shared-seed generation (same seed = same floor layout, enemy placements, breach locations)
- Simple geometric 3D placeholders only (no external models required for the first version)
- Single-player with **gamepad as primary input** (keyboard fallback acceptable but not the focus)
- Architecture prepared for later multiplayer and for adding the Approach phase

### Explicitly Out of Scope (for this first prototype)
- Approach Phase (first-person turrets + harpoon) — deferred
- Online multiplayer / networking
- Multiple floors or elevators
- Full set of environmental systems (zero-G rooms, door sealing, complex oxygen management beyond the depressurization case)
- Expanded weapon set, special ammo, plasma cutter, etc.
- Complex AI, cover systems, or advanced pathfinding
- Loadouts, progression, or meta
- Polished art, skeletal animation, or complex particles
- Full music or large sound design
- UI beyond the absolute minimum (timer, objective text, health, charge count)

**Minimal impactful SFX are explicitly in scope** (see section 3.5 below).

---

## 2. Design Perspective

### Core Loop (Prototype)
1. Spawn at the entry point of a small procedural floor.
2. Fight through rooms/corridors. Enemy fire is frequently heavy enough that standing still is dangerous.
3. Use the **Breaching Charge** to open new paths or escape pressure — but doing so creates a vulnerability window.
4. While the charge is being placed, enemies can push and attempt to flank.
5. Deal with at least one active hull breach (suction force).
6. Reach the bomb site → hold interact to plant.
7. Reach the extraction point before the timer expires.
8. Win / lose screen with simple stats (time remaining, damage taken, enemies killed, charges used).

### Controls (Gamepad First)
**Primary: Gamepad (twin-stick)**
- **Left stick** – movement
- **Right stick** – aim
- **Right trigger (RT / R2)** – fire Standard Rifle
- **Face button (A / Cross)** – interact / place Breaching Charge / plant bomb
- **Left bumper or face button** – short sprint (optional)
- **D-pad or face button** – switch between Rifle and Charge if needed (or context-sensitive)

**Fallback: Keyboard + Mouse** (supported but not the focus of feel tuning)
- WASD + mouse aim + left click + E/Space

All feel tuning and quality gates prioritize gamepad.

### Key Feel Targets
- Movement and shooting must feel tight and responsive.
- Enemy fire should frequently pressure the player into moving or considering a breach.
- Placing a Breaching Charge must feel committed and risky (clear fuse time, enemies react).
- Outer-hull breach must feel like a real gamble: powerful suction + **permanent** depressurization + limited oxygen that is consumed faster by movement and shooting.
- The vacuum state persists for the rest of the run (including the return path to extraction).
- Mag-boots should give clear counterplay against suction at a meaningful mobility cost.
- You should not be able to casually suck all enemies into space and then continue without pressure.
- Because we use real 3D meshes, walls have height, characters have volume, and breaches show real depth.
- Timer pressure should be felt but not punishing on a clean first run.

### Timer Start Options (test both)
- Option A: Timer starts the moment the player enters the floor.
- Option B: Timer starts when the bomb is planted (extraction becomes a pure race).

### Camera
- Primary: Orthographic camera looking straight down.
- Optional early experiment: slight angle (10–25°) to better show the 3D form of walls and characters while keeping movement fully 2D on the ground plane.

---

## 3. Weapons & Combat Tension (Prototype Version)

### Starter Loadout & Wall Damage Rules (Hybrid)
- **Standard Rifle**  
  Reliable firefight weapon. Can slowly chip **internal** walls only. Negligible / zero damage to outer hull walls.

- **Breaching Charge** (limited — start with 2 or 3)  
  Place on a wall or door → visible short fuse (≈ 2 seconds) → opens a clean hole.  
  Works on both internal and outer hull walls. Opening an outer hull wall causes **permanent depressurization**.

- **Grenades** (rule established now)  
  Can damage both internal and outer hull walls. Using them near outer hull risks (or intentionally causes) permanent vacuum. Full implementation can follow the core loop if needed for scope control.

### Combat Pressure Rules
- Enemy ranged fire is tuned to be relatively heavy. Prolonged exposure in the open is dangerous.
- Not every fight is instantly lethal, but the majority of sustained firefights should push the player to move or breach.
- When the player begins placing a Breaching Charge:
  - Nearby enemies receive a short aggression buff.
  - They become more willing to leave cover, advance, or swing for a flank.
- The fuse is clearly visible and telegraphed so the player (and later teammates) can understand the risk window.

This already creates the intended tension even with simple AI:
“I need to open this wall, but the moment I start, they will push.”

### 3.5 Minimal Impactful Audio (In Scope)

We will include a small set of high-impact sound effects so combat and breaching feel physical. The goal is “thwop” and weight, not a full soundscape.

**Required SFX (prototype)**
| Event                        | Desired feel                          | Priority |
|------------------------------|---------------------------------------|----------|
| Rifle fire                   | Sharp, punchy report                  | High    |
| Bullet impact / penetration  | Meaty “thwop” / heavy hit             | High    |
| Ricochet                     | Higher-pitched metallic snap          | Medium  |
| Breaching charge detonation  | Heavy explosive thump + debris        | High    |
| Player taking damage         | Short, solid impact                   | Medium  |
| Charge placed / fuse arm     | Subtle mechanical click or arm sound  | Low     |

**Out of scope for prototype**
- Music
- Ambient ship hums / reverb tails
- Footsteps
- UI beeps beyond the bare minimum
- Complex layering or dynamic mixing

**Technical approach (keep junior-simple)**
- Use the Web Audio API directly or a tiny wrapper (Howler.js is acceptable if it stays lightweight).
- Very short .wav / .mp3 files (or simple procedural buffers if we want zero external assets).
- One-shot playback triggered from game events.
- Basic volume control and a global mute toggle in the debug GUI.
- No spatial audio required for the first prototype (top-down view makes full 3D audio less critical).

Feel target: when a bullet hits or a charge explodes, it should have noticeable weight and the “thwop” quality you described. We will tune this during the polish phase with your direct feedback.

---

## 4. Architecture Perspective

### High-Level Structure
```
┌─────────────────────────────────────────────┐
│                 Game Manager                 │
│  (state machine: Menu → Interior → Results, │
│   timer, seed, win/lose)                    │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│              Interior Scene                 │
│  (Orthographic or lightly angled camera)    │
│  - 3D Grid / rooms (meshes with height)     │
│  - Player (3D mesh)                         │
│  - Enemies (3D meshes)                      │
│  - Breaches + suction forces                │
│  - Projectiles                              │
│  - Objectives (bomb, extract)               │
│  - Breaching Charge system                  │
└─────────────────────────────────────────────┘
```

### Core Systems
- **Seeded RNG** – Single source of truth for layout, enemy spawns, breach locations.
- **Grid** – 2D integer grid that drives placement of 3D wall/floor meshes. Cells carry tags: floor, wall, door, breachable, objective, spawn, etc.
- **Entity list** – Simple array/map of active entities. Single update/render loop.
- **Forces** – Lightweight velocity integration (X/Z plane) + one suction force field around active breaches.
- **Breach Action** – Explicit player state (placing charge) that triggers enemy aggression response.
- **State Machine** – Explicit phases so later addition of Approach is clean.
- **Input as commands** – Even in single-player, collect input and apply it to an authoritative simulation layer.

### Recommended Folder Structure
```
src/
  main.ts
  game/
    GameManager.ts
    SeededRandom.ts
    states/
      InteriorState.ts
      ResultsState.ts
  interior/
    InteriorScene.ts
    Grid.ts
    Player.ts
    Enemy.ts
    Breach.ts
    BreachingCharge.ts
    Projectile.ts
    Objectives.ts
  shared/
    types.ts
    constants.ts
    EventBus.ts
  ui/
    HUD.ts
  placeholders/
    createPlayer.ts
    createEnemy.ts
    createWall.ts
    createCharge.ts
    etc.
```

---

## 5. Programming / Implementation Plan

### Phase 0 – Project Setup (½ day)
- Vite + TypeScript + Three.js
- Basic render loop + resize handling
- Seeded random utility
- Simple debug GUI (lil-gui) for seed, timescale, camera angle, etc.

### Phase 1 – 3D Top-Down Foundation (1 day)
- Orthographic (or lightly angled) camera that follows the player
- Player as a 3D capsule or simple stacked geometry
- Basic floor + wall meshes with real height
- Velocity movement on the XZ plane + collision
- Mouse aim + Standard Rifle shooting

### Phase 2 – Procedural Floor (1–2 days)
- Constrained generator from seed:
  - Fixed entry room
  - 4–8 connected rooms/corridors
  - Guaranteed path: Entry → Bomb → Extraction
  - 1–2 pre-tagged breachable wall segments
  - Enemy spawn points
- Instantiate real 3D wall and floor meshes from the grid

### Phase 3 – Enemies + Combat Pressure (1 day)
- One melee chaser + one simple ranged enemy
- Ranged enemies tuned for relatively heavy fire
- Health, death, basic separation
- Player health + death → restart

### Phase 4 – Breaching Charge + Enemy Reaction (1–2 days)
- Place charge on breachable surface → visible fuse → open hole
- Limited charges (2–3)
- When charge placement begins, nearby enemies gain short aggression / push behavior
- Visual & timing feedback must be crystal clear

### Phase 5 – Hull Breach + Suction (1–2 days)
- Activate a hull breach (open a wall segment into space)
- Apply continuous force toward the breach center
- Clear visual feedback (particles streaming outward)
- Reaching the hole = sucked into space (fail or heavy damage)

### Phase 6 – Objectives & Timer (1 day)
- Bomb: hold interact for 2–3 seconds
- Extraction zone
- Global timer + win/lose conditions
- Simple results screen

### Phase 7 – Juice & Polish Pass (1 day)
- Screen shake, muzzle flash, death effects
- HUD (timer, objective, health, charges remaining)
- Restart with same or new seed
- Basic pause / restart keys

**Estimated total effort: 7–11 focused days.**

---

## 6. Assets – What Is Needed & How to Generate Them

### Philosophy
Gameplay is top-down / orthographic, but **every visual element is a real 3D mesh**.  
Keep everything extremely simple for the prototype — pure Three.js primitives via factory functions.

### Key Placeholder Assets
| Asset                    | Suggested Geometry                          | Notes |
|--------------------------|---------------------------------------------|-------|
| Player                   | Capsule or stacked boxes/cylinders          | Bright cyan, clear silhouette |
| Melee enemy              | Box / capsule / low pyramid                 | Aggressive red |
| Ranged enemy             | Box + small cylinder “gun”                  | Orange / purple |
| Walls                    | Tall `BoxGeometry` (InstancedMesh)          | Real height 2.5–3.0 |
| Floors                   | `PlaneGeometry` or thin boxes               | Dark, slight room variation |
| Standard Rifle projectile| Small sphere or elongated box               | Strong emissive |
| Breaching Charge         | Small glowing box / cylinder                | Very obvious while placed + fuse |
| Breach opening           | Removed wall + dark space plane + particles | Must read as a hole into void |
| Bomb                     | `CylinderGeometry`                          | Pulsing emissive red |
| Extraction pad           | `RingGeometry` + plane                      | Green emissive |

**Generation method**: Code-first factories in a `placeholders/` folder.  
Blender (or any Blender + MCP-style tooling) only after the loop feels good.

### Scale Convention
- 1 unit ≈ 1 meter
- Player height ≈ 1.8
- Wall height ≈ 2.5–3.0
- Corridor width ≈ 3–4
- Room sizes in multiples of 4 or 8

---

## 7. Recommended Order of Work

| Day | Focus                                      | Deliverable                              |
|-----|--------------------------------------------|------------------------------------------|
| 1   | Project setup + camera + player + movement + Rifle | Can walk and shoot in an empty space    |
| 2   | Grid walls + collision                     | Can fight in a static handmade room     |
| 3   | Simple procedural floor from seed          | Different seeds = different layouts     |
| 4   | Enemies with pressuring fire               | Combat feels dangerous                  |
| 5   | Breaching Charge + enemy aggression reaction | Breach under fire is tense             |
| 6   | Hull breach + suction                      | Environmental danger is playable        |
| 7   | Bomb + extract + timer + HUD               | Full loop can be won or lost            |
| 8   | Juice, restart, seed control, tuning       | Prototype is showable                   |

---

## 8. Risks & Mitigations

| Risk                              | Mitigation                                      |
|-----------------------------------|-------------------------------------------------|
| Heavy enemy fire feels unfair     | Clear telegraphs + enough movement options + limited but useful charges |
| Breach window not readable        | Strong visual fuse + audio cue + enemy reaction is obvious |
| Pure top-down flattens 3D meshes  | Try light camera angle (10–25°) early           |
| Generator soft-locks              | Extremely constrained rules + path validation   |
| Scope creep                       | Stick to Rifle + Charge + one environmental system |

---

## 9. Tech Stack (Prototype)

- **Bundler**: Vite + TypeScript
- **Engine**: Three.js
- **UI**: HTML overlay or CSS2DRenderer
- **Debug**: lil-gui
- **RNG**: Custom seeded
- **Physics**: Hand-rolled velocity (XZ) + grid/bounding-box collision + force fields
- **No external models, no physics engine, no networking**

---

## 10. Definition of Done

A playable build where:
1. Player can complete (or fail) a full interior run in a few minutes.
2. Different seeds produce recognizably different but always completable floors built from real 3D meshes.
3. Enemy fire frequently pressures the player into moving or breaching.
4. Placing a Breaching Charge creates a clear vulnerability window that enemies can exploit.
5. At least one hull breach can pull the player (or an enemy) toward the void.
6. Bomb plant and extraction under timer work.
7. The experience is understandable with almost zero text.
8. Code structure makes adding a second local player, an authoritative server, or the Approach phase a natural next step.

---

*After this prototype is fun, the next major documents should cover: (1) Approach Phase prototype, (2) multiplayer architecture, (3) expanded weapons & second environmental system.*
