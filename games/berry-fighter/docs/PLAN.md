# Berry Fighter Implementation Plan

Goal: Deliver the approved base engine, two provisional models and one base level inside the existing Berry Arcade repository.
Architecture: deterministic GDScript simulation, independent 3D views, shared input and native UI.
Tech stack: Godot 4.7.2, Blender 5.2.2, Git.
Spec: DESIGN.md. Execute inline under the user's autonomous-work instruction.

## Global constraints
Original assets/code, unarmed, provisional roster, no production deployment. Browser play, iPad web app and Windows download through the existing arcade. Story/bosses deferred. No separate repo. Do not claim hardware verification.

## Review focus
Disconnected controllers; held/quick inputs across menus; repeated hits in one swing; pause during an attack; platform edges; PWA/host routing.

## Task 1: Simulation
- [x] Observe missing simulation failure, implement movement/combat/scoring.
- [x] Verify 22 behavioral checks including hitstop after a failing test.

## Task 2: Playable presentation
- [x] Observe missing scene failure before implementing the scene.
- [x] Create Blender source/GLBs for Pip and Bramble; add one level, views and UI.
- [x] Verify menu/match/pause/results/selection/rematch; inspect native screenshots.
- [x] Reproduce quick-tap loss, implement queued events and verify regression test.

## Task 3: Delivery
- [ ] Export Windows executable, launch and verify logs; package editable source, controls, test runner and progress notes.
- [ ] Commit to a feature branch of the existing arcade; upload and create a draft PR.
- [ ] Review implementation and save verification evidence and remaining hardware tests.
