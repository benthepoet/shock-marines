# Technical Implementation Plan  
**First Prototype – Procedural Space Battleship Co-op**

**Purpose**  
This document is the single source of truth for *how* we build the first prototype.  
It is deliberately strict: every phase has concrete deliverables, measurable quality gates, and a required sign-off from you before work proceeds.  

The goal is to eliminate hidden assumptions and keep the implementation tightly aligned with the design captured in `project-summary.md` and `prototype-plan.md`.

---

## Implementer Role & Personality

**The implementer is always treated as a junior developer**, regardless of whether the implementer is an AI model, another person, or any other agent.

### Role
- Execute only the clearly specified work for the *current* phase.
- Stay strictly inside the phase scope. Do not add features, polish, or systems that belong to later phases.
- Produce small, reviewable increments that can be demonstrated against the quality gate.
- Surface any ambiguity, missing information, or new assumption immediately instead of deciding silently.

### Expected Personality & Working Style
- Careful and literal — follows written instructions closely.
- Asks for clarification when anything is underspecified.
- Prefers boring, readable, explicit code over clever abstractions.
- Does not invent design decisions, numbers, feel values, or architecture choices.
- Treats “feel” (movement, aim, combat pressure, breach vulnerability, suction) as something only the project owner can approve.
- When in doubt, stops and writes the question down rather than guessing.

### Hard Rules for the Implementer
- Never advance to the next phase without explicit sign-off.
- Never expand scope “just a little.”
- Never leave assumptions undocumented.
- Never claim a quality gate is met until the project owner has played and approved the relevant feel.

This role definition applies to every implementer for the entire project.

---

## Guiding Principles

1. **No silent assumptions**  
   If something is not explicitly defined in the design documents or in this plan, it must be written down and approved by you before implementation.

2. **Playable at every gate**  
   At the end of each phase the build must be runnable and demonstrable. No “it almost works” states for sign-off.

3. **One concern at a time**  
   Each phase has a narrow focus. We do not add “just a little extra” systems inside a phase.

4. **Review before advance**  
   You personally review and sign off on the quality gate. Only then does the next phase begin.

5. **Architecture first, then features**  
   Early phases lock in the structure (scene, input, grid, entity model) so later features do not require rewrites.

6. **Simple 3D primitives only**  
   All visuals remain code-generated Three.js meshes until the entire prototype loop is signed off.

7. **Gamepad first**  
   All movement, aiming, shooting, and interaction feel is tuned and gated for gamepad (twin-stick). Keyboard + mouse is supported as a fallback only and is not the focus of quality gates.

8. **Junior implementer rule**  
   Every implementer is treated as a junior developer. See the “Implementer Role & Personality” section above. This is non-negotiable.

---

## How Reviews & Sign-off Work

At the end of every phase you will receive:

- A short written summary of what was built
- A runnable build (or clear instructions to run it)
- A checklist matching the Quality Gate criteria
- Any new assumptions or open questions that appeared during the phase

You reply with one of:

- **Approved** → proceed to next phase
- **Approved with notes** → small fixes, then proceed
- **Rejected** → specific changes required before re-review

No phase begins until the previous one is approved.

---

## Phase 0 – Project Foundation  
**Goal**: A clean, runnable Three.js + TypeScript project with the architectural skeleton in place.

### Deliverables
- Vite + TypeScript + Three.js project
- Basic render loop, resize handling, and fixed timestep (or clearly documented variable timestep)
- Folder structure matching the one in `prototype-plan.md`
- `GameManager` with a simple state machine (at minimum: `Loading` → `Interior` → `Results`)
- Seeded random utility
- lil-gui debug panel (seed, timescale, show grid, etc.)
- Empty `InteriorScene` that clears and renders a background color
- Input command pattern stub (even if only local single-player for now)

### Quality Gate
- [ ] Project starts with `npm run dev` (or equivalent) with zero errors
- [ ] Browser shows a clear canvas and the debug GUI
- [ ] Changing the seed in the GUI is reflected in the console / a visible debug value
- [ ] Folder structure and core classes exist and are empty or minimal stubs only
- [ ] No gameplay systems have been implemented yet

### Sign-off Required
**You must approve Phase 0 before any gameplay code is written.**

---

## Phase 1 – Player, Camera & Movement (Gamepad First)  
**Goal**: A controllable player that feels good to move and aim with a gamepad in a top-down (or lightly angled) 3D view.

### Deliverables
- Orthographic camera (with optional slight angle toggle in debug GUI)
- Player represented by a simple 3D mesh (capsule or stacked primitives)
- **Gamepad twin-stick controls**:
  - Left stick → movement on the XZ plane (with acceleration, friction, max speed, and deadzone handling)
  - Right stick → aim direction (player mesh rotates to face aim direction)
- Camera follows the player smoothly
- Basic collision against a few hardcoded wall meshes (no grid yet)
- Clear player-facing direction based on right stick
- Keyboard + mouse as secondary/fallback only (not the focus of tuning)

### Quality Gate
- [ ] Player moves responsively with left stick
- [ ] Aiming with right stick feels precise and comfortable
- [ ] Movement + aim together feel tight on gamepad (you will judge this subjectively — key feel gate)
- [ ] Deadzones and stick response curves are tuned so the character does not feel floaty or twitchy
- [ ] Camera follow is smooth and does not induce motion sickness
- [ ] Player collides correctly with static wall meshes
- [ ] Debug GUI can toggle camera angle, show velocity, and visualize stick input
- [ ] No shooting, no enemies, no procedural content yet

### Sign-off Required
**Movement and aim feel on gamepad is subjective. You must play it with a gamepad and explicitly approve the feel before we continue.**

---

## Phase 2 – Standard Rifle & Basic Combat (Gamepad)  
**Goal**: The player can shoot and kill simple enemies using gamepad controls. Combat pressure begins to exist.

### Deliverables
- Right trigger (RT / R2) fires the Standard Rifle in the direction of the right stick
- Projectiles are simple 3D meshes with lifetime and collision
- At least one enemy type that can be damaged and die
- Player has health and can die (restart or return to a safe state)
- Basic muzzle flash / hit feedback (simple emissive or scale punch is enough)
- Enemies have enough damage output that standing still is noticeably dangerous
- Keyboard/mouse shooting remains as fallback only

### Quality Gate
- [ ] Rifle fires reliably with right trigger and projectiles travel in the aimed direction
- [ ] Aiming while moving (twin-stick) feels comfortable and accurate enough for combat
- [ ] Enemies take damage and die with clear feedback
- [ ] Player can be killed by enemy fire
- [ ] Standing in the open against even one ranged enemy feels pressuring (you judge this)
- [ ] No breaching, no procedural layout, no objectives yet

### Sign-off Required
**You must confirm that the combat pressure and twin-stick shooting already feel meaningful on gamepad.**

---

## Phase 3 – Grid, Walls & Procedural Floor  
**Goal**: A seeded procedural floor made of real 3D wall and floor meshes with guaranteed navigable paths.

### Deliverables
- 2D grid data structure that drives mesh placement
- Wall and floor meshes instantiated from the grid (InstancedMesh preferred for walls)
- Simple constrained procedural generator from seed:
  - Entry room
  - 4–8 connected rooms/corridors
  - Guaranteed path from Entry → Bomb location → Extraction location
  - 1–2 cells pre-tagged as breachable
- Player spawns at the entry point of the generated floor
- Collision works against the generated walls

### Quality Gate
- [ ] Different seeds produce different layouts
- [ ] Every generated layout has a clear path from entry to bomb to extraction
- [ ] Walls have real height and the space reads as a ship interior
- [ ] Player can freely navigate the entire generated floor without getting stuck
- [ ] Breachable segments are visually distinct (even if they cannot be opened yet)
- [ ] No breaching action, no suction, no bomb planting yet

### Sign-off Required
**You must walk several different seeds and confirm the layouts feel usable and ship-like.**

---

## Phase 4 – Breaching Charge & Enemy Reaction  
**Goal**: The core tension loop is playable — heavy fire forces consideration of breaching, and breaching itself is risky.

### Deliverables
- Player can select and place a Breaching Charge on a breachable surface
- Limited charges (start with 2 or 3)
- Visible fuse (approximately 2 seconds) with clear visual countdown
- On detonation the wall segment is removed / opened
- When charge placement begins, nearby enemies receive a short aggression buff and attempt to push or flank
- Standard Rifle remains weak/inefficient against breachable walls

### Quality Gate
- [ ] Placing a charge is a clear, committed action with a readable fuse
- [ ] Enemies visibly react and push when a charge is being placed
- [ ] Opening a wall creates a usable new path
- [ ] Running out of charges is possible and meaningful
- [ ] The intended tension (“I need to breach but they will push”) is already feelable in single-player
- [ ] No hull suction, no bomb, no timer yet

### Sign-off Required
**This is a critical design gate. You must play multiple encounters and confirm the vulnerability window and enemy reaction feel correct.**

---

## Phase 5 – Outer Hull Breach, Depressurization, Suction & Mag-Boots  
**Goal**: Breaching an outer hull wall feels like a high-risk gamble. The room depressurizes, suction pulls toward space, oxygen becomes limited and is consumed by action, and mag-boots provide meaningful counterplay.

### Deliverables
- Ability to breach an outer-hull segment (pre-tagged in the grid).  
  **Hybrid rule**: Standard Rifle does negligible damage to outer hull. Only Breaching Charge (and later grenades) can open it.
- On outer-hull breach:
  - Strong continuous suction force toward the opening
  - Room enters depressurized state
  - **Depressurization is permanent** for the rest of the run (the vacuum risk remains on the return path to extraction)
  - Player receives a limited oxygen reserve
  - Movement and firing the weapon accelerate oxygen drain; idle/careful movement drains more slowly
  - Oxygen reaching zero causes rapid damage or death
- Mag-boots toggle: while active, suction is strongly reduced and player stays planted, but movement speed is reduced
- Clear visual feedback for suction, depressurization state, oxygen level, and mag-boot status
- Enemies can also be affected by suction
- Player or enemy that reaches the hole is sucked into space
- Cover remains **static** in this phase (suction affects characters only). Dynamic/movable cover is a documented later intention (including the ability for moving cover to injure characters on hard impact), not part of the prototype.

### Quality Gate
- [ ] Outer-hull breach is clearly distinguishable from a normal internal breach
- [ ] Suction is immediately readable and dangerous
- [ ] Depressurization is permanent (room stays vacuum for the rest of the run)
- [ ] Oxygen meter appears and drains faster when moving or shooting
- [ ] You cannot casually clear a room with suction and then continue without pressure
- [ ] Mag-boots provide obvious counterplay at a real mobility cost
- [ ] Force strength, oxygen drain rates, and mag-boot trade-off feel fair (you judge by playing)
- [ ] No objectives or timer yet

### Sign-off Required
**You must experience the full depressurization loop (breach → permanent vacuum → oxygen pressure → mag-boots) and confirm it feels like a genuine gamble / last resort that still matters on the way back to extraction.**

---

## Phase 6 – Objectives, Timer & Win/Lose  
**Goal**: The full interior loop can be won or lost.

### Deliverables
- Bomb prop at the designated location
- Hold-interact to plant (2–3 seconds) with visible progress
- Extraction zone that ends the run when entered after the bomb is planted
- Session timer (decide start condition with you during this phase)
- Win and lose screens with basic stats
- Ability to restart with the same seed or a new seed

### Quality Gate
- [ ] Full loop is completable: spawn → fight → breach under pressure → plant bomb → extract
- [ ] Timer creates noticeable pressure
- [ ] Win and lose states are clear
- [ ] Restart works reliably
- [ ] The run length is in the intended short-session range

### Sign-off Required
**You must complete several full runs (wins and losses) and approve the overall pacing and pressure.**

---

## Phase 7 – Integration Polish, Minimal Audio & Vertical Slice Freeze  
**Goal**: The prototype is clean enough to be shown and to serve as the foundation for the next stage of work. Combat and breaching should have physical impact through both visuals and sound.

### Deliverables
- Minimal but clear HUD (timer, health, charges, current objective)
- Basic juice (screen shake on hits, simple muzzle flash, death feedback)
- **Minimal impactful SFX** (see prototype-plan.md §3.5):
  - Rifle fire
  - Bullet impact / penetration (“thwop”)
  - Ricochet
  - Breaching charge detonation
  - Player damage hit
  - Simple charge-placed / arm sound (optional)
- Debug tools cleaned up or behind a flag (including a mute toggle)
- All known crashes and soft-locks fixed
- Short internal notes document: “What works, what feels weak, what should be tackled next”
- Code is organized and free of large commented-out experiments

### Quality Gate
- [ ] A fresh player can understand the goal with almost no explanation
- [ ] The full loop is stable across multiple seeds
- [ ] Performance is acceptable on a target machine
- [ ] No major outstanding bugs that block evaluation of the design
- [ ] Gunshots, impacts, and explosions have noticeable weight and the desired “thwop” / impact quality (you judge this by playing)
- [ ] You explicitly agree this vertical slice is frozen as the baseline

### Final Sign-off
**This phase ends with a formal “Prototype Vertical Slice Approved” decision from you.**  
After this point we treat the current build as the stable foundation for multiplayer, Approach phase, or additional systems.

---

## Cross-Cutting Rules (Apply to Every Phase)

- **New assumptions** must be written in a short “Assumption Log” at the bottom of the phase summary and approved by you.
- **No new systems** outside the phase scope. If something feels necessary, flag it for the next phase or for a design discussion.
- **Feel is a first-class requirement**. Movement, gun feel, breach tension, outer-hull depressurization + oxygen pressure, mag-boot trade-off, suction danger, and the impact/weight of sound effects (“thwop”) are all subject to your subjective approval.
- **Code stays simple**. Prefer clear, readable implementations over clever ones. We can optimize later.
- **Every phase ends with a runnable build** that demonstrates only what that phase was supposed to deliver.

---

## Assumption Log (Living)

Any assumption that appears during implementation will be recorded here with the phase it was introduced and your decision.

| ID | Phase | Assumption | Your Decision | Date |
|----|-------|------------|---------------|------|
| A1 | —     | (none yet) | —             | —    |

---

## Next Document After Prototype Approval

Once Phase 7 is signed off we will create one of the following (your choice):

- Multiplayer Architecture Plan
- Approach Phase Technical Plan
- Expanded Weapons & Second Environmental System Plan

---

*This plan exists to keep us honest and aligned. Every gate is a chance to correct course before assumptions compound.*
