@echo off
cd %~dp0
echo プロジェクトのクリーンアップを開始します...

echo 1. バックアップを作成...
if not exist backup mkdir backup
xcopy /E /I /Y commands backup\commands
xcopy /E /I /Y utils backup\utils
xcopy /E /I /Y config backup\config
if exist legacy-commands xcopy /E /I /Y legacy-commands backup\legacy-commands
copy *.ts backup\
copy *.json backup\
copy *.md backup\

echo 2. 不要なフォルダを削除...
if exist node_modules rmdir /S /Q node_modules
if exist dist rmdir /S /Q dist

echo 3. プロジェクトを再初期化...
call npm init -y

echo 4. 正確な依存関係をインストール...
call npm install discord.js@14.14.1 dotenv@16.4.5 @types/node typescript ts-node pm2

echo 5. TSConfig を最適化...
echo {^
  "compilerOptions": {^
    "target": "ES2020",^
    "module": "commonjs",^
    "outDir": "./dist",^
    "rootDir": "./",^
    "strict": false,^
    "esModuleInterop": true,^
    "skipLibCheck": true,^
    "forceConsistentCasingInFileNames": true,^
    "resolveJsonModule": true,^
    "noImplicitAny": false,^
    "strictNullChecks": false^
  },^
  "include": ["./**/*.ts"],^
  "exclude": ["node_modules", "dist", "backup"]^
} > tsconfig.json

echo 6. 基本フォルダ構造を再作成...
if not exist dist mkdir dist
if not exist dist\commands mkdir dist\commands
if not exist dist\commands\voice mkdir dist\commands\voice
if not exist dist\utils mkdir dist\utils
if not exist dist\config mkdir dist\config
if not exist logs mkdir logs
if not exist data mkdir data
if not exist data\patterns mkdir data\patterns
if not exist events mkdir events

echo クリーンアップが完了しました。
echo 次のステップは:
echo 1. "npm run build" でビルドを試行
echo 2. 必要に応じてファイルを修正
echo 3. "npm start" でボットを起動
pause
