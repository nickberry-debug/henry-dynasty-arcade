@echo off
REM Windows one-shot deploy for Henry's Diamond Dynasty.
REM Run from C:\Projects\bbgame\henry-dynasty\ (or wherever this folder lives).

echo === Installing dependencies (one-time) ===
call npm install
if errorlevel 1 goto :err

echo === Building production bundle ===
call npm run build
if errorlevel 1 goto :err

echo === Deploying to Vercel (production) ===
echo If this is your first time, a browser will open to log into Vercel.
call npx vercel --prod --yes
if errorlevel 1 goto :err

echo.
echo Deploy complete. Copy the URL above into Safari on your iPad,
echo then Share -^> Add to Home Screen.
exit /b 0

:err
echo.
echo Something failed. Scroll up for the error message.
exit /b 1
