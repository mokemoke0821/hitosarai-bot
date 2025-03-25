@echo off
cd %~dp0
echo Discord Voice Mover Botを PM2 でバックグラウンド起動します...

echo 1. 既存のプロセスを停止（もし実行中なら）...
call npx pm2 stop discord-voice-mover-bot 2>nul
call npx pm2 delete discord-voice-mover-bot 2>nul

echo 2. PM2でボットを起動...
call npx pm2 start dist/index.js --name discord-voice-mover-bot

echo 3. PM2の状態を表示...
call npx pm2 status

echo.
echo ボットがバックグラウンドで起動しました。
echo.
echo 使用できるコマンド:
echo   - ステータス確認: npx pm2 status
echo   - ログ確認: npx pm2 logs discord-voice-mover-bot
echo   - 再起動: npx pm2 restart discord-voice-mover-bot
echo   - 停止: npx pm2 stop discord-voice-mover-bot
echo.
echo Windowsスタートアップに登録したい場合:
echo   1. setup-autostart.bat を実行してください。
echo   2. Windows起動時に自動的にボットが起動します。
echo.
pause
