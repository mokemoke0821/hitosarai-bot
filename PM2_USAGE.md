# PM2を使ったDiscord Voice Mover Botのバックグラウンド実行ガイド

このガイドでは、PM2を使用してDiscord Voice Mover Botをバックグラウンドで実行し、Windowsの起動時に自動的に起動させる方法を説明します。

## 前提条件

- Node.jsがインストールされていること
- npmがインストールされていること
- Botのコードがコンパイルされていること（`npm run build`を実行済み）

## セットアップ方法

1. **必要なパッケージのインストール**
   ```bash
   npm install
   ```

2. **PM2のグローバルインストール**
   ```bash
   npm install -g pm2
   ```

3. **Botのコンパイル**
   ```bash
   npm run build
   ```

4. **Botの起動（手動）**
   - `start-bot.bat`をダブルクリックするか、以下のコマンドを実行します：
   ```bash
   npm run pm2:start
   ```

5. **Windows起動時の自動起動設定**
   - `setup-autostart.bat`をダブルクリックして実行します。これにより、Windowsのスタートアップフォルダにショートカットが作成されます。

## 使用方法

### Botのステータス確認
```bash
npm run pm2:status
```
または
```bash
pm2 status
```

### ログの確認
```bash
npm run pm2:logs
```
または
```bash
pm2 logs discord-voice-mover-bot
```

### Botの再起動
```bash
npm run pm2:restart
```
または
```bash
pm2 restart discord-voice-mover-bot
```

### Botの停止
```bash
npm run pm2:stop
```
または
```bash
pm2 stop discord-voice-mover-bot
```

## 自動起動設定の解除

Windows起動時の自動起動を解除するには：
1. `Win + R`キーを押してファイル名を指定して実行を開く
2. `shell:startup`と入力してEnterキーを押す
3. スタートアップフォルダが開くので、`DiscordVoiceMoverBot.lnk`ショートカットを削除

## PM2の詳細な使い方

PM2の詳細な使い方については、[PM2の公式ドキュメント](https://pm2.keymetrics.io/docs/usage/quick-start/)を参照してください。
