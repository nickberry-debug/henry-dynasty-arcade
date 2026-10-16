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
- [x] Verify 23 behavioral checks including hitstop and simultaneous final-stock draws after failing tests.

## Task 2: Playable presentation
- [x] Observe missing scene failure before implementing the scene.
- [x] Create Blender source/GLBs for Pip and Bramble; add one level, views and UI.
- [x] Verify menu/match/pause/results/selection/rematch; inspect native screenshots.
- [x] Reproduce quick-tap loss, implement queued events and verify regression test.
- [x] Preserve controller ownership across disconnect/pause; pause on assigned-device disconnect. Cover queued controller events and short touch taps.

## Task 3: Delivery
- [x] Export Windows executable, launch and verify exit 0/render; package source, controls, test runner and progress notes.
- [x] Upload `feat/berry-fighter` to the existing arcade and create draft PR #1.
- [x] Verify native/browser render, input/pause, fresh-profile first-load/offline reopen with zero browser errors. Save remaining hardware checks in the progress report.
- [x] Independent review completed; controller ownership, simultaneous KOs, hitstop queue retention and first-load offline cache issues addressed with regressions.
