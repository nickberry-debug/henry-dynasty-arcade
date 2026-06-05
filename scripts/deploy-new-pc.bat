@echo off
REM ============================================================
REM   BERRY KIDS' ARCADE — fresh-machine deploy
REM ============================================================
REM   What this does on a brand-new Windows PC:
REM     1. Clones (or updates) the repo into  C:\Arcade\yom-ops-hub
REM     2. cd's into the henry-dynasty subfolder
REM     3. npm install   (first run only — cached afterward)
REM     4. npm run build (verifies the code compiles cleanly)
REM     5. npx vercel --prod  (deploys to henry-dynasty.vercel.app)
REM
REM   Prereqs you must install ONCE on this machine:
REM     - Node.js LTS:  https://nodejs.org/    (includes npm + npx)
REM     - Git:          https://git-scm.com/download/win
REM
REM   First run only:
REM     - A browser tab will open to log into Vercel.  Use the same
REM       email you used on the work PC (nick.berry@yomamasfoods.com)
REM       and link to the existing "henry-dynasty" project when asked.
REM
REM   Just double-click this file.  No arguments needed.
REM ============================================================

setlocal enableextensions
set ROOT=C:\Arcade
set REPO_URL=https://github.com/nickberry-debug/yom-ops-hub.git
set REPO_DIR=%ROOT%\yom-ops-hub
set APP_DIR=%REPO_DIR%\henry-dynasty
set BRANCH=polish-pass

echo.
echo === Berry Kids' Arcade deploy ===
echo Target: %APP_DIR%
echo Branch: %BRANCH%
echo.

REM --- 1. Make sure C:\Arcade exists ---
if not exist "%ROOT%" mkdir "%ROOT%"
if errorlevel 1 goto :err_mkdir

REM --- 2. Clone (first run) or update (subsequent runs) ---
if not exist "%REPO_DIR%\.git" (
    echo === First-time clone of %REPO_URL% ===
    cd /d "%ROOT%"
    git clone --branch %BRANCH% %REPO_URL%
    if errorlevel 1 goto :err_clone
) else (
    echo === Pulling latest from origin/%BRANCH% ===
    cd /d "%REPO_DIR%"
    git fetch origin %BRANCH%
    if errorlevel 1 goto :err_fetch
    git checkout %BRANCH%
    git reset --hard origin/%BRANCH%
    if errorlevel 1 goto :err_reset
)

REM --- 3. Move into the app subfolder ---
cd /d "%APP_DIR%"
if errorlevel 1 goto :err_cd

REM --- 4. Install deps (npm ci is faster + reproducible) ---
echo.
echo === Installing dependencies (this can take 2-3 min the first time) ===
if exist node_modules (
    call npm install --no-audit --no-fund
) else (
    call npm ci --no-audit --no-fund
)
if errorlevel 1 goto :err_install

REM --- 5. Build (catches errors before we burn Vercel time) ---
echo.
echo === Building production bundle ===
call npm run build
if errorlevel 1 goto :err_build

REM --- 6. Deploy ---
echo.
echo === Deploying to Vercel (production) ===
echo If this is your first deploy from this PC, a browser tab opens
echo so you can log in to Vercel.  Link to the existing project named
echo "henry-dynasty" when prompted.
echo.
call npx --yes vercel --prod --yes
if errorlevel 1 goto :err_deploy

echo.
echo ============================================================
echo   DEPLOY COMPLETE
echo   Live URL:  https://henry-dynasty.vercel.app
echo ============================================================
endlocal
pause
exit /b 0

:err_mkdir
echo ERROR: could not create %ROOT%.  Run as Administrator?
goto :end_err
:err_clone
echo ERROR: git clone failed.  Is git installed?  Try: git --version
goto :end_err
:err_fetch
echo ERROR: git fetch failed.  Check network / GitHub auth.
goto :end_err
:err_reset
echo ERROR: git reset failed.  Local changes blocking the update?
goto :end_err
:err_cd
echo ERROR: %APP_DIR% does not exist after clone.  Repo layout changed?
goto :end_err
:err_install
echo ERROR: npm install failed.  Is Node.js installed?  Try: node --version
goto :end_err
:err_build
echo ERROR: build failed.  Scroll up for the TypeScript / Vite error.
goto :end_err
:err_deploy
echo ERROR: vercel deploy failed.  Check the message above.
goto :end_err

:end_err
echo.
echo Deploy aborted.  Fix the error above and re-run this file.
endlocal
pause
exit /b 1
