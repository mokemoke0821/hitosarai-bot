@echo off
cd %~dp0
echo Discord Voice Mover Botを起動しています...

echo 1. TypeScriptのコンパイル...
call npx tsc --skipLibCheck
if %ERRORLEVEL% NEQ 0 (
  echo [エラー] TypeScriptのコンパイルに失敗しました。
  echo ログを確認して問題を解決してください。
  pause
  exit /b 1
)

echo 2. Botを起動...
echo.
echo *** Botが起動しました ***
echo *** Ctrl+Cで終了できます ***
echo *** /help コマンドでヘルプを表示できます ***
echo.

node dist/index.js

echo.
echo Botが終了しました。
pause
