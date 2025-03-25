@echo off
cd %~dp0
echo Installing required dependencies...
call npm install discord.js@14.14.1 dotenv@16.4.5 @types/node typescript ts-node
echo Dependencies installation completed!
pause
