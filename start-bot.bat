@echo off
echo Discord Voice Mover Bot を起動しています...
cd /d "%~dp0"
node startup.js
echo バックグラウンドで起動しました。
echo 以下のコマンドでステータスを確認できます:
echo pm2 status
echo.
echo 以下のコマンドでログを確認できます:
echo pm2 logs discord-voice-mover-bot
pause
