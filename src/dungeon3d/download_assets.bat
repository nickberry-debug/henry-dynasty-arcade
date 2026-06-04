@echo off
REM Download free Kenney assets for Dungeon3D

setlocal enabledelayedexpansion

set ASSET_DIR=C:\Projects\Arcade\source\henry-dynasty\src\dungeon3d\assets
set TEMP_DIR=%ASSET_DIR%\temp

REM Create directories
echo Creating asset directories...
if not exist "%ASSET_DIR%\models\dungeon" mkdir "%ASSET_DIR%\models\dungeon"
if not exist "%ASSET_DIR%\models\characters" mkdir "%ASSET_DIR%\models\characters"
if not exist "%ASSET_DIR%\models\enemies" mkdir "%ASSET_DIR%\models\enemies"
if not exist "%ASSET_DIR%\models\items" mkdir "%ASSET_DIR%\models\items"
if not exist "%ASSET_DIR%\audio\music" mkdir "%ASSET_DIR%\audio\music"
if not exist "%ASSET_DIR%\audio\sfx" mkdir "%ASSET_DIR%\audio\sfx"
if not exist "%ASSET_DIR%\ui" mkdir "%ASSET_DIR%\ui"
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

echo.
echo === DUNGEON CRAWLER 3D - ASSET DOWNLOADER ===
echo Location: https://kenney.nl/assets
echo License: CC0 (Public Domain)
echo.
echo NOTE: These downloads must be done manually via:
echo 1. Visit https://kenney.nl/assets
echo 2. Download each pack (below)
echo 3. Extract to corresponding folders
echo.
echo RECOMMENDED DOWNLOADS:
echo   - Dungeon Pack          (walls, floors, props)
echo   - RPG Enemies           (skeleton, orc, goblin, demon, etc.)
echo   - RPG Characters        (player models)
echo   - RPG Items             (weapons, armor, loot)
echo   - RPG Music             (dungeon &amp; boss themes)
echo   - RPG Sound Pack        (hit, ability, ambient SFX)
echo   - RPG Icons             (UI, ability icons)
echo.
echo TOTAL SIZE: ~300MB
echo SETUP TIME: 30-60 minutes
echo.
echo Asset directories created at: %ASSET_DIR%
echo.
pause
