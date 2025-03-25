@echo off
echo Windowsスタートアップに自動起動設定を追加します...
cd /d "%~dp0"

set SHORTCUT_NAME=DiscordVoiceMoverBot
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set CURRENT_DIR=%CD%
set TARGET=%CURRENT_DIR%\start-bot.bat

echo Windows起動時にBotを自動実行するためのショートカットを作成します...

echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%STARTUP_FOLDER%\%SHORTCUT_NAME%.lnk" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%TARGET%" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%CURRENT_DIR%" >> CreateShortcut.vbs
echo oLink.Description = "Discord Voice Mover Bot Auto Starter" >> CreateShortcut.vbs
echo oLink.WindowStyle = 7 >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

cscript CreateShortcut.vbs
del CreateShortcut.vbs

echo セットアップが完了しました！
echo Windows起動時に自動的にBotが起動します。
pause
