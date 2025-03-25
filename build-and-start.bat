@echo off
cd %~dp0
echo Discord Voice Mover Botのビルドと起動...

echo 1. TypeScriptのコンパイル...
call npx tsc --skipLibCheck

if %ERRORLEVEL% neq 0 (
  echo コンパイルに失敗しました。エラーを修正してください。
  pause
  exit /b 1
)

echo 2. コマンドの登録...
call node dist/deploy-commands.js

if %ERRORLEVEL% neq 0 (
  echo コマンド登録に失敗しました。
  pause
  exit /b 1
)

echo 3. ボットの起動...
call node dist/index.js

pause
