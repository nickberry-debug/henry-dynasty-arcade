@echo off
REM One-time setup: writes your Anthropic API key into .env.local for local builds
REM AND registers it with Vercel so production deploys pick it up.

setlocal enabledelayedexpansion

set "KEY=%~1"
if "%KEY%"=="" (
  echo.
  echo Paste your Anthropic API key (starts with sk-ant-...):
  set /p KEY=^>
)

if "%KEY%"=="" (
  echo No key provided. Aborting.
  exit /b 1
)

echo VITE_ANTHROPIC_API_KEY=%KEY%> .env.local
echo Wrote .env.local

echo Registering with Vercel production env...
echo %KEY%| npx vercel env add VITE_ANTHROPIC_API_KEY production
if errorlevel 1 (
  echo.
  echo Vercel env add reported an error — that's OK if the var already exists.
  echo To replace an existing value: npx vercel env rm VITE_ANTHROPIC_API_KEY production
  echo Then re-run this script.
)

echo.
echo Done. Run deploy.bat to ship.
exit /b 0
