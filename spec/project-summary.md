# Project Summary: Procedural Space Battleship Co-op (Three.js)

**Working Title**: (TBD)  
**Engine / Stack**: Three.js (WebGL)  
**Target Platform**: Browser  
**Session Length**: 10–15 minutes  
**Players**: 1–4 player co-op  

**Starting Presentation**  
- **Interior (ship traversal)**: Top-down / orthographic (or lightly angled) camera. Gameplay movement is on the horizontal plane.  
- **Assets & Environment**: Full 3D meshes (walls have height, characters have volume, breaches have depth).  
- **Approach & Boarding**: First-person (or close third-person) — deferred to a later prototype.  
- **Graphics**: Extremely simple at first — characters, walls, and props built from basic 3D primitives. Focus is on gameplay feel, readability, and co-op timing. Art can be upgraded later once the core loop is proven.

## Core Premise
A marine team boards a procedurally generated space battleship. The objective is to fight through multiple floors, plant a bomb at a critical location, and extract back to the boarding craft before the timer expires.

The game is designed as a refined, jump-in-and-play experience rather than a large campaign.

## High-Level Structure (Two-Act Session)

### 1. Approach Phase (Turret Mini-Game) – ~2–4 minutes
*(Deferred to a later prototype)*  

Players man turrets on the boarding craft while approaching the target battleship. Presented in first-person (or close third-person). The phase is split into two clear stages and ends with a decisive harpoon lock that transitions the team into the interior.

**Stage 1 – Closing Distance (Defense Only)**  
- Pure ship-defense focus against fighters, interceptors, missiles, and hull turrets.  
- Duration target: ~60–90 seconds.

**Stage 2 – Harpoon Window (Defense + Objective)**  
- Harpoon target becomes available. One player aims and charges while the team continues defensive fire.  
- On successful lock: heavy *thunk*, cable tension, craft lurch, and transition into the ship.  
- Duration target: ~45–75 seconds.

Performance during the approach influences interior starting conditions (entry quality, alert level, etc.).

### 2. Interior Phase (Main Gameplay) – ~8–12 minutes
- Top-down / orthographic squad-based action using real 3D meshes.  
- Procedurally generated multi-floor battleship.  
- Clear objectives: advance through floors → plant bomb → extract under time pressure.  
- Strong emphasis on co-op coordination, environmental interaction, and emergent tactics.

## Key Interior Systems & Environmental Features

- **Hull Breaches**: Rooms or sections can be breached. Players and enemies can be sucked out into space. Creates high-drama tactical opportunities and dangers.
- **Outer Hull Breaches & Depressurization** (important distinction):  
  Breaching an *outer* hull wall depressurizes the room and creates a vacuum. This is deliberately riskier than breaching an internal wall.
  - Strong suction toward the opening.
  - Room enters a depressurized state.
  - **Depressurization is permanent** for the rest of the run. The room stays vacuum and the risk remains on the way back to extraction / the shuttle.
  - Players in the room gain a limited oxygen reserve.
  - **Movement and firing weapons consume oxygen faster**. Careful/idle movement consumes less.
  - Running out of oxygen causes rapid damage or death.
  - **Mag-boots** can be activated to strongly reduce suction force (player stays planted) at the cost of reduced mobility.
  - Design intent: opening the outer hull is a powerful but costly gamble / last resort. You cannot simply suck all enemies into space and then casually continue — the permanent vacuum + oxygen pressure forces a real, lasting trade-off.
  - **Cover interaction (noted for later)**:  
    - Prototype: all cover (crates, barriers) is static. Suction only affects characters.  
    - Longer-term intention: movable / unsecured cover (crates, barrels, light barriers) should be pulled by suction and can be sucked into space. Heavy stationary barriers stay fixed. Once moving, unsecured cover can also injure the player or enemies if it hits them with enough force. This will make permanent vacuum further reshape the battlefield and add physical danger.
- **Zero-G Rooms**: Altered movement and physics. Requires different positioning and possibly personal thrusters or magnetic boots.
- **Oxygen Leaks**: Hazardous atmosphere. Encourages careful weapon choice (certain weapons may worsen leaks or become restricted). Creates time pressure and suit-air management.
- **Enemy Door Sealing**: Enemies actively try to seal doors, creating spatial denial and forcing players to adapt, split up, or breach.
- **Player Breaching**: Players can blow through certain walls and doors. Enables flanking, shortcuts, and creative extraction routes. Works with procedural layouts for replayability. Internal breaches are tactical; outer-hull breaches are high-risk.

These systems make the battleship feel reactive and alive while supporting short, memorable co-op moments.

## Weapons, Breaching & Combat Tension

### Design Intent
Enemy fire is frequently heavy and deadly enough that prolonged static firefights are dangerous. This pressure encourages movement and the use of breaching to change the geometry of the fight.  

However, the act of breaching itself creates a vulnerability window. While a player is placing a charge or cutting, they are committed. Enemies can advance, push, and flank if the team is not covering the breacher.  

This produces a clear, readable tension loop:

1. Heavy enemy fire makes the current position untenable.
2. Team decides to breach to open a new path or escape route.
3. During the breach action, enemies become more aggressive and look for flanks.
4. Team must actively cover the breacher.
5. Successful breach opens new options — but the fight has escalated.

Breaching is powerful but never free.

### Firefight Weapons (primary combat tools)
These are used against enemies. They should feel distinct so co-op has natural specialization.

| Weapon              | Role                              | Notes |
|---------------------|-----------------------------------|-------|
| SMG / PDW           | Close-to-mid volume of fire       | High rate of fire, good against groups |
| Assault Rifle       | Generalist / mid-range backbone   | Balanced, reliable |
| Shotgun             | Close-range room clearer          | High damage and stagger up close, weak at range |
| Heavy / LMG (later) | Suppression / sustained fire      | High sustained DPS, movement penalty |

Normal firefight weapons are weak or inefficient against reinforced / breachable walls.

### Breaching Tools (environmental / tactical)
Dedicated tools are required for efficient breaching. They are limited and create a clear vulnerability window.

| Tool                        | Behavior                              | Role / Risk |
|-----------------------------|---------------------------------------|-------------|
| **Breaching Charge**        | Place on wall/door → short fuse → opens a hole | Primary planned breaching tool. Loud, fixed delay, limited carries. Creates the classic “cover me while I plant” moment. |
| **Breaching Rounds** (shotgun special ammo) | Instant but less clean damage to breachable surfaces | Emergency / opportunistic breaches. Consumes special ammo. |
| **Plasma Cutter** (later)   | Hold beam to cut                      | Quiet and precise, but slow and leaves the user very vulnerable. |
| **Heavy Explosive** (later, very limited) | Large destructive projectile         | Dramatic openings or emergency extraction routes. High chance of creating unwanted full hull breaches or oxygen issues. |

### Wall Damage Rules (Hybrid)
- **Internal walls**: Can be slowly chipped by the Standard Rifle (improvised). Opened cleanly and quickly by a Breaching Charge.
- **Outer hull walls**: Extremely resistant to the Standard Rifle (zero or near-zero damage). Only a Breaching Charge or grenades can open them. Opening an outer hull wall triggers **permanent depressurization**.
- **Grenades**: Can damage both internal and outer hull walls. Using grenades near outer hull is therefore risky — it can accidentally or intentionally cause permanent vacuum.

### Prototype Starter Set
- **Standard Rifle** — basic firefight weapon. Can slowly chip internal walls only. Negligible damage to outer hull.
- **Breaching Charge** (limited, 2–3 per run) — the proper, deliberate way to open walls and doors (including outer hull, with full permanent consequences).
- **Grenades** — will be able to damage outer hull walls and therefore carry the risk of causing permanent depressurization (implementation timing to be decided; rule is established now).

This set teaches the core fantasy: fight with the gun, change the map deliberately with the charge, and treat explosives near the outer hull as a real gamble.

### Enemy Behavior Tied to Breaching
- Many enemy types output enough damage or suppression that standing still is risky.
- When a player begins a breach action, nearby enemies can enter a short aggressive state: more willing to leave cover, push forward, or swing for flanks.
- The vulnerability window is telegraphed (visible fuse, clear audio/visual cue) so a coordinated team can react.

## Procedural Generation
- Multi-floor space battleship generated from a shared seed (important for co-op consistency).
- Rooms, corridors, vertical connections (stairs/elevators), themed areas, weak walls, potential breach points, and environmental tags (pressurized, zero-G, oxygen state, etc.).
- Generator must keep critical paths viable even after destruction and sealing.
- Approach-phase exterior defenses, boarding points, and the exact harpoon target are also driven by the same seed.

## Technical & Design Notes

**Feasibility Assessment**  
- Single-player / local prototype with top-down 3D-mesh interior: Good  
- Full 1–4 player online co-op + procedural multi-floor + environmental systems: Hard, but the simplified starting presentation significantly lowers the barrier.

**Major Challenges**
- Real-time multiplayer synchronization (positions, projectiles, door/wall states, breaches, room atmosphere).
- Dynamic navigation (destroyed walls, sealed doors).
- Communicating suction forces and environmental hazards clearly in a top-down 3D view.
- Balancing heavy enemy fire + breach vulnerability so the tension feels exciting rather than frustrating.
- Performance in the browser with multiple entities, particles, and destruction.

**Recommended Mitigations for MVP**
- Top-down / orthographic (or lightly angled) camera with real 3D meshes.
- Characters and environment as simple geometric 3D primitives until the core loop feels right.
- Grid-based movement and pathfinding.
- Pre-authored modular destructible segments rather than full voxel destruction.
- Discrete breach zones instead of complex fluid simulation.
- Limited number of floors and environmental variety at first.
- Authoritative server model for all critical state.
- Clear, readable vulnerability window when placing a breaching charge.

## Suggested Session Pacing
- 0:00–0:30 → Lobby / loadout  
- 0:30–3:30 → Approach (deferred for first prototype)  
- 3:30–12:00 → Interior (combat, objectives, bomb plant)  
- 12:00–15:00 → Extraction under timer + environmental chaos

## Design Goals
- Instantly understandable “get in, plant bomb, get out” fantasy.
- Strong co-op identity with meaningful roles and emergent moments (especially “cover the breacher”).
- High replayability through procedural ships and player-driven destruction.
- Feels like a proper short-form game, not a prototype or endless roguelike.
- Heavy enemy pressure that encourages breaching, combined with real risk when you actually do it.
- Prove the core feel (movement, combat, breaches, suction, co-op timing) with the simplest possible 3D visuals before investing in art.

## Next Steps (Suggested)
1. Design the room / wall data structure (connectivity, atmosphere, destructibility tags, breachable vs indestructible).
2. Prototype top-down movement + basic shooting + simple breach suction using 3D primitives.
3. Implement the starter weapon pair (Standard Rifle + Breaching Charge) and the basic “enemies push when breach starts” reaction.
4. Decide multiplayer architecture (e.g., Colyseus, PartyKit, custom Socket.io + authoritative server).
5. Create a vertical slice: one procedural floor → combat under pressure → breach under fire → bomb plant → extraction.
6. Later: Approach Phase prototype, additional environmental systems, expanded weapon set.

## Future Possibilities (Out of Scope)

- **Browser VR / WebXR experiment**  
  A later VR version is technically feasible in the browser via WebXR + Three.js (especially on Meta Quest and similar headsets).  
  In a VR experiment, **both** the Approach phase and the Interior (attack) phase would pivot to first-person.  
  This would require significant control and camera redesign for the interior and remains completely out of scope until the flat-screen core loop is proven.

---

*This document consolidates the full concept discussion for hand-off into a proper project.*
