@echo off
cd %~dp0
echo Building and running Discord Voice Mover Bot...

echo 1. Building TypeScript...
call npx tsc --skipLibCheck --noEmit

if %ERRORLEVEL% neq 0 (
  echo TypeScript build failed! Fix the errors and try again.
  pause
  exit /b 1
)

echo 2. Compiling to JavaScript...
call npx tsc --skipLibCheck

echo 3. Starting the bot...
node dist/index.js

echo Bot has been started! Press Ctrl+C to stop.
pause
