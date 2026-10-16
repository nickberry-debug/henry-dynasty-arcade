# Berry Fighter base engine demo

Original Godot game inside Berry Arcade. Two provisional Blender models, one level, unarmed combat. Story, bosses, final art, weapons and additional levels follow playtest approval.

## Play
Arcade route: `/berry-fighter`. Full game: `/games/berry-fighter/index.html`. Windows ZIP: `/downloads/berry-fighter-windows.zip`.

iPad: open the full game URL in Safari, Share > Add to Home Screen. Let the first launch finish online before trying offline. Use landscape. This is a web app, not a native iOS/IPA release. Real iPad performance remains unverified.

## Controls
| Action | Player 1 | Player 2 | Standard controller |
|---|---|---|---|
| Move | A/D | Left/Right | Left stick or D-pad |
| Jump twice | Space | Up | A / Cross |
| Light / aerial | J | M | X / Square |
| Heavy | K | Comma | Y / Triangle |
| Special | L | Period | B / Circle |
| Shield | Shift | N | LB / L1 |
| Dodge | E | Slash | RB / R1 |
| Drop through | S | Down | Stick down |
| Pause | Esc | Esc | Start |

Keyboard and controllers feed players 1/2. Press a controller button for browser detection. Toggle Touch in the menu for multi-finger controls. Training has a stationary dummy and unlimited stocks. CPU sparring/local versus use three stocks and a three-minute timer. Focus loss pauses combat.

## Edit and rebuild
Open `project.godot` in Godot 4.7.2. Install matching standard export templates. Blender 5.2.2 models live in `assets/source`, ignored by Godot; runtime GLBs are in `assets`.

From this directory:
```
godot --headless --editor --import
godot --headless --script res://tests/test_simulation.gd
godot --headless --script res://tests/test_input.gd
godot --headless --script res://tests/test_scene.gd
godot --headless --export-release Web
godot --headless --export-release "Windows Desktop"
```
From repo root: `node scripts/test-berry-fighter-site.mjs` and `npm run build`.

Rebuild models using `blender --background --python assets/create_characters.py`. ZIP the Windows executable with the README/license notices to `public/downloads/berry-fighter-windows.zip`. Both exports are defined in `export_presets.cfg`.

## Before calling this ready
Playtest movement, jump timing, attack readability, shields, edge recovery, both fighters, real controllers, two-player input, iPad multi-touch, Home Screen install and offline reopening. Automated tests do not establish fun or hardware compatibility. See `docs/DESIGN.md` for scope and architecture.
