@echo off
cd %~dp0
echo package.jsonを最適化しています...

echo {^
  "name": "discord-voice-mover-bot",^
  "version": "1.0.0",^
  "description": "Discord bot for moving voice channel members",^
  "main": "dist/index.js",^
  "scripts": {^
    "build": "tsc --skipLibCheck",^
    "start": "node dist/index.js",^
    "dev": "ts-node index.ts",^
    "watch": "tsc -w",^
    "deploy": "ts-node deploy-commands.ts",^
    "pm2:start": "pm2 start dist/index.js --name discord-voice-mover-bot",^
    "pm2:stop": "pm2 stop discord-voice-mover-bot",^
    "pm2:restart": "pm2 restart discord-voice-mover-bot",^
    "pm2:logs": "pm2 logs discord-voice-mover-bot",^
    "pm2:status": "pm2 status"^
  },^
  "keywords": ["discord", "bot", "voice", "channel", "mover"],^
  "author": "",^
  "license": "ISC",^
  "dependencies": {^
    "@types/node": "^16.18.59",^
    "discord.js": "^14.14.1",^
    "dotenv": "^16.3.1",^
    "pm2": "^5.3.0",^
    "ts-node": "^10.9.1",^
    "typescript": "^5.2.2"^
  }^
} > package.json

echo package.jsonの設定が完了しました。
echo 次のステップ:
echo 1. npm installを実行して依存関係をインストール
echo 2. npm run buildでビルド
pause
